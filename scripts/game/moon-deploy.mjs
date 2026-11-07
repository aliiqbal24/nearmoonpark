import {
  Account,
  JsonRpcProvider,
  KeyPair,
  KeyPairSigner,
  actions,
} from "near-api-js";
import { mkdir, readFile, writeFile, chmod } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
await mkdir(".near-local", { recursive: true });
let key;
try {
  key = JSON.parse(await readFile(".near-local/moon-v2-deployer.json", "utf8"));
} catch {
  const pair = KeyPair.fromRandom("ed25519");
  key = {
    accountId: `moonpark-${Date.now().toString(36)}.testnet`,
    secretKey: pair.toString(),
  };
  await writeFile(".near-local/moon-v2-deployer.json", JSON.stringify(key), {
    mode: 0o600,
  });
}
const p = new JsonRpcProvider({ url: "https://test.rpc.fastnear.com" }),
  pair = KeyPair.fromString(key.secretKey),
  a = new Account(key.accountId, p, new KeyPairSigner(pair));
let exists = true;
try {
  await a.getState();
} catch {
  exists = false;
  const r = await fetch("https://helper.nearprotocol.com/account", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      newAccountId: key.accountId,
      newAccountPublicKey: pair.getPublicKey().toString(),
    }),
  });
  if (!r.ok) throw Error(`Testnet faucet returned ${r.status}`);
}
const code = new Uint8Array(
  await readFile(
    "target/wasm32-unknown-unknown/release/moonpark_contract.wasm",
  ),
);
const upgrade = process.argv.includes("--upgrade");
if (exists && !upgrade)
  throw Error(
    "Moonpark contract exists; use --upgrade only during internal playtesting.",
  );
if (upgrade) {
  const challenge = await p.callFunction({
    contractId: key.accountId,
    method: "get_challenge",
    args: {},
  });
  if (challenge.open)
    throw Error(
      "The prize challenge is open. Preserve this deployment; deploy a new ruleset instead of upgrading it.",
    );
}
await a.signAndSendTransaction({
  receiverId: key.accountId,
  actions: [
    actions.deployContract(code),
    ...(!upgrade
      ? [
          actions.functionCall(
            "new",
            { sponsor: key.accountId },
            100000000000000n,
            0n,
          ),
        ]
      : []),
  ],
  waitUntil: "FINAL",
});
const state = await a.getState();
const config = {
  contractId: key.accountId,
  rpcUrl: "https://test.rpc.fastnear.com",
  fallbackRpcUrl: "https://rpc.testnet.near.org",
  codeHash: state.codeHash,
  network: "testnet",
};
await writeFile("public/moon-config.json", JSON.stringify(config, null, 2));
const old = await readFile(".dev.vars", "utf8").catch(() => "");
const vars = new Map(
  old
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);
vars.set("MOON_SPONSOR_ID", key.accountId);
vars.set("MOON_SPONSOR_KEY", key.secretKey);
vars.set("MOON_CONTRACT_ID", key.accountId);
if (!vars.has("BETTER_AUTH_SECRET"))
  vars.set("BETTER_AUTH_SECRET", randomBytes(32).toString("hex"));
await writeFile(
  ".dev.vars",
  [...vars].map(([k, v]) => `${k}=${v}`).join("\n") + "\n",
  { mode: 0o600 },
);
await chmod(".dev.vars", 0o600);
await writeFile(
  "public/moon-build.json",
  JSON.stringify(
    {
      version: "moonpark-v2",
      contractSha256: createHash("sha256").update(code).digest("hex"),
      engineSha256: createHash("sha256")
        .update(await readFile("public/engine/moon.wasm"))
        .digest("hex"),
      codeHash: state.codeHash,
      prizeChallengeOpen: false,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    ...config,
    publicPrizeChallenge: "not-open-during-gameplay-playtest",
  }),
);
