import type { Config, Credentials } from "./near";
import { view } from "./near";
import type { RecordState } from "./model";
export type CloudRecovery = {
  credentials: Credentials;
  accounts?: Credentials[];
  config: Config;
  runId: string;
  identity: { name: string; emblem: number };
};

export function preserveLocalPark() {
  const raw = localStorage.getItem("moonpark-current");
  if (!raw) return;
  try {
    const save = JSON.parse(raw),
      version = save.state?.run?.version;
    if (typeof version === "string")
      localStorage.setItem(`moonpark-save:${version}`, raw);
  } catch {
    /* An incomplete local save can be replaced by a confirmed cloud recovery. */
  }
}
export async function restoreCloudPark(version?: string): Promise<boolean> {
  const response = await fetch(
    `/api/moon/save${version ? `?version=${encodeURIComponent(version)}` : ""}`,
    { cache: "no-store", signal: AbortSignal.timeout(15000) },
  );
  if (response.status === 401 || response.status === 503) return false;
  if (!response.ok)
    throw Error(
      "Your account’s saved park could not be loaded. Please retry before starting another park.",
    );
  const { recovery } = (await response.json()) as {
    recovery: CloudRecovery | null;
  };
  if (!recovery) return false;
  for (const account of recovery.accounts ?? []) {
    const key = `moonpark-retired-keys:${account.accountId}`;
    if (!localStorage.getItem(key))
      localStorage.setItem(key, JSON.stringify(account));
  }
  let local;
  try {
    local = JSON.parse(localStorage.getItem("moonpark-current") || "null");
  } catch {
    local = null;
  }
  const samePark =
    local?.config?.contractId === recovery.config.contractId &&
    local?.state?.record?.run_id === recovery.runId;
  if (
    samePark &&
    local.credentials?.accountId === recovery.credentials.accountId &&
    local.credentials?.secretKey === recovery.credentials.secretKey
  )
    return true;
  const record = await view<RecordState>(recovery.config, "get_run", {
    run_id: recovery.runId,
  });
  // A newly rotated local operator can be ahead of the last cloud recovery write.
  if (samePark && local.credentials?.accountId === record.owner) return true;
  if (record.owner !== recovery.credentials.accountId)
    throw Error(
      "Your park’s operator changed. Open the park desk with its owning wallet to restore access.",
    );
  preserveLocalPark();
  localStorage.setItem(
    `moonpark-keys:${recovery.credentials.identity}:${recovery.config.contractId}`,
    JSON.stringify(recovery.credentials),
  );
  localStorage.setItem(
    `moonpark-active:${recovery.config.contractId}`,
    recovery.credentials.accountId,
  );
  localStorage.setItem("moonpark-identity", JSON.stringify(recovery.identity));
  localStorage.setItem(
    "moonpark-current",
    JSON.stringify({
      credentials: recovery.credentials,
      config: recovery.config,
      ops: samePark ? (local.ops ?? []) : [],
      state: {
        localId: samePark ? local.state.localId : undefined,
        run: samePark ? local.state.run : record.run,
        record,
        mode: "near",
        pending: 0,
        error: null,
        txs: samePark ? (local.state.txs ?? []) : [],
        deadline: Number.MAX_SAFE_INTEGER,
      },
    }),
  );
  return true;
}
export async function saveCloudRecovery(recovery: CloudRecovery) {
  const response = await fetch("/api/moon/save", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(recovery),
    keepalive: true,
  });
  if (!response.ok)
    throw Error(
      response.status === 409
        ? "Another park is linked to this account. Reopen Moonpark to load it."
        : "Cross-device park recovery could not be saved. Your browser and confirmed NEAR park are saved.",
    );
}
