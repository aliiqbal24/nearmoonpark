import { env } from "cloudflare:workers";
import {
  Account,
  FailoverRpcProvider,
  JsonRpcProvider,
  KeyPairSigner,
  PublicKey,
  actions,
} from "near-api-js";
import { identity } from "@/lib/moon/auth";
export const dynamic = "force-dynamic";
let queue: Promise<unknown> = Promise.resolve();
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: "Origin mismatch" }, { status: 403 });
  const e = env as unknown as {
    DB?: D1Database;
    MOON_SPONSOR_ID?: string;
    MOON_SPONSOR_KEY?: string;
    MOON_CONTRACT_ID?: string;
  };
  if (!e.DB || !e.MOON_SPONSOR_ID || !e.MOON_SPONSOR_KEY || !e.MOON_CONTRACT_ID)
    return Response.json(
      {
        error:
          "NEAR playtesting is awaiting contract configuration. Offline practice is available.",
      },
      { status: 503 },
    );
  let body: {
    recoveryPublicKey: string;
    sessionPublicKey: string;
    ranked?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
    PublicKey.fromString(body.recoveryPublicKey);
    PublicKey.fromString(body.sessionPublicKey);
    if (
      !body.recoveryPublicKey.startsWith("ed25519:") ||
      !body.sessionPublicKey.startsWith("ed25519:")
    )
      throw Error();
  } catch {
    return Response.json({ error: "Invalid public keys." }, { status: 400 });
  }
  let playerId: string,
    displayName = "Moon Explorer";
  if (body.ranked) {
    const signed = await identity(request);
    if (!signed?.user)
      return Response.json(
        { error: "Sign in with Google before ranked play." },
        { status: 401 },
      );
    const profile = await e.DB.prepare(
      "SELECT player_id,display_name FROM moon_profile WHERE user_id=?",
    )
      .bind(signed.user.id)
      .first<{ player_id: string; display_name: string }>();
    if (!profile)
      return Response.json(
        { error: "Load your player profile before starting." },
        { status: 409 },
      );
    playerId = profile.player_id;
    displayName = profile.display_name;
  } else playerId = "guest:" + crypto.randomUUID();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(body.recoveryPublicKey + e.MOON_CONTRACT_ID),
  );
  const id = Array.from(new Uint8Array(digest))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 20);
  const accountId = `m${id}.${e.MOON_SPONSOR_ID}`,
    db = e.DB,
    ip = request.headers.get("cf-connecting-ip") || "local";
  const work = async () => {
    const old = await db
      .prepare("SELECT * FROM moon_provisioning WHERE id=?")
      .bind(id)
      .first<{ session_key: string; status: string; player_id: string }>();
    if (old) {
      if (
        old.session_key !== body.sessionPublicKey ||
        (body.ranked && old.player_id !== playerId)
      )
        return Response.json(
          { error: "Account identity mismatch." },
          { status: 409 },
        );
      playerId = old.player_id;
      if (old.status === "ready") return Response.json({ accountId });
    } else {
      const global = await db
        .prepare(
          "SELECT COUNT(*) AS n FROM moon_provisioning WHERE created_at>?",
        )
        .bind(Date.now() - 86400000)
        .first<{ n: number }>();
      const local = await db
        .prepare(
          "SELECT COUNT(*) AS n FROM moon_provisioning WHERE created_at>? AND ip=?",
        )
        .bind(Date.now() - 3600000, ip)
        .first<{ n: number }>();
      if ((global?.n || 0) >= 100 || (local?.n || 0) >= 8)
        return Response.json(
          {
            error:
              "Sponsorship is busy. Practice is available; try NEAR again later.",
          },
          { status: 429 },
        );
      await db
        .prepare(
          "INSERT OR IGNORE INTO moon_provisioning(id,account_id,session_key,player_id,status,ip,created_at) VALUES(?,?,?,?,'pending',?,?)",
        )
        .bind(id, accountId, body.sessionPublicKey, playerId, ip, Date.now())
        .run();
    }
    const p = new FailoverRpcProvider([
      new JsonRpcProvider({ url: "https://test.rpc.fastnear.com" }),
      new JsonRpcProvider({ url: "https://rpc.testnet.near.org" }),
    ]);
    const root = new Account(
      e.MOON_SPONSOR_ID!,
      p,
      KeyPairSigner.fromSecretKey(e.MOON_SPONSOR_KEY! as `ed25519:${string}`),
    );
    let exists = false;
    try {
      await p.viewAccount({ accountId });
      exists = true;
    } catch (err) {
      const missing = (v: unknown): boolean => {
        const a = v as { errors?: unknown[]; message?: string };
        return a.errors
          ? a.errors.some(missing)
          : /does not exist|UNKNOWN_ACCOUNT|not found/i.test(
              String(a.message || v),
            );
      };
      if (!missing(err)) throw err;
    }
    if (!exists) {
      const balance = await root.getState();
      if (balance.balance.available < 1800000000000000000000000n)
        return Response.json(
          {
            error:
              "The testnet sponsorship reserve needs replenishing. Practice is available.",
          },
          { status: 503 },
        );
      await root.signAndSendTransaction({
        receiverId: accountId,
        actions: [
          actions.createAccount(),
          actions.transfer(1500000000000000000000000n),
          actions.addFullAccessKey(
            PublicKey.fromString(body.recoveryPublicKey),
          ),
          actions.addFunctionCallAccessKey(
            PublicKey.fromString(body.sessionPublicKey),
            e.MOON_CONTRACT_ID!,
            ["create_run", "apply_actions"],
            1200000000000000000000000n,
          ),
        ],
        waitUntil: "EXECUTED",
      });
    }
    await root.callFunction({
      contractId: e.MOON_CONTRACT_ID!,
      methodName: "register_player",
      args: {
        account_id: accountId,
        player_id: playerId,
        display_name: displayName,
      },
      gas: 50000000000000n,
      waitUntil: "EXECUTED",
    });
    await db
      .prepare("UPDATE moon_provisioning SET status='ready' WHERE id=?")
      .bind(id)
      .run();
    return Response.json({ accountId });
  };
  const result = queue.then(work);
  queue = result.catch(() => {});
  try {
    return await result;
  } catch (error) {
    console.error(
      "Moon sponsorship failed",
      error instanceof Error ? error.message : "RPC error",
    );
    return Response.json(
      {
        error:
          "NEAR did not finish account creation. Retry safely with the same account, or play practice.",
      },
      { status: 503 },
    );
  }
}
