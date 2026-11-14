import { getSql } from "@/db";
import { identity } from "@/lib/moon/auth";
import { openRecovery, sealRecovery } from "@/lib/moon/cloud-vault";
import type { Credentials } from "@/lib/moon/near";
import type { Park } from "@/lib/moon/parks";
import type { CloudRecovery } from "@/lib/moon/cloud";
import current from "@/public/moon-config.json";
import v7 from "@/public/moon-v7-config.json";
import v6 from "@/public/moon-v6-config.json";
import { view } from "@/lib/moon/near";
import type { RecordState } from "@/lib/moon/model";
import { FailoverRpcProvider, JsonRpcProvider, KeyPair } from "near-api-js";
import { failoverRpc } from "@/lib/moon/rpc";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
function validateCredentials(value: Credentials, contractId: string) {
  if (
    value?.contractId !== contractId ||
    !/^[a-z0-9._-]{2,64}\.testnet$/.test(value.accountId) ||
    typeof value.identity !== "string" ||
    value.identity.length > 100
  )
    throw Error("Invalid account.");
  KeyPair.fromString(value.secretKey as `ed25519:${string}`);
  KeyPair.fromString(value.recoveryKey as `ed25519:${string}`);
  return value;
}
export async function GET(request: Request) {
  const signed = await identity();
  if (!signed?.user)
    return Response.json(
      { error: "Sign in to load your park." },
      { status: 401, headers },
    );
  if (!process.env.MOON_CLOUD_SAVE_KEY)
    return Response.json(
      { error: "Cloud recovery is awaiting configuration." },
      { status: 503, headers },
    );
  const sql = getSql();
  const version = new URL(request.url).searchParams.get("version");
  const preferred =
    version === "moonpark-v7"
      ? v7.contractId
      : version === "moonpark-v6"
        ? v6.contractId
        : current.contractId;
  const [row] =
    await sql`SELECT contract_id, recovery FROM moon_cloud_save WHERE user_id=${signed.user.id} ORDER BY (contract_id = ${preferred}) DESC, updated_at DESC LIMIT 1`;
  return Response.json(
    {
      recovery: row
        ? openRecovery(row.recovery, signed.user.id, row.contract_id)
        : null,
    },
    { headers },
  );
}
export async function PUT(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json(
      { error: "Origin mismatch." },
      { status: 403, headers },
    );
  const signed = await identity();
  if (!signed?.user)
    return Response.json(
      { error: "Sign in to save your park." },
      { status: 401, headers },
    );
  if (!process.env.MOON_CLOUD_SAVE_KEY)
    return Response.json(
      { error: "Cloud recovery is awaiting configuration." },
      { status: 503, headers },
    );
  let recovery: CloudRecovery;
  try {
    const text = await request.text();
    if (text.length > 16384) throw Error();
    const body = JSON.parse(text) as CloudRecovery;
    const config = [current, v7, v6].find(
      (c) => c.contractId === body.config?.contractId,
    );
    if (
      !config ||
      !/^\d{1,20}$/.test(body.runId) ||
      (body.accounts?.length ?? 0) > 8
    )
      throw Error();
    validateCredentials(body.credentials, config.contractId);
    for (const account of body.accounts ?? [])
      validateCredentials(account, config.contractId);
    const name = String(body.identity?.name ?? "My Moonpark")
      .replace(/[\x00-\x1f]/g, "")
      .trim()
      .slice(0, 40);
    recovery = {
      credentials: body.credentials,
      accounts: body.accounts ?? [],
      config,
      runId: body.runId,
      identity: {
        name,
        emblem: [0, 1, 2].includes(body.identity?.emblem)
          ? body.identity.emblem
          : 0,
      },
    };
  } catch {
    return Response.json(
      { error: "Invalid park recovery data." },
      { status: 400, headers },
    );
  }
  const record = await view<RecordState>(recovery.config, "get_run", {
    run_id: recovery.runId,
  });
  if (record.owner !== recovery.credentials.accountId)
    return Response.json(
      { error: "This account no longer operates the saved park." },
      { status: 409, headers },
    );
  const park = await view<Park>(recovery.config, "get_park", {
    park_id: record.park_id,
  });
  if (
    park.operator !== recovery.credentials.accountId ||
    recovery.accounts?.some((a) => a.accountId !== park.owner)
  )
    return Response.json(
      { error: "Park authority changed. Reload your saved park." },
      { status: 409, headers },
    );
  const provider = failoverRpc({ FailoverRpcProvider, JsonRpcProvider }, [
    recovery.config.rpcUrl,
    recovery.config.fallbackRpcUrl,
  ]);
  try {
    const sessionPublic = KeyPair.fromString(
      recovery.credentials.secretKey as `ed25519:${string}`,
    ).getPublicKey();
    const recoveryPublic = KeyPair.fromString(
      recovery.credentials.recoveryKey as `ed25519:${string}`,
    ).getPublicKey();
    const [sessionKey, fullKey] = await Promise.all([
      provider.viewAccessKey({
        accountId: record.owner,
        publicKey: sessionPublic,
      }),
      provider.viewAccessKey({
        accountId: record.owner,
        publicKey: recoveryPublic,
      }),
    ]);
    if (fullKey.permission !== "FullAccess") throw Error();
    const permission = sessionKey.permission;
    const call =
      typeof permission === "object" && "FunctionCall" in permission
        ? permission.FunctionCall
        : null;
    if (
      permission !== "FullAccess" &&
      (!call ||
        call.receiver_id !== recovery.config.contractId ||
        (call.method_names.length > 0 &&
          !call.method_names.includes("apply_actions")))
    )
      throw Error();
    await Promise.all(
      (recovery.accounts ?? []).map(async (account) => {
        const access = await provider.viewAccessKey({
          accountId: account.accountId,
          publicKey: KeyPair.fromString(
            account.recoveryKey as `ed25519:${string}`,
          ).getPublicKey(),
        });
        if (access.permission !== "FullAccess") throw Error();
      }),
    );
  } catch {
    return Response.json(
      {
        error:
          "These recovery keys could not be verified against NEAR. Your browser save is preserved.",
      },
      { status: 400, headers },
    );
  }
  const sql = getSql();
  const [previous] =
    await sql`SELECT recovery FROM moon_cloud_save WHERE user_id=${signed.user.id} AND contract_id=${recovery.config.contractId} AND run_id=${recovery.runId}`;
  const old = previous
    ? (openRecovery(
        previous.recovery,
        signed.user.id,
        recovery.config.contractId,
      ) as CloudRecovery)
    : null;
  // Owner keys stay recoverable when the sponsored operator rotates or an external wallet claims the park.
  const owners = old?.runId === recovery.runId ? (old.accounts ?? []) : [];
  const byAccount = new Map(
    [...owners, ...(recovery.accounts ?? [])].map((account) => [
      account.accountId,
      account,
    ]),
  );
  recovery.accounts = [...byAccount.values()].slice(-8);
  const encrypted = sealRecovery(
    recovery,
    signed.user.id,
    recovery.config.contractId,
  );
  const rows =
    await sql`INSERT INTO moon_cloud_save(user_id, contract_id, account_id, run_id, recovery, updated_at, authority_revision)
    VALUES(${signed.user.id},${recovery.config.contractId},${recovery.credentials.accountId},${recovery.runId},${encrypted},${Date.now()},${park.revision})
    ON CONFLICT(user_id,contract_id,run_id) DO UPDATE SET account_id=EXCLUDED.account_id, run_id=EXCLUDED.run_id, recovery=EXCLUDED.recovery, updated_at=EXCLUDED.updated_at, authority_revision=EXCLUDED.authority_revision
    WHERE moon_cloud_save.authority_revision <= EXCLUDED.authority_revision RETURNING account_id`;
  if (!rows.length)
    return Response.json(
      { error: "This account already has a park on this contract." },
      { status: 409, headers },
    );
  return Response.json({ saved: true }, { headers });
}
