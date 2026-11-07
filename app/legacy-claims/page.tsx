"use client";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { NearEconomy } from "../components/near-economy";
import {
  view,
  ownershipAction,
  type Config,
  type Credentials,
} from "@/lib/moon/near";
import type { Concession, RecordState } from "@/lib/moon/model";
import "../moonpark.css";
const cfg: Config = {
  contractId: "economy.moonpark-mw5uef63.testnet",
  rpcUrl: "https://test.rpc.fastnear.com",
  fallbackRpcUrl: "https://rpc.testnet.near.org",
  network: "testnet",
  codeHash: "2aWWsedhvw8pCVUFuTf4yCN4YfTc2CBZfrU7oFXthpy5",
};
function subscribeToStorage(listener: () => void) {
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}
function storageSnapshot() {
  const accounts = new Map<string, Credentials>();
  const runs = new Map<string, { runId: string; owner: string }>();
  for (let i = 0; i < localStorage.length; i++) {
    const name = localStorage.key(i)!;
    if (
      !name.startsWith("moonpark-keys:") &&
      !name.startsWith("moonpark-retired-keys:")
    )
      continue;
    try {
      const c = JSON.parse(localStorage.getItem(name)!) as Credentials;
      if (c.contractId === cfg.contractId && c.recoveryKey)
        accounts.set(c.accountId, c);
    } catch {
      /* Ignore an incomplete browser save. */
    }
  }
  for (let i = 0; i < localStorage.length; i++) {
    const name = localStorage.key(i)!;
    if (
      name !== "moonpark-current" &&
      !name.startsWith(`moonpark-history:${cfg.contractId}:`)
    )
      continue;
    try {
      const saved = JSON.parse(localStorage.getItem(name)!);
      const record = saved.state?.record;
      if (
        saved.config?.contractId === cfg.contractId &&
        record &&
        !record.run.finished &&
        accounts.has(record.owner)
      )
        runs.set(record.run_id, { runId: record.run_id, owner: record.owner });
    } catch {
      /* A damaged history entry cannot authorize a chain operation. */
    }
  }
  return JSON.stringify({
    keys: [...accounts.values()],
    unfinished: [...runs.values()],
  });
}
const serverSnapshot = () => '{"keys":[],"unfinished":[]}';
export default function LegacyClaims() {
  const stored = useSyncExternalStore(
    subscribeToStorage,
    storageSnapshot,
    serverSnapshot,
  );
  const { keys, unfinished } = useMemo(
    () =>
      JSON.parse(stored) as {
        keys: Credentials[];
        unfinished: { runId: string; owner: string }[];
      },
    [stored],
  );
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [refresh, setRefresh] = useState(0);
  async function finish(run: { runId: string; owner: string }) {
    setBusy(true);
    setMessage("");
    try {
      const credentials = keys.find((c) => c.accountId === run.owner)!;
      const m = await import("near-api-js");
      const account = new m.Account(
        credentials.accountId,
        new m.JsonRpcProvider({ url: cfg.rpcUrl }),
        m.KeyPairSigner.fromSecretKey(
          credentials.recoveryKey as `ed25519:${string}`,
        ),
      );
      let record = await view<RecordState>(cfg, "get_run", {
        run_id: run.runId,
      });
      while (!record.run.finished) {
        record = (await account.callFunction({
          contractId: cfg.contractId,
          methodName: "apply_actions",
          args: {
            run_id: run.runId,
            expected_revision: record.run.revision,
            request_id: crypto.randomUUID(),
            commands: [],
            ticks: Math.min(20, 550 - record.run.tick),
          },
          gas: 250000000000000n,
          waitUntil: "FINAL",
        })) as RecordState;
      }
      for (let i = 0; i < localStorage.length; i++) {
        const name = localStorage.key(i)!;
        if (
          name !== "moonpark-current" &&
          !name.startsWith(`moonpark-history:${cfg.contractId}:`)
        )
          continue;
        const saved = JSON.parse(localStorage.getItem(name)!);
        if (
          saved.config?.contractId === cfg.contractId &&
          saved.state?.record?.run_id === run.runId
        ) {
          saved.state.record = record;
          saved.state.run = record.run;
          saved.ops = [];
          localStorage.setItem(name, JSON.stringify(saved));
        }
      }
      window.dispatchEvent(new Event("storage"));
      setRefresh((n) => n + 1);
      setMessage(
        "The earlier day is settled. Its funded claims can now be collected.",
      );
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Retry to continue from the earlier day’s confirmed state.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mp-legacy-claims">
      <Link href="/">← Return to Moonpark</Link>
      <h1>Earlier concession claims</h1>
      <p>
        The previous immutable contract holds its ownership records and funded
        claims. This panel uses the earlier account keys saved in this browser.
      </p>
      {unfinished.map((run) => (
        <button
          key={run.runId}
          disabled={busy}
          onClick={() => void finish(run)}
        >
          {busy
            ? "Settling earlier opening day…"
            : `Finish confirmed earlier day #${run.runId}`}
        </button>
      ))}
      {message && <p role="status">{message}</p>}
      <NearEconomy
        key={refresh}
        cfg={cfg}
        state={null}
        owner={keys[0]?.accountId ?? null}
        owners={keys.map((c) => c.accountId)}
        onPlay={() => {
          location.href = "/";
        }}
        onAction={async (method, args) => {
          const owner =
            method === "claim_prize"
              ? String(args.account_id ?? keys[0]?.accountId)
              : (
                  await view<Concession>(cfg, "get_business_share", {
                    token_id: args.token_id,
                  })
                ).owner_id;
          const credentials = keys.find((c) => c.accountId === owner);
          if (!credentials)
            throw Error(
              "This browser does not hold the current owner’s earlier account key.",
            );
          return ownershipAction(
            { ...credentials, secretKey: credentials.recoveryKey },
            cfg,
            method,
            method === "claim_prize" ? {} : args,
          );
        }}
      />
    </main>
  );
}
