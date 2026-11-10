"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ExternalLink, Home, Play, Star, X } from "lucide-react";
import MoonWorld from "./moon-world";
import { Inspector } from "./moon-panels";
import { NearMark } from "./near-economy";
import {
  publicPark,
  credentialsFor,
  parkAction,
  type Park,
} from "@/lib/moon/parks";
import { type Config } from "@/lib/moon/near";
import {
  entrance,
  walkingRoute,
  isRide,
  type Detail,
  type Run,
  type RecordState,
} from "@/lib/moon/model";
import type { MoonWorld as World } from "@/lib/moon/world";
import archivedV4 from "@/public/moon-v4-config.json";
import "../moonpark.css";
function visitorPreview(source: Run) {
  const run = structuredClone(source);
  run.tick = 40;
  for (const b of run.buildings) b.ready_at = 0;
  const rides = run.buildings.filter(
    (b) => !b.sold && b.connected && isRide(b.kind),
  );
  for (const b of rides) {
    b.powered = true;
    b.ready_at = 0;
    b.condition = 100;
    b.riders = [0, 1, 2, 3];
    b.cycle_left = 0;
    b.queue = [];
  }
  for (const g of run.guests) {
    if (g.id >= 24 || !rides.length) {
      g.status = "gone";
      continue;
    }
    const b = rides[g.id % rides.length],
      e = entrance(b);
    g.status = "walking";
    g.cell = 23 * 32 + 15;
    g.target = b.id;
    g.route = walkingRoute(run, g.cell, e.z * 32 + e.x);
    g.thought = "I came to see this park's signature rides.";
  }
  return run;
}
export default function PublicPark({ accountId }: { accountId: string }) {
  const [data, setData] = useState<{
      cfg: Config;
      park: Park;
      record: RecordState | null;
    } | null>(null),
    [error, setError] = useState("");
  const [selection, setSelection] = useState<Detail | null>(null),
    [ride, setRide] = useState<number | null>(null),
    [rating, setRating] = useState(0),
    [busy, setBusy] = useState(false),
    [receipt, setReceipt] = useState("");
  const world = useRef<World | null>(null);
  useEffect(() => {
    let active = true;
    const archived =
      new URLSearchParams(location.search).get("version") === "v4" ||
      accountId.endsWith(".moonpark-mw65jiya.testnet");
    void publicPark(accountId, archived ? (archivedV4 as Config) : undefined)
      .then((v) => {
        if (active) setData(v);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [accountId]);
  const record = data?.record;
  const run = useMemo(
    () => (record ? visitorPreview(record.run) : null),
    [record],
  );
  const selected =
    selection?.kind === "building"
      ? run?.buildings.find((b) => b.id === selection.id)
      : undefined;
  return (
    <main className="moonpark mp-public-park">
      <MoonWorld
        run={run}
        identity={data?.park}
        speed={0.5}
        placement={null}
        selected={selected?.id ?? null}
        cinematic={null}
        attractMode
        rideId={ride}
        onPick={setSelection}
        onHover={() => {}}
        onPlace={() => {}}
        worldRef={world}
      />
      <header className="mp-visit-header">
        <Link href="/" className="mp-secondary">
          <ArrowLeft size={16} /> Moonpark
        </Link>
        <div>
          <span className="mp-eyebrow">PLAYER-OWNED LUNAR PARK</span>
          <h1>
            {data
              ? `${["☾", "✦", "◎"][data.park.emblem]} ${data.park.name}`
              : "Arriving at the Moon…"}
          </h1>
          {data && <p>Owned by {data.park.owner}</p>}
        </div>
        <NearMark />
      </header>
      {error && !data && (
        <div className="mp-visit-message" role="alert">
          <h2>Park unavailable</h2>
          <p>{error}</p>
          <Link href="/" className="mp-primary">
            Build your own park
          </Link>
        </div>
      )}
      {data && !data.record && (
        <div className="mp-visit-message">
          <h2>The gates are opening soon.</h2>
          <p>
            This park has a NEAR owner. Its first opening day is waiting to be
            published.
          </p>
          <Link href="/" className="mp-primary">
            Open your park
          </Link>
        </div>
      )}
      {data?.record && (
        <>
          <aside className="mp-visit-card">
            <span className="mp-eyebrow">VERIFIED OPENING DAY</span>
            <strong>
              {data.record.run.score.total.toLocaleString()} points
            </strong>
            <p>
              {data.record.run.score.happy} happy guests ·{" "}
              {data.park.blueprint_ids.length} signature design
              {data.park.blueprint_ids.length === 1 ? "" : "s"}
            </p>
            <p>
              {data.park.rating_count
                ? `${(data.park.rating_sum / data.park.rating_count).toFixed(1)} ★ from ${data.park.rating_count} player review${data.park.rating_count === 1 ? "" : "s"}`
                : "Be the first to leave a review."}
            </p>
            <div className="mp-rating" aria-label="Rate this park">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  aria-label={`${n} stars`}
                  aria-pressed={rating === n}
                  disabled={busy}
                  onClick={() => {
                    setRating(n);
                    setError("");
                  }}
                >
                  <Star
                    fill={n <= rating ? "currentColor" : "none"}
                    size={22}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <button
                className="mp-secondary full"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    const c = credentialsFor(data.cfg);
                    if (!c) {
                      setError(
                        "Open a sponsored NEAR park before leaving a review.",
                      );
                      return;
                    }
                    setBusy(true);
                    setError("");
                    try {
                      const r = await parkAction(data.cfg, c, "rate_park", {
                        park_id: data.park.id,
                        stars: rating,
                      });
                      setReceipt(r.tx);
                      setData({ ...data, park: r.value });
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "Review failed.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
              >
                {busy ? "Saving review…" : "Save review on NEAR"}
              </button>
            )}
            {error && (
              <p role="alert" className="mp-inline-error">
                {error}
              </p>
            )}
            {receipt && (
              <a
                href={`https://testnet.nearblocks.io/txns/${receipt}`}
                target="_blank"
                rel="noreferrer"
              >
                Review confirmed <ExternalLink size={12} />
              </a>
            )}
            <a
              href={`https://testnet.nearblocks.io/address/${data.cfg.contractId}`}
              target="_blank"
              rel="noreferrer"
            >
              Park ownership & day #{data.record.run_id}{" "}
              <ExternalLink size={12} />
            </a>
            <p className="mp-fine">
              Explore the published layout with ambient visitors. Scores and
              finances come from its verified closing record.
            </p>
          </aside>
          {!selection && !ride && (
            <div className="mp-visit-tip">
              Drag to explore · Select any attraction
              {run?.buildings.some((b) => b.kind === "coaster" && !b.sold) && (
                <button
                  className="mp-primary"
                  onClick={() =>
                    setRide(
                      run!.buildings.find(
                        (b) => b.kind === "coaster" && !b.sold,
                      )!.id,
                    )
                  }
                >
                  <Play size={15} /> Ride the mass driver
                </button>
              )}
            </div>
          )}
          {selection && !ride && (
            <Inspector
              key={`${selection.kind}:${selection.id}`}
              run={run!}
              building={selected}
              guest={
                selection.kind === "guest"
                  ? run?.guests.find((g) => g.id === selection.id)
                  : undefined
              }
              action={() => {}}
              onClose={() => setSelection(null)}
              onRide={(id) => {
                setRide(id);
                setSelection(null);
              }}
              readOnly
            />
          )}
          {ride && (
            <button
              className="mp-ride-return mp-primary"
              onClick={() => setRide(null)}
            >
              <X size={16} /> Back to the park
            </button>
          )}
          <button
            className="mp-visit-home mp-secondary"
            aria-label="Reset camera"
            onClick={() => world.current?.home()}
          >
            <Home size={20} />
          </button>
        </>
      )}
    </main>
  );
}
