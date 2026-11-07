import { getSql } from "@/db";
import {
  Account,
  JsonRpcProvider,
  FailoverRpcProvider,
  KeyPairSigner,
  PublicKey,
  actions,
} from "near-api-js";
export const dynamic = "force-dynamic";
// Sponsor nonce serialization in each isolate, plus RPC retries across isolates.
let queue: Promise<unknown> = Promise.resolve();
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: "Origin mismatch" }, { status: 403 });
  const e = process.env;
  if (
    !e.DATABASE_URL ||
    !e.NEAR_SPONSOR_KEY ||
    !e.NEAR_SPONSOR_ID ||
    !e.NEAR_CONTRACT_ID
  )
    return Response.json(
      {
        error:
          "NEAR sponsorship is not configured. Practice mode is available.",
      },
      { status: 503 },
    );
  let body;
  try {
    body = (await request.json()) as {
      recoveryPublicKey: string;
      sessionPublicKey: string;
    };
    if (
      !/^ed25519:[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(body.recoveryPublicKey) ||
      !/^ed25519:[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(body.sessionPublicKey)
    )
      throw Error();
    PublicKey.fromString(body.recoveryPublicKey);
    PublicKey.fromString(body.sessionPublicKey);
  } catch {
    return Response.json({ error: "Invalid public keys" }, { status: 400 });
  }
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(body.recoveryPublicKey),
  );
  const id = Array.from(new Uint8Array(digest))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 20);
  const db = getSql(),
    accountId = `p${id}.${e.NEAR_SPONSOR_ID}`,
    ip =
      request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() ||
      "local";
  const work = async () => {
    const [old] = await db`SELECT * FROM provisioning WHERE id=${id}`;
    if (old && old.session_key !== body.sessionPublicKey)
      return Response.json(
        { error: "Recovery key already registered with another session." },
        { status: 409 },
      );
    if (old?.status === "ready") return Response.json({ accountId });
    if (!old) {
      const [rows] =
        await db`SELECT COUNT(*) AS n FROM provisioning WHERE created_at > ${Date.now() - 86400000}`;
      const [perIp] =
        await db`SELECT COUNT(*) AS n FROM provisioning WHERE created_at > ${Date.now() - 3600000} AND ip=${ip}`;
      if ((rows?.n || 0) >= 100 || (perIp?.n || 0) >= 8)
        return Response.json(
          {
            error:
              "Guest sponsorship limit reached. Try again later or play practice.",
          },
          { status: 429 },
        );
      await db`INSERT INTO provisioning(id,account_id,session_key,status,ip,created_at)
        VALUES(${id},${accountId},${body.sessionPublicKey},'pending',${ip},${Date.now()}) ON CONFLICT (id) DO NOTHING`;
    }
    const p = new FailoverRpcProvider([
      new JsonRpcProvider({ url: "https://test.rpc.fastnear.com" }),
      new JsonRpcProvider({ url: "https://rpc.testnet.near.org" }),
    ]);
    const sponsor = new Account(
      e.NEAR_SPONSOR_ID!,
      p,
      KeyPairSigner.fromSecretKey(e.NEAR_SPONSOR_KEY! as `ed25519:${string}`),
    );
    const state = await sponsor.getState();
    if (state.balance.available < 1000000000000000000000000n)
      return Response.json(
        {
          error:
            "The testnet sponsorship reserve needs replenishing. Your practice game is available.",
        },
        { status: 503 },
      );
    let exists = false;
    try {
      await p.viewAccount({ accountId });
      exists = true;
    } catch (error) {
      const missing = (value: unknown): boolean => {
        const failures = (value as { errors?: unknown[] })?.errors;
        if (failures?.length) return failures.some(missing);
        return /does not exist|UNKNOWN_ACCOUNT|AccountDoesNotExist/.test(
          String(value),
        );
      };
      if (!missing(error)) throw error;
    }
    if (!exists)
      await sponsor.signAndSendTransaction({
        receiverId: accountId,
        actions: [
          actions.createAccount(),
          actions.transfer(500000000000000000000000n),
          actions.addFullAccessKey(
            PublicKey.fromString(body.recoveryPublicKey),
          ),
          actions.addFunctionCallAccessKey(
            PublicKey.fromString(body.sessionPublicKey),
            e.NEAR_CONTRACT_ID!,
            ["create_run", "step"],
            400000000000000000000000n,
          ),
        ],
        waitUntil: "FINAL",
      });
    await sponsor.callFunction({
      contractId: e.NEAR_CONTRACT_ID!,
      methodName: "register_player",
      args: { account_id: accountId },
      waitUntil: "FINAL",
    });
    await db`UPDATE provisioning SET status='ready' WHERE id=${id}`;
    return Response.json({ accountId });
  };
  const task = queue.then(work);
  queue = task.catch(() => {});
  try {
    return await task;
  } catch (error) {
    console.error("Provisioning failed", String(error).slice(0, 400));
    return Response.json(
      {
        error:
          "Sponsorship could not finish. Retry to resume the same account.",
      },
      { status: 503 },
    );
  }
}
