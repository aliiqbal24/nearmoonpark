import { config, view, type Config, type Credentials } from "./near";
import { failoverRpc } from "./rpc";
import type { Design, Kind, RecordState } from "./model";
export type Park = {
  id: string;
  owner: string;
  operator: string;
  pending_owner: string | null;
  name: string;
  emblem: number;
  revision: number;
  run_id: string | null;
  blueprint_ids: string[];
  rating_sum: number;
  rating_count: number;
};
export type RideBlueprint = {
  id: string;
  park_id: string;
  creator: string;
  name: string;
  kind: Kind;
  variant: number;
  launch: number;
  design: Design;
  source_run: string;
  source_building: number;
  licenses: number;
};
export const LICENSE_FEE = 5_000_000_000_000_000_000_000n;
export const PALETTES = [
  {
    name: "Moonpark",
    primary: "#8eddd3",
    accent: "#f8cf76",
    dark: "#273a50",
    light: "#f6f1e7",
  },
  {
    name: "Earthrise",
    primary: "#73b9f3",
    accent: "#f4c977",
    dark: "#263e60",
    light: "#edf5ff",
  },
  {
    name: "Supernova",
    primary: "#f5a17f",
    accent: "#bba0f3",
    dark: "#533c66",
    light: "#fff0e5",
  },
  {
    name: "Stardust",
    primary: "#b7a2ee",
    accent: "#eab6d2",
    dark: "#343452",
    light: "#f6f0ff",
  },
  {
    name: "Solar gold",
    primary: "#edc76d",
    accent: "#8cd6bd",
    dark: "#444947",
    light: "#fff7dd",
  },
  {
    name: "Red planet",
    primary: "#df7e73",
    accent: "#9bced6",
    dark: "#523c47",
    light: "#fcece3",
  },
];
export function storedCredentials(cfg: Config): Credentials[] {
  const candidates: Credentials[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    if (
      !key.startsWith("moonpark-keys:") &&
      !key.startsWith("moonpark-retired-keys:")
    )
      continue;
    try {
      const c = JSON.parse(localStorage.getItem(key)!) as Credentials;
      if (c.contractId === cfg.contractId && c.recoveryKey && c.secretKey)
        candidates.push(c);
    } catch {
      /* An unrelated or incomplete save is not a signing credential. */
    }
  }
  return [...new Map(candidates.map((c) => [c.accountId, c])).values()];
}
export function credentialsFor(
  cfg: Config,
  accountId?: string,
): Credentials | null {
  const preferred =
    accountId ?? localStorage.getItem(`moonpark-active:${cfg.contractId}`);
  const candidates = storedCredentials(cfg);
  return (
    candidates.find((c) => c.accountId === preferred) ??
    (accountId ? null : (candidates.at(-1) ?? null))
  );
}
export async function importParkBackup(cfg: Config, raw: unknown) {
  const backup = raw as {
    format?: string;
    credentials?: Credentials;
    accounts?: Credentials[];
    ownerCredentials?: Credentials;
  };
  if (backup?.format !== "moonpark-account-backup-v1" || !backup.credentials)
    throw Error("Use a Moonpark private account backup.");
  const primary = backup.credentials;
  const records = [
    ...new Map(
      [
        primary,
        ...(backup.accounts ?? []),
        ...(backup.ownerCredentials ? [backup.ownerCredentials] : []),
      ].map((c) => [c.accountId, c]),
    ).values(),
  ];
  if (records.length > 32) throw Error("The backup has too many accounts.");
  const m = await import("near-api-js");
  const provider = failoverRpc(m, [cfg.rpcUrl, cfg.fallbackRpcUrl]);
  await Promise.all(
    records.map(async (c) => {
      if (
        c.contractId !== cfg.contractId ||
        typeof c.identity !== "string" ||
        !c.identity ||
        c.identity.length > 80 ||
        !c.recoveryKey?.startsWith("ed25519:") ||
        !c.secretKey?.startsWith("ed25519:")
      )
        throw Error("Use a backup for this Moonpark contract.");
      const [recovery, session] = await Promise.all([
        provider.viewAccessKey({
          accountId: c.accountId,
          publicKey: m.KeyPair.fromString(
            c.recoveryKey as `ed25519:${string}`,
          ).getPublicKey(),
        }),
        provider.viewAccessKey({
          accountId: c.accountId,
          publicKey: m.KeyPair.fromString(
            c.secretKey as `ed25519:${string}`,
          ).getPublicKey(),
        }),
      ]);
      if (recovery.permission !== "FullAccess")
        throw Error("The backup cannot manage its account.");
      if (
        typeof session.permission === "object" &&
        "FunctionCall" in session.permission &&
        session.permission.FunctionCall.receiver_id !== cfg.contractId
      )
        throw Error("The saved session belongs to a different contract.");
    }),
  );
  for (const c of records)
    localStorage.setItem(
      `moonpark-retired-keys:${c.accountId}`,
      JSON.stringify(c),
    );
  localStorage.setItem(
    `moonpark-keys:${primary.identity}:${cfg.contractId}`,
    JSON.stringify(primary),
  );
  localStorage.setItem(`moonpark-active:${cfg.contractId}`, primary.accountId);
}
// Park administration uses the browser-held recovery key. Ordinary play retains its restricted key.
export async function parkAction(
  cfg: Config,
  c: Credentials,
  methodName: string,
  args: Record<string, unknown>,
  deposit = 0n,
) {
  const m = await import("near-api-js");
  const account = new m.Account(
    c.accountId,
    failoverRpc(m, [cfg.rpcUrl, cfg.fallbackRpcUrl]),
    m.KeyPairSigner.fromSecretKey(c.recoveryKey as `ed25519:${string}`),
  );
  const raw = await account.callFunctionRaw({
    contractId: cfg.contractId,
    methodName,
    args,
    deposit,
    gas: 120000000000000n,
    waitUntil: "FINAL",
  });
  if (typeof raw.status !== "object" || !("SuccessValue" in raw.status))
    throw Error("NEAR did not confirm this change. Refresh before retrying.");
  const value = raw.status.SuccessValue
    ? JSON.parse(
        new TextDecoder().decode(
          Uint8Array.from(atob(raw.status.SuccessValue), (x) =>
            x.charCodeAt(0),
          ),
        ),
      )
    : null;
  if (value === false)
    throw Error("The payment failed and is available to retry.");
  return { value, tx: raw.transaction.hash };
}
let connector:
  | Promise<import("@hot-labs/near-connect").NearConnector>
  | undefined;
