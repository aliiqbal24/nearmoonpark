"use client";
import { useCallback, useEffect, useState } from "react";
import {
  ExternalLink,
  Globe,
  Palette,
  Rocket,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { blueprint, isRide, type Command } from "@/lib/moon/model";
import { type Config, view } from "@/lib/moon/near";
import {
  type Park,
  type RideBlueprint,
  credentialsFor,
  storedCredentials,
  importParkBackup,
  parkAction,
  connectedWallet,
  readConnectedWallet,
  walletAction,
  LICENSE_FEE,
} from "@/lib/moon/parks";
import type { Snapshot } from "@/lib/moon/session";
import { NearMark, testNear } from "./near-economy";
import { PalettePicker } from "./attraction-design";
export type ParkIdentity = { name: string; emblem: number };
export function ParkHub({
  cfg,
  state,
  identity,
  onIdentity,
  action,
  onUse,
  onPlay,
}: {
  cfg: Config | null;
  state: Snapshot | null;
  identity: ParkIdentity;
  onIdentity: (p: ParkIdentity) => void;
  action: (c: Command) => void;
  onUse: (b: RideBlueprint, receipt?: string) => void;
  onPlay: () => void;
}) {
  const [parkPage, setParkPage] = useState(0),
    [designPage, setDesignPage] = useState(0);
  const [tab, setTab] = useState<"park" | "designs" | "visit">("park");
  const [park, setPark] = useState<Park | null>(null),
    [parks, setParks] = useState<Park[]>([]),
    [designs, setDesigns] = useState<RideBlueprint[]>([]);
  const [walletId, setWalletId] = useState(""),
    [walletPark, setWalletPark] = useState<Park | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [tx, setTx] = useState("");
  const [name, setName] = useState(identity.name),
    [emblem, setEmblem] = useState(identity.emblem);
  const [prizeClaim, setPrizeClaim] = useState<{
    account_id: string;
    claimable_yocto: string;
  } | null>(null);
  const [earningsOwner, setEarningsOwner] = useState("");
  const [earnings, setEarnings] = useState({
    available: "0",
    pending: "0",
    paid: "0",
  });
  const credentials = cfg ? credentialsFor(cfg, state?.record?.owner) : null;
  const accountId = credentials?.accountId;
  const credentialIdentity = credentials?.identity;
  const ownerCredentials = cfg && park ? credentialsFor(cfg, park.owner) : null;
  const versionQuery =
    cfg?.archivedVersion === "v4" ? "?version=v4" : "?version=v5";
  const loadKey = `${cfg?.contractId ?? "local"}:${accountId ?? "guest"}`;
  const loading = loadedFor !== loadKey;
  const refresh = useCallback(async () => {
    if (!cfg) return;
    const [mine, all, blueprints] = await Promise.all([
      accountId
        ? view<Park | null>(cfg, "get_park_by_operator", {
            account_id: accountId,
          })
        : Promise.resolve(null),
      view<Park[]>(cfg, "list_parks", { from_index: parkPage * 24, limit: 24 }),
      view<RideBlueprint[]>(cfg, "list_blueprints", {
        from_index: designPage * 24,
        limit: 24,
      }),
    ]);
    setPark(mine);
    setParks(all);
    setDesigns(blueprints);
    if (mine) {
      setName(mine.name);
      setEmblem(mine.emblem);
      onIdentity({ name: mine.name, emblem: mine.emblem });
      const ownedAccounts = storedCredentials(cfg)
        .filter((c) => c.identity === credentialIdentity)
        .map((c) => c.accountId);
      const accounts = [
        ...new Set([mine.owner, mine.operator, ...ownedAccounts]),
      ];
      const [income, claims] = await Promise.all([
        Promise.all(
          accounts.map(async (account_id) => ({
            account_id,
            ...(await view<{
              available: string;
              pending: string;
              paid: string;
            }>(cfg, "get_creator_earnings", { account_id })),
          })),
        ),
        Promise.all(
          accounts.map((account_id) =>
            view<{ account_id: string; claimable_yocto: string }>(
              cfg,
              "get_prize_claim",
              { account_id },
            ),
          ),
        ),
      ]);
      const earning =
        income.find((e) => BigInt(e.available) > 0n) ??
        income.find((e) => BigInt(e.pending) > 0n) ??
        income[0];
      setEarnings(earning);
      setEarningsOwner(earning.account_id);
      setPrizeClaim(claims.find((c) => BigInt(c.claimable_yocto) > 0n) ?? null);
    }
    const connection = await readConnectedWallet(cfg);
    setWalletId(connection?.accountId ?? "");
    if (connection)
      setWalletPark(
        await view<Park | null>(cfg, "get_park_by_owner", {
          account_id: connection.accountId,
        }),
      );
  }, [cfg, accountId, credentialIdentity, onIdentity, parkPage, designPage]);
  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Updates follow awaited registry RPC responses.
    void refresh()
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : "Could not load the NEAR registry.",
          );
      })
      .finally(() => {
        if (active) setLoadedFor(loadKey);
      });
    return () => {
      active = false;
    };
  }, [refresh, loadKey]);

  const perform = async (key: string, work: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    setError("");
    setMessage("");
    setTx("");
    try {
      await work();
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "This change could not be confirmed.",
      );
    } finally {
      setBusy("");
    }
  };
  const save = () =>
    void perform("save", async () => {
      if (!cfg || !credentials || !park) {
        if (state?.mode === "near")
          throw Error(
            "Wait for your NEAR ownership record to load before publishing.",
          );
        localStorage.setItem(
          "moonpark-identity",
          JSON.stringify({ name: name.trim() || "My Moonpark", emblem }),
        );
        onIdentity({ name: name.trim() || "My Moonpark", emblem });
        setMessage(
          "Park identity saved in this browser. Open a NEAR park to publish it.",
        );
        return;
      }
      const runId =
        state?.record?.park_id === park.id &&
        state.record.run.finished &&
        !state.pending
          ? state.record.run_id
          : null;
      const r = await parkAction(cfg, credentials, "save_park", {
        park_id: park.id,
        expected_revision: park.revision,
        name,
        emblem,
        run_id: runId,
      });
      setTx(r.tx);
      setMessage(
        runId
          ? "Your park is published. Share its link and invite someone aboard."
          : "Your park identity is saved on NEAR. Publish your layout after closing day.",
      );
    });
  const claim = () =>
    void perform("claim", async () => {
      if (!cfg || !credentials || !park)
        throw Error("Open a sponsored NEAR park first.");
      const w = await connectedWallet(cfg);
      if (!w) return;
      setWalletId(w.accountId);
      if (park.owner === w.accountId) {
        setMessage("This NEAR account already owns your park.");
        return;
      }
      if (park.pending_owner !== w.accountId) {
        const r = await parkAction(
          cfg,
          ownerCredentials ?? credentials,
          "nominate_park_owner",
          { park_id: park.id, receiver_id: w.accountId },
        );
        setTx(r.tx);
      }
      await walletAction(cfg, "accept_park", { park_id: park.id });
      setMessage(
        "Confirm the ownership transaction in your wallet. The registry updates after NEAR confirms it.",
      );
    });
  const ready = !!state?.record?.run.finished && !state.pending;
  return (
    <div className="mp-park-hub">
      <div className="mp-near-intro">
        <NearMark word />
        <span>YOUR PARK · YOUR DESIGNS · ON NEAR TESTNET</span>
      </div>
      <div className="mp-hub-tabs" role="tablist" aria-label="Park desk">
        {(
          [
            ["park", "My park", Wallet],
            ["designs", "Ride exchange", Sparkles],
            ["visit", "Visit parks", Globe],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
      {tab === "park" && (
        <>
          <p className="mp-subtle">
            Build a park with a name of its own. Publish your opening day,
            invite visitors and earn from your signature rides.
          </p>
          <div className="mp-park-identity">
            <label>
              Park name
              <input
                aria-label="Park name"
                value={name}
                maxLength={28}
                disabled={loading && !!accountId}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>Park emblem</label>
            <div className="mp-segments">
              {["☾ Crescent", "✦ Star", "◎ Orbit"].map((label, i) => (
                <button
                  key={label}
                  aria-pressed={emblem === i}
                  onClick={() => setEmblem(i)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label>
              Park colors <small>Attractions can override these</small>
            </label>
            <PalettePicker
              value={state?.run.palette ?? 0}
              disabled={!state}
              onChange={(value) => action({ kind: "theme", value })}
            />
            <button
              className="mp-primary full"
              disabled={
                !!busy ||
                !name.trim() ||
                (state?.mode === "near" && (loading || !park))
              }
              onClick={save}
            >
              <Palette size={16} />
              {busy === "save"
                ? "Saving on NEAR…"
                : ready
                  ? "Publish this opening day"
                  : "Save park identity"}
            </button>
          </div>
          {park ? (
            <div className="mp-ownership-card">
              <ShieldCheck size={23} />
              <div>
                <strong>
                  {ownerCredentials
                    ? "Your sponsored NEAR park"
                    : "Claimed park ownership"}
                </strong>
                <code>{park.owner}</code>
                <small>
                  Park #{park.id} · Authorized game account {park.operator}
                </small>
              </div>
              <a
                className="mp-secondary full"
                href={`/park/${park.owner}${versionQuery}`}
                target="_blank"
                rel="noreferrer"
              >
                <Globe size={16} /> Your public park <ExternalLink size={14} />
              </a>
              {ownerCredentials ? (
                <button
                  className="mp-primary full"
                  disabled={!!busy}
                  onClick={claim}
                >
                  <Wallet size={16} />
                  {park.pending_owner
                    ? "Finish claiming your park"
                    : "Claim with my NEAR wallet"}
                </button>
              ) : (
                <p className="mp-fine">
                  Your wallet owns the park. This browser’s game account can
                  update its layout and publish designs. The owner can replace
                  that operator.
                </p>
              )}
              <p className="mp-fine">
                Wallet claiming uses a signed testnet transaction. Keep your
                generated account keys by exporting your park backup before
                clearing browser storage.
              </p>
              <button
                className="mp-secondary full"
                onClick={() => {
                  const content = JSON.stringify(
                    {
                      format: "moonpark-account-backup-v1",
                      config: cfg,
                      credentials,
                      ownerCredentials,
                      accounts: cfg
                        ? storedCredentials(cfg).filter(
                            (c) =>
                              c.identity === credentialIdentity ||
                              c.accountId === park.owner,
                          )
                        : [],
                      park,
                    },
                    null,
                    2,
                  );
                  const url = URL.createObjectURL(
                    new Blob([content], { type: "application/json" }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `moonpark-${park.id}-private-backup.json`;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                Export private park backup
              </button>
            </div>
          ) : loading && accountId ? (
            <p className="mp-fine" role="status">
              Loading your NEAR park ownership…
            </p>
          ) : (
            <div className="mp-callout">
              <Rocket size={24} />
              <div>
                <strong>Your first NEAR account is included.</strong>
                <p>
                  Open your park to register its ownership and save verified
                  opening days.
                </p>
                <button className="mp-primary" onClick={onPlay}>
                  Open a NEAR park
                </button>
              </div>
            </div>
          )}
          <details className="mp-near-explainer">
            <summary>Use an existing park on this browser</summary>
            <p className="mp-fine">
              Connect the wallet that owns your park, then authorize this
              browser’s sponsored game account. A private backup can also
              restore a generated account.
            </p>
            <button
              className="mp-secondary full"
              disabled={!!busy || !cfg}
              onClick={() =>
                void perform("connect", async () => {
                  if (cfg) await connectedWallet(cfg);
                })
              }
            >
              Connect NEAR wallet
            </button>
            {walletId && <p className="mp-fine">Connected {walletId}</p>}
            {walletPark && accountId && walletPark.operator !== accountId && (
              <button
                className="mp-primary full"
                disabled={!!busy}
                onClick={() =>
                  void perform("restore", async () => {
                    await walletAction(
                      cfg!,
                      "set_park_operator",
                      { park_id: walletPark.id, operator: accountId },
                      walletPark.owner,
                    );
                  })
                }
              >
                Use {walletPark.name} on this browser
              </button>
            )}
            <label className="mp-backup-import">
              Import private park backup
              <input
                type="file"
                accept="application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file || !cfg) return;
                  void perform("import", async () => {
                    if (file.size > 20000)
                      throw Error("This is not a Moonpark account backup.");
                    await importParkBackup(cfg, JSON.parse(await file.text()));
                    setMessage(
                      "Account restored. Close and reopen the park desk.",
                    );
                  });
                }}
              />
            </label>
          </details>
          <div className="mp-creator-balance">
            <strong>Creator earnings</strong>
            <span>
              {testNear(earnings.available)} tNEAR available ·{" "}
              {testNear(earnings.paid)} collected
              {park && earningsOwner !== park.owner && (
                <small> · Earlier owner account {earningsOwner}</small>
              )}
            </span>
            <button
              className="mp-secondary"
              disabled={!!busy || BigInt(earnings.available) === 0n}
              onClick={() =>
                void perform("collect", async () => {
                  if (!cfg || !park) return;
                  const signer = credentialsFor(cfg, earningsOwner);
                  if (signer) {
                    const r = await parkAction(
                      cfg,
                      signer,
                      "claim_creator_earnings",
                      {},
                    );
                    setTx(r.tx);
                  } else
                    await walletAction(
                      cfg,
                      "claim_creator_earnings",
                      {},
                      earningsOwner,
                    );
                  setMessage("Creator payment submitted to NEAR.");
                })
              }
            >
              Collect earnings
            </button>
          </div>
          {prizeClaim && (
            <div className="mp-creator-balance">
              <strong>Competition prize</strong>
              <span>
                {testNear(prizeClaim.claimable_yocto)} tNEAR available
              </span>
              <button
                className="mp-primary"
                disabled={!!busy}
                onClick={() =>
                  void perform("prize", async () => {
                    if (!cfg) return;
                    const signer = credentialsFor(cfg, prizeClaim.account_id);
                    if (signer) {
                      const r = await parkAction(
                        cfg,
                        signer,
                        "claim_prize",
                        {},
                      );
                      setTx(r.tx);
                    } else
                      await walletAction(
                        cfg,
                        "claim_prize",
                        {},
                        prizeClaim.account_id,
                      );
                    setMessage("Competition prize submitted for collection.");
                  })
                }
              >
                Collect prize
              </button>
            </div>
          )}
          <p className="mp-fine">
            A license costs 0.005 testnet NEAR from the buyer’s sponsored
            account. The contract credits 90% to the creator park’s current
            owner and keeps 10% toward storage. Testnet tokens have no cash
            value.
          </p>
        </>
      )}
      {tab === "designs" && (
        <>
          <p className="mp-subtle">
            Give your best ride a life beyond your park. A licensed design
            brings its creator’s colors, style, layout and launch settings with
            it.
          </p>
          {ready && park && (
            <section>
              <h3>Publish a signature ride</h3>
              <div className="mp-exchange-grid">
                {state.run.buildings
                  .filter(
                    (b) =>
                      isRide(b.kind) &&
                      !b.sold &&
                      b.served > 0 &&
                      !b.blueprint_id,
                  )
                  .map((b) => (
                    <article key={b.id}>
                      <img
                        src={`/art/${b.kind}-s${b.design?.style ?? 0}-v2.webp`}
                        alt=""
                      />
                      <strong>
                        {b.design?.name || blueprint(b.kind).name}
                      </strong>
                      <span>
                        {b.served} guests ·{" "}
                        {b.kind === "coaster"
                          ? ["Gentle", "Standard", "Extreme"][b.launch - 1]
                          : "Guest-tested"}
                      </span>
                      <button
                        className="mp-secondary"
                        disabled={
                          !!busy ||
                          park.blueprint_ids.includes(
                            `${state.record!.run_id}:${b.id}`,
                          )
                        }
                        onClick={() =>
                          void perform(`publish-${b.id}`, async () => {
                            const r = await parkAction(
                              cfg!,
                              credentials!,
                              "publish_blueprint",
                              {
                                park_id: park.id,
                                run_id: state.record!.run_id,
                                building_id: b.id,
                                name: b.design?.name || blueprint(b.kind).name,
                              },
                            );
                            setTx(r.tx);
                            setMessage(
                              "Your signature ride is on the exchange. Every license credits its creator on NEAR.",
                            );
                          })
                        }
                      >
                        {park.blueprint_ids.includes(
                          `${state.record!.run_id}:${b.id}`,
                        )
                          ? "Published"
                          : "Publish design"}
                      </button>
                    </article>
                  ))}
              </div>
            </section>
          )}
          {!ready && (
            <p className="mp-fine">
              Finish a NEAR opening day to publish your guest-tested rides. You
              can use another creator’s design during your next day.
            </p>
          )}
          <h3>Community ride exchange</h3>
          {designs.length ? (
            <div className="mp-exchange-grid">
              {designs.map((b) => (
                <article key={b.id}>
                  <img
                    src={`/art/${b.kind}-s${b.design?.style ?? 0}-v2.webp`}
                    alt=""
                  />
                  <strong>{b.name}</strong>
                  <a
                    href={`/park/p-${b.park_id}${versionQuery}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    By {b.creator}
                  </a>
                  <span>
                    {b.licenses} licenses · {blueprint(b.kind).name}
                  </span>
                  <button
                    className="mp-primary"
                    disabled={!!busy || !!state?.run.finished || !state}
                    onClick={() =>
                      void perform(`use-${b.id}`, async () => {
                        let receipt: string | undefined;
                        if (state?.mode === "near") {
                          if (!park || !credentials || !cfg)
                            throw Error("Open your NEAR park first.");
                          const owned =
                            b.park_id === park.id ||
                            (await view<boolean>(cfg, "has_license", {
                              park_id: park.id,
                              blueprint_id: b.id,
                            }));
                          if (!owned) {
                            const r = await parkAction(
                              cfg,
                              credentials,
                              "license_blueprint",
                              { park_id: park.id, blueprint_id: b.id },
                              LICENSE_FEE,
                            );
                            setTx(r.tx);
                            receipt = r.tx;
                          }
                        }
                        onUse(b, receipt);
                      })
                    }
                  >
                    {state?.mode === "near"
                      ? b.park_id === park?.id
                        ? "Build my design"
                        : "License & build · 0.005 tNEAR"
                      : "Try design offline"}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="mp-empty">
              <Sparkles size={30} />
              <h3>The first signature ride could be yours.</h3>
              <p>
                Customize a ride, give guests a great day and publish after
                closing.
              </p>
            </div>
          )}
          <RegistryPages
            page={designPage}
            count={designs.length}
            onPage={setDesignPage}
            label="Ride exchange pages"
          />
          <p className="mp-fine">
            Construction still uses the regular park-credit budget. A license is
            permanent for your park and is charged once. Published designs keep
            their original attribution.
          </p>
        </>
      )}
      {tab === "visit" && (
        <>
          <p className="mp-subtle">
            Drop into a real player’s opening day. Explore their layout, meet
            their guests and take the front seat.
          </p>
          <div className="mp-exchange-grid">
            {parks.map((p) => (
              <article key={p.id}>
                <span className="mp-park-emblem">
                  {["☾", "✦", "◎"][p.emblem]}
                </span>
                <strong>{p.name}</strong>
                <span>
                  {p.rating_count
                    ? `${(p.rating_sum / p.rating_count).toFixed(1)} ★ · ${p.rating_count} reviews`
                    : "Newly opened"}
                </span>
                <a
                  className="mp-primary"
                  href={`/park/${p.owner}${versionQuery}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Visit park <ExternalLink size={14} />
                </a>
              </article>
            ))}
          </div>
          <RegistryPages
            page={parkPage}
            count={parks.length}
            onPage={setParkPage}
            label="Public park pages"
          />
          {!parks.length && parkPage === 0 && (
            <p>Publish an opening day to put the first park on the map.</p>
          )}
        </>
      )}
      {busy && (
        <p className="mp-fine" role="status">
          Waiting for NEAR confirmation…
        </p>
      )}
      {error && (
        <p className="mp-inline-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="mp-inline-success" role="status">
          {message}
        </p>
      )}
      {tx && (
        <a
          className="mp-receipt"
          href={`https://testnet.nearblocks.io/txns/${tx}`}
          target="_blank"
          rel="noreferrer"
        >
          View NEAR receipt <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}

function RegistryPages({
  page,
  count,
  onPage,
  label,
}: {
  page: number;
  count: number;
  onPage: (page: number) => void;
  label: string;
}) {
  if (page === 0 && count < 24) return null;
  return (
    <nav className="mp-hub-pages" aria-label={label}>
      <button disabled={page === 0} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <span>Page {page + 1}</span>
      <button disabled={count < 24} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </nav>
  );
}
