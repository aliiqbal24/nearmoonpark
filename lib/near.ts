import type { RecordState, Command } from "./model";
import { VERSION } from "./model";
export type Credentials = {
  accountId: string;
  secretKey: string;
  recoveryKey: string;
  contractId: string;
};
export type Config = {
  contractId: string;
  rpcUrl: string;
  fallbackRpcUrl: string;
  codeHash: string;
  network: string;
};
let modulePromise: Promise<typeof import("near-api-js")>;
const api = () => (modulePromise ??= import("near-api-js"));
export async function nearConfig(): Promise<Config | null> {
  const r = await fetch("/near-config.json");
  return r.ok ? r.json() : null;
}
export async function provision(config: Config): Promise<Credentials> {
  const m = await api();
  let pending = localStorage.getItem("last-signal-provision");
  if (!pending) {
    pending = JSON.stringify({
      recovery: m.KeyPair.fromRandom("ed25519").toString(),
      session: m.KeyPair.fromRandom("ed25519").toString(),
    });
    localStorage.setItem("last-signal-provision", pending);
  }
  const keys = JSON.parse(pending);
  const r = await fetch("/api/provision", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      recoveryPublicKey: m.KeyPair.fromString(keys.recovery)
        .getPublicKey()
        .toString(),
      sessionPublicKey: m.KeyPair.fromString(keys.session)
        .getPublicKey()
        .toString(),
    }),
  });
  const value = (await r.json()) as { accountId: string; error?: string };
  if (!r.ok) throw Error(value.error || "Account sponsorship unavailable.");
  const credentials = {
    accountId: value.accountId,
    secretKey: keys.session,
    recoveryKey: keys.recovery,
    contractId: config.contractId,
  };
  localStorage.setItem("last-signal-credentials", JSON.stringify(credentials));
  localStorage.removeItem("last-signal-provision");
  return credentials;
}
async function client(c: Credentials, config: Config) {
  const m = await api();
  return new m.Account(
    c.accountId,
    new m.JsonRpcProvider({ url: config.rpcUrl }),
    m.KeyPairSigner.fromSecretKey(c.secretKey as `ed25519:${string}`),
  );
}
export async function readRun(
  id: string,
  config: Config,
): Promise<RecordState> {
  const m = await api();
  for (const url of [config.rpcUrl, config.fallbackRpcUrl]) {
    try {
      return (await new m.JsonRpcProvider({ url }).callFunction({
        contractId: config.contractId,
        method: "get_run",
        args: { run_id: id },
      })) as unknown as RecordState;
    } catch (e) {
      if (url === config.fallbackRpcUrl) throw e;
    }
  }
  throw Error("No RPC available");
}
export async function newNearRun(
  c: Credentials,
  config: Config,
  seed: number,
  requestId: string,
): Promise<RecordState> {
  const a = await client(c, config);
  return (await a.callFunction({
    contractId: config.contractId,
    methodName: "create_run",
    args: { scenario_id: VERSION, seed, request_id: requestId },
    gas: 180000000000000n,
    waitUntil: "FINAL",
  })) as unknown as RecordState;
}
export async function nearStep(
  c: Credentials,
  config: Config,
  state: RecordState,
  command: Command,
  sols: number,
): Promise<{ record: RecordState; hash: string }> {
  const a = await client(c, config);
  const raw = await a.callFunctionRaw({
    contractId: config.contractId,
    methodName: "step",
    args: {
      run_id: state.run_id,
      expected_revision: state.run.revision,
      command: {
        kind: command.kind,
        option: command.option || 0,
        target: command.target || 0,
      },
      max_sols: sols,
    },
    gas: 250000000000000n,
    waitUntil: "FINAL",
  });
  const record = await readRun(state.run_id, config);
  return { record, hash: raw.transaction.hash };
}