export function walletConnector(cfg: Config) {
  return (connector ??= import("@hot-labs/near-connect").then(
    ({ NearConnector }) =>
      new NearConnector({
        network: "testnet",
        providers: { testnet: [cfg.rpcUrl, cfg.fallbackRpcUrl] },
        features: { testnet: true, signAndSendTransaction: true },
        excludedWallets: ["my-near-wallet"],
        cspNonce:
          document.querySelector("script[nonce]")?.getAttribute("nonce") ??
          undefined,
      }),
  ));
}
export async function readConnectedWallet(cfg: Config) {
  const c = await walletConnector(cfg);
  try {
    const { wallet, accounts } = await c.getConnectedWallet();
    return accounts[0] ? { wallet, accountId: accounts[0].accountId } : null;
  } catch {
    return null;
  }
}
export async function connectedWallet(cfg: Config) {
  const connected = await readConnectedWallet(cfg);
  if (connected) return connected;
  const url = new URL(location.href);
  url.searchParams.set("parkdesk", "1");
  history.replaceState(null, "", url);
  const wallet = await (await walletConnector(cfg)).connect();
  const accounts = await wallet.getAccounts({ network: "testnet" });
  return accounts[0] ? { wallet, accountId: accounts[0].accountId } : null;
}
export async function walletAction(
  cfg: Config,
  methodName: string,
  args: Record<string, unknown>,
  expectedAccountId?: string,
) {
  const w = await connectedWallet(cfg);
  if (!w) throw Error("Connect a NEAR testnet wallet first.");
  if (expectedAccountId && w.accountId !== expectedAccountId)
    throw Error(`Connect the park owner ${expectedAccountId} in your wallet.`);
  const m = await import("near-api-js");
  const outcome = await w.wallet.signAndSendTransaction({
    network: "testnet",
    signerId: w.accountId,
    receiverId: cfg.contractId,
    actions: [m.actions.functionCall(methodName, args, 120000000000000n, 0n)],
  });
  if (typeof outcome.status === "object" && "Failure" in outcome.status)
    throw Error(
      "The wallet transaction was rejected by NEAR. Your earlier ownership is still recorded.",
    );
}
export async function parkSnapshot(cfg: Config, park: Park) {
  if (!park.run_id) return null;
  return view<RecordState>(cfg, "get_run", { run_id: park.run_id });
}
export async function publicPark(accountId: string) {
  const cfg = await config();
  if (!cfg) throw Error("NEAR configuration is unavailable.");
  const park = /^p-\d+$/.test(accountId)
    ? await view<Park | null>(cfg, "get_park", { park_id: accountId.slice(2) })
    : await view<Park | null>(cfg, "get_park_by_owner", {
        account_id: accountId,
      });
  if (!park) throw Error("This account has not published a Moonpark yet.");
  return { cfg, park, record: await parkSnapshot(cfg, park) };
}
