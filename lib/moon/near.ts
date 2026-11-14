import type { Command, RecordState, Entry } from "./model";
import { VERSION } from "./model";
import { failoverRpc } from "./rpc";
import { renewalMessage, type RenewalProof } from "./sponsorship";
import { AccessKeyNotEnoughAllowanceActionError } from "near-api-js/rpc-errors";
export type Config = {
  contractId: string;
  rpcUrl: string;
  fallbackRpcUrl: string;
  network: string;
  codeHash: string;
  archivedVersion?: "v4" | "v5" | "v6" | "v7";
  vendors?: { omar: string; mina: string; logistics: string };
};
export type Credentials = {
  accountId: string;
  secretKey: string;
  recoveryKey: string;
  contractId: string;
  identity: string;
  displayName?: string;
};
function within<T>(p: Promise<T>, ms = 30000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Error("NEAR confirmation timed out. Reconnecting safely.")),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}
let mod: Promise<typeof import("near-api-js")> | undefined;
const api = () => (mod ??= import("near-api-js"));
export async function config(): Promise<Config | null> {
  const r = await fetch("/moon-config.json", { cache: "no-store" });
  if (!r.ok) return null;
  const c = (await r.json()) as Config;
  if (c.network !== "testnet" || !c.contractId.endsWith(".testnet"))
    throw Error("This Moonpark build only uses NEAR testnet.");
  return c;
}
export async function view<T>(
  c: Config,
  method: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const m = await api();
  let last;
  for (const url of [c.rpcUrl, c.fallbackRpcUrl])
    try {
      return (await within(
        new m.JsonRpcProvider(
          { url },
          { retries: 2, wait: 300, backoff: 1.5 },
        ).callFunction({
          contractId: c.contractId,
          method,
          args,
        }),
        10000,
      )) as T;
    } catch (e) {
      last = e;
    }
  throw last;
}
export async function provision(
  c: Config,
  identity: string,
  ranked: boolean,
  displayName?: string,
) {
  const m = await api();
  const key = `moonpark-keys:${identity}:${c.contractId}`;
  const saved = localStorage.getItem(key);
  let previousAccount = "";
  if (saved) {
    const credentials = JSON.parse(saved) as Credentials;
    const p = failoverRpc(m, [c.rpcUrl, c.fallbackRpcUrl]);
    const account = new m.Account(
      credentials.accountId,
      p,
      m.KeyPairSigner.fromSecretKey(
        credentials.secretKey as `ed25519:${string}`,
      ),
    );
    const [state, access] = await within(
      Promise.all([
        account.getState(),
        p.viewAccessKey({
          accountId: credentials.accountId,
          publicKey: m.KeyPair.fromString(
            credentials.secretKey as `ed25519:${string}`,
          ).getPublicKey(),
        }),
      ]),
    );
    const permission = access.permission;
    const allowance =
      typeof permission === "object" && "FunctionCall" in permission
        ? BigInt(
            permission.FunctionCall.allowance ??
              "999999999999999999999999999999",
          )
        : 0n;
    if (
      state.balance.available >= 320000000000000000000000n &&
      allowance >= 320000000000000000000000n
    ) {
      credentials.displayName = displayName;
      localStorage.setItem(
        `moonpark-active:${c.contractId}`,
        credentials.accountId,
      );
      await restoreRotatedPark(c, credentials);
      return credentials;
    }
    previousAccount = credentials.accountId;
    localStorage.setItem(
      `moonpark-retired-keys:${credentials.accountId}`,
      saved,
    );
    localStorage.removeItem(key);
  }
  const pendingKey = `moonpark-pending:${identity}:${c.contractId}`;
  const pending = JSON.parse(localStorage.getItem(pendingKey) || "null") || {
    recovery: m.KeyPair.fromRandom("ed25519").toString(),
    session: m.KeyPair.fromRandom("ed25519").toString(),
  };
  if (previousAccount) pending.previousAccount = previousAccount;
  else previousAccount = pending.previousAccount ?? "";
  localStorage.setItem(pendingKey, JSON.stringify(pending));
  const recoveryPublicKey = m.KeyPair.fromString(pending.recovery)
    .getPublicKey()
    .toString();
  const sessionPublicKey = m.KeyPair.fromString(pending.session)
    .getPublicKey()
    .toString();
  let renewal: RenewalProof | undefined;
  if (previousAccount) {
    const previous = JSON.parse(
      localStorage.getItem(`moonpark-retired-keys:${previousAccount}`) ||
        "null",
    ) as Credentials | null;
    if (previous) {
      const signer = m.KeyPair.fromString(
        previous.recoveryKey as `ed25519:${string}`,
      );
      const issuedAt = Date.now();
      const signed = signer.sign(
        renewalMessage(
          c.contractId,
          previousAccount,
          recoveryPublicKey,
          sessionPublicKey,
          issuedAt,
        ),
      );
      renewal = {
        accountId: previousAccount,
        publicKey: signer.getPublicKey().toString(),
        issuedAt,
        signature: btoa(String.fromCharCode(...signed.signature)),
      };
    }
  }
  const r = await fetch("/api/moon/provision", {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      recoveryPublicKey,
      sessionPublicKey,
      contractId: c.contractId,
      ranked,
      renewal,
    }),
  });
  const data = (await r.json()) as { accountId: string; error?: string };
  if (!r.ok) throw Error(data.error || "NEAR sponsorship is unavailable.");
  const credentials: Credentials = {
    accountId: data.accountId,
    secretKey: pending.session,
    recoveryKey: pending.recovery,
    contractId: c.contractId,
    identity,
    displayName,
  };
  localStorage.setItem(key, JSON.stringify(credentials));
  if (previousAccount)
    localStorage.setItem(
      `moonpark-rotation:${credentials.accountId}`,
      previousAccount,
    );
  localStorage.removeItem(pendingKey);
  localStorage.setItem(
    `moonpark-active:${c.contractId}`,
    credentials.accountId,
  );
  await restoreRotatedPark(c, credentials);
  return credentials;
}
async function restoreRotatedPark(cfg: Config, credentials: Credentials) {
  const key = `moonpark-rotation:${credentials.accountId}`;
  const previous = localStorage.getItem(key);
  if (!previous) return;
  const old = JSON.parse(
    localStorage.getItem(`moonpark-retired-keys:${previous}`) || "null",
  ) as Credentials | null;
  const park = await view<{ id: string } | null>(cfg, "get_park_by_operator", {
    account_id: previous,
  });
  if (park && old) {
    const { parkAction } = await import("./parks");
    await parkAction(cfg, old, "rotate_park_operator", {
      park_id: park.id,
      operator: credentials.accountId,
    });
  }
  localStorage.removeItem(key);
}
const clients = new WeakMap<
  Credentials,
  Promise<import("near-api-js").Account>
