import { getSql, reserveSponsorship } from "@/db";
import {
  Account,
  FailoverRpcProvider,
  JsonRpcProvider,
  KeyPairSigner,
  PublicKey,
  actions,
} from "near-api-js";
import { identity } from "@/lib/moon/auth";
import { failoverRpc } from "@/lib/moon/rpc";
import { renewalMessage, type RenewalProof } from "@/lib/moon/sponsorship";
import archivedV7 from "@/public/moon-v7-config.json";
import archivedV6 from "@/public/moon-v6-config.json";
export const dynamic = "force-dynamic";
let queue: Promise<unknown> = Promise.resolve();
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: "Origin mismatch" }, { status: 403 });
  let e = process.env;
  if (
    !e.DATABASE_URL ||
    !e.MOON_SPONSOR_ID ||
    !e.MOON_SPONSOR_KEY ||
    !e.MOON_CONTRACT_ID
  )
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
    contractId?: string;
    renewal?: RenewalProof;
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
  // Pre-v7 clients omit the contract ID. Keep their recovery on the original registry.
  const contractId =
    body.contractId ??
    (e.MOON_V6_CONTRACT_ID === archivedV6.contractId
      ? archivedV6.contractId
      : e.MOON_CONTRACT_ID);
  if (contractId !== e.MOON_CONTRACT_ID) {
    const prefix =
      contractId === archivedV6.contractId
        ? "MOON_V6"
        : contractId === archivedV7.contractId
          ? "MOON_V7"
          : null;
    if (!prefix)
      return Response.json(
        { error: "Unsupported park contract." },
        { status: 400 },
      );
    const sponsorId = e[`${prefix}_SPONSOR_ID`],
      sponsorKey = e[`${prefix}_SPONSOR_KEY`];
    if (!sponsorId || !sponsorKey || e[`${prefix}_CONTRACT_ID`] !== contractId)
      return Response.json(
        {
          error: "Earlier park sponsorship is unavailable. Your park is saved.",
        },
        { status: 503 },
      );
    e = {
      ...e,
      MOON_SPONSOR_ID: sponsorId,
      MOON_SPONSOR_KEY: sponsorKey,
      MOON_CONTRACT_ID: contractId,
    };
  }

  let playerId: string,
    displayName = "Moon Explorer";
  if (body.ranked) {
    const signed = await identity();
    if (!signed?.user)
      return Response.json(
        { error: "Sign in before ranked play." },
        { status: 401 },
      );
    const sql = getSql();
    const [profile] =
      await sql`SELECT player_id,display_name FROM moon_profile WHERE user_id=${signed.user.id}`;
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
    db = getSql(),
    ip =
      request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() ||
      "local";
  const work = async () => {
    const p = failoverRpc({ FailoverRpcProvider, JsonRpcProvider }, [
      "https://test.rpc.fastnear.com",
      "https://rpc.testnet.near.org",
    ]);
    const [old] = await db`SELECT * FROM moon_provisioning WHERE id=${id}`;
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
      let budget = ip;
      if (body.renewal) {
        const proof = body.renewal;
        try {
          if (
            !proof.accountId.endsWith(`.${e.MOON_SPONSOR_ID}`) ||
            !Number.isSafeInteger(proof.issuedAt) ||
            Math.abs(Date.now() - proof.issuedAt) > 300000
          )
            throw Error();
          const key = PublicKey.fromString(proof.publicKey);
          if (!proof.publicKey.startsWith("ed25519:")) throw Error();
          const signature = Buffer.from(proof.signature, "base64");
          const verifyKey = await crypto.subtle.importKey(
            "raw",
            new Uint8Array(key.data),
            "Ed25519",
            false,
            ["verify"],
          );
          if (
            signature.length !== 64 ||
            !(await crypto.subtle.verify(
              "Ed25519",
              verifyKey,
              signature,
              renewalMessage(
                contractId,
                proof.accountId,
                body.recoveryPublicKey,
                body.sessionPublicKey,
                proof.issuedAt,
              ),
            ))
          )
            throw Error();
          const [previous] =
            await db`SELECT player_id FROM moon_provisioning WHERE account_id=${proof.accountId} AND status='ready' LIMIT 1`;
          if (!previous || (body.ranked && previous.player_id !== playerId))
            throw Error();
          const [access, park] = await Promise.all([
            p.viewAccessKey({ accountId: proof.accountId, publicKey: key }),
            p.callFunction<{ id: string; operator: string }>({
              contractId,
              method: "get_park_by_operator",
              args: { account_id: proof.accountId },
            }),
          ]);
          if (
            access.permission !== "FullAccess" ||
            !park ||
            park.operator !== proof.accountId
          )
            throw Error();
          playerId = previous.player_id;
          budget = `renewal:${contractId}:${park.id}`;
        } catch {
          return Response.json(
            {
              error:
                "Park renewal proof could not be verified. Retry from the park’s saved browser or account.",
            },
            { status: 403 },
          );
        }
      }
      const reserved = await reserveSponsorship({
        id,
        accountId,
        sessionKey: body.sessionPublicKey,
        playerId,
        ip: budget,
        renewal: !!body.renewal,
      });
      if (!reserved)
        return Response.json(
          {
            error:
              "Sponsorship is busy. Practice is available; try NEAR again later.",
          },
          { status: 429 },
        );
    }
    const root = new Account(
      e.MOON_SPONSOR_ID!,
      p,
      KeyPairSigner.fromSecretKey(e.MOON_SPONSOR_KEY! as `ed25519:${string}`),
    );
    const safety = await p.callFunction<{ storage_buffer_yocto: string }>({
      contractId: e.MOON_CONTRACT_ID!,
      method: "get_fund_safety",
      args: {},
    });
    if (
      safety &&
      BigInt(safety.storage_buffer_yocto) < 1000000000000000000000000n
    ) {
      const reserve = await root.getState();
      if (reserve.balance.available < 2800000000000000000000000n)
        return Response.json(
          {
            error:
              "The testnet storage sponsor needs replenishing. Existing reward reserves remain protected; practice is available.",
          },
          { status: 503 },
        );
      await root.callFunction({
        contractId: e.MOON_CONTRACT_ID!,
        methodName: "fund_storage",
        args: {},
        deposit: 2000000000000000000000000n,
        gas: 30000000000000n,
        waitUntil: "EXECUTED",
      });
    }
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
      if (balance.balance.available < 800000000000000000000000n)
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
          actions.transfer(500000000000000000000000n),
          actions.addFullAccessKey(
            PublicKey.fromString(body.recoveryPublicKey),
          ),
          actions.addFunctionCallAccessKey(
            PublicKey.fromString(body.sessionPublicKey),
            e.MOON_CONTRACT_ID!,
            ["create_run", "apply_actions", "claim_prize"],
            400000000000000000000000n,
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
    await db`UPDATE moon_provisioning SET status='ready' WHERE id=${id}`;
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