>();
async function client(c: Credentials, cfg: Config) {
  let account = clients.get(c);
  if (!account) {
    account = api().then(
      (m) =>
        new m.Account(
          c.accountId,
          failoverRpc(m, [cfg.rpcUrl, cfg.fallbackRpcUrl]),
          m.KeyPairSigner.fromSecretKey(c.secretKey as `ed25519:${string}`),
        ),
    );
    clients.set(c, account);
  }
  return account;
}
export async function create(c: Credentials, cfg: Config, requestId: string) {
  const a = await client(c, cfg);
  return (await within(
    a.callFunction({
      contractId: cfg.contractId,
      methodName: "create_run",
      args: {
        challenge_id: cfg.archivedVersion
          ? `moonpark-${cfg.archivedVersion}`
          : VERSION,
        request_id: requestId,
        display_name: c.displayName ?? null,
      },
      gas: 180000000000000n,
      waitUntil: "EXECUTED",
    }),
  )) as RecordState;
}
export async function settle(
  c: Credentials,
  cfg: Config,
  state: RecordState,
  commands: Command[],
  ticks: number,
  requestId: string,
) {
  const a = await client(c, cfg);
  const call = {
    contractId: cfg.contractId,
    methodName: "apply_actions",
    args: {
      run_id: state.run_id,
      expected_revision: state.run.revision,
      request_id: requestId,
      commands,
      ticks,
    },
    gas: 250000000000000n,
    waitUntil: "EXECUTED" as const,
  };
  let raw;
  try {
    raw = await within(a.callFunctionRaw(call));
  } catch (error) {
    if (!(error instanceof AccessKeyNotEnoughAllowanceActionError)) throw error;
    // NEAR reserves the full prepaid gas before execution. As the finite key
    // budget falls, fit that reservation to the remaining allowance with margin.
    const gas = (call.gas * error.allowance * 9n) / (error.cost * 10n);
    if (gas < 110000000000000n) throw error;
    raw = await within(a.callFunctionRaw({ ...call, gas }));
  }
  const status = raw.status;
  if (typeof status !== "object" || !("SuccessValue" in status))
    throw Error("NEAR rejected the action: " + JSON.stringify(status));
  const bytes = Uint8Array.from(atob(status.SuccessValue), (c) =>
    c.charCodeAt(0),
  );
  return {
    record: JSON.parse(new TextDecoder().decode(bytes)) as RecordState,
    tx: raw.transaction.hash,
  };
}
export const leaderboard = (c: Config) =>
  view<{ entries: Entry[]; open: boolean }>(c, "get_leaderboard");

export async function checkRecipient(cfg: Config, accountId: string) {
  const m = await api();
  const p = failoverRpc(m, [cfg.rpcUrl, cfg.fallbackRpcUrl]);
  try {
    await within(p.viewAccount({ accountId }), 15000);
  } catch {
    throw Error(
      "That NEAR testnet account could not be verified. Check its spelling before transferring.",
    );
  }
}

export async function ownershipAction(
  c: Credentials,
  cfg: Config,
  methodName: "claim_business_reward" | "claim_prize" | "nft_transfer",
  args: Record<string, unknown>,
) {
  const m = await api();
  const account =
    methodName === "nft_transfer"
      ? new m.Account(
          c.accountId,
          failoverRpc(m, [cfg.rpcUrl, cfg.fallbackRpcUrl]),
          m.KeyPairSigner.fromSecretKey(c.recoveryKey as `ed25519:${string}`),
        )
      : await client(c, cfg);
  const raw = await within(
    account.callFunctionRaw({
      contractId: cfg.contractId,
      methodName,
      args,
      gas: 80000000000000n,
      deposit: methodName === "nft_transfer" ? 1n : 0n,
      waitUntil: "FINAL",
    }),
    45000,
  );
  if (typeof raw.status !== "object" || !("SuccessValue" in raw.status))
    throw Error(
      "NEAR could not finish this action. Your ownership and claim remain onchain.",
    );
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
    throw Error(
      "The reward transfer failed. It is available to collect again.",
    );
  return raw.transaction.hash;
}
