import {
  Account,
  JsonRpcProvider,
  KeyPair,
  KeyPairSigner,
  actions,
  baseEncode,
} from "near-api-js";
import { mkdir, readFile, writeFile, chmod } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import assert from "node:assert/strict";
await mkdir(".near-local", { recursive: true });
const keyPath = ".near-local/moon-v5-deployer.json";
let key;
try {
  key = JSON.parse(await readFile(keyPath, "utf8"));
} catch {
  const pair = KeyPair.fromRandom("ed25519");
  key = {
    accountId: `moonpark-${Date.now().toString(36)}.testnet`,
    secretKey: pair.toString(),
  };
  await writeFile(keyPath, JSON.stringify(key), { mode: 0o600 });
}
assert.ok(
  key.accountId.endsWith(".testnet"),
  "This script only deploys to testnet",
);
if (process.argv.includes("--upgrade"))
  throw Error(
    "The economy contract is immutable. Deploy a separate version instead.",
  );
const provider = new JsonRpcProvider({ url: "https://test.rpc.fastnear.com" }),
  pair = KeyPair.fromString(key.secretKey),
  sponsor = new Account(key.accountId, provider, new KeyPairSigner(pair));
try {
  await sponsor.getState();
} catch (e) {
  if (!/does not exist|UNKNOWN_ACCOUNT|not found/i.test(String(e))) throw e;
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
const contractId = `game.${key.accountId}`;
const code = new Uint8Array(
  await readFile(
    "target/wasm32-unknown-unknown/release/moonpark_contract.wasm",
  ),
);
let exists = false;
try {
  await provider.viewAccount({ accountId: contractId });
  exists = true;
} catch (e) {
  if (!/does not exist|UNKNOWN_ACCOUNT|not found/i.test(String(e))) throw e;
}
if (!exists) {
  await sponsor.signAndSendTransaction({
    receiverId: contractId,
    actions: [
      actions.createAccount(),
      actions.transfer(10000000000000000000000000n),
      actions.deployContract(code),
      actions.functionCall(
        "new",
        { sponsor: key.accountId },
        100000000000000n,
        0n,
      ),
    ],
    waitUntil: "FINAL",
  });
}
const remote = await provider.viewAccount({ accountId: contractId });
assert.equal(
  remote.code_hash,
  baseEncode(createHash("sha256").update(code).digest()),
  "An immutable contract already exists with different code; use a new sponsor/deployment file.",
);
const access = await provider.viewAccessKeyList({ accountId: contractId });
assert.equal(
  access.keys.length,
  0,
  "Economy contract must have no access keys",
);
const call = (methodName, args = {}, deposit = 0n) =>
  sponsor.callFunction({
    contractId,
    methodName,
    args,
    deposit,
    gas: 100000000000000n,
    waitUntil: "FINAL",
  });
// Vendor accounts retain a single restricted policy key. It cannot move native
// NEAR, attach deposits, call another contract or arbitrarily transfer game assets.
key.vendors ??= {};
for (const role of ["omar", "mina", "logistics"]) {
  const accountId = `${role}.${key.accountId}`;
  if (!key.vendors[role]) {
    key.vendors[role] = {
      accountId,
      secretKey: KeyPair.fromRandom("ed25519").toString(),
    };
    await writeFile(keyPath, JSON.stringify(key), { mode: 0o600 });
  }
  const vendorKey = KeyPair.fromString(key.vendors[role].secretKey);
  let account;
  try {
    account = await provider.viewAccount({ accountId });
  } catch (error) {
    if (!/does not exist|UNKNOWN_ACCOUNT|not found/i.test(String(error)))
      throw error;
    await sponsor.signAndSendTransaction({
      receiverId: accountId,
      actions: [
        actions.createAccount(),
        actions.transfer(150000000000000000000000n),
        actions.addFunctionCallAccessKey(
          vendorKey.getPublicKey(),
          contractId,
          ["accept_vendor_policy"],
          100000000000000000000000n,
        ),
      ],
      waitUntil: "FINAL",
    });
    account = await provider.viewAccount({ accountId });
  }
  assert.equal(account.code_hash, "11111111111111111111111111111111");
  const keys = await provider.viewAccessKeyList({ accountId });
  assert.equal(keys.keys.length, 1);
  assert.equal(
    keys.keys[0].public_key.toString(),
    vendorKey.getPublicKey().toString(),
  );
  const permission = keys.keys[0].access_key.permission.FunctionCall;
  assert.equal(permission.receiver_id, contractId);
  assert.deepEqual(permission.method_names, ["accept_vendor_policy"]);
  const policy = await provider.callFunction({
    contractId,
    method: "get_vendor_policy",
    args: {},
  });
  if (!policy.vendors.find((v) => v.account_id === accountId)?.accepted) {
    const vendor = new Account(
      accountId,
      provider,
      new KeyPairSigner(vendorKey),
    );
    await vendor.callFunction({
      contractId,
      methodName: "accept_vendor_policy",
      args: { policy_id: policy.policy_id },
      gas: 30000000000000n,
      waitUntil: "FINAL",
    });
  }
}
const prizes = await provider.callFunction({
  contractId,
  method: "get_prize_snapshot",
  args: {},
});
if (prizes.escrow_yocto === "0")
  await call("fund_prizes", {}, 500000000000000000000000n);
let challenge = await provider.callFunction({
  contractId,
  method: "get_challenge",
  args: {},
});
assert.equal(challenge.id, "moonpark-v5");
if (process.argv.includes("--open") && !challenge.open) {
  await call("open_challenge");
  challenge = await provider.callFunction({
    contractId,
    method: "get_challenge",
    args: {},
  });
}
const state = await provider.viewAccount({ accountId: contractId });
const config = {
  contractId,
  rpcUrl: "https://test.rpc.fastnear.com",
  fallbackRpcUrl: "https://rpc.testnet.near.org",
  codeHash: state.code_hash,
  network: "testnet",
  immutable: true,
  vendors: Object.fromEntries(
    Object.entries(key.vendors).map(([role, vendor]) => [
      role,
      vendor.accountId,
    ]),
  ),
};
await writeFile(
  "public/moon-config.json",
  JSON.stringify(config, null, 2) + "\n",
);
const old = await readFile(".env.local", "utf8").catch(() => "");
const vars = new Map(
  old
    .split("\n")
    .filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);
vars.set("MOON_SPONSOR_ID", key.accountId);
vars.set("MOON_SPONSOR_KEY", key.secretKey);
vars.set("MOON_CONTRACT_ID", contractId);
if (!vars.get("NEON_AUTH_COOKIE_SECRET"))
  vars.set("NEON_AUTH_COOKIE_SECRET", randomBytes(48).toString("hex"));
await writeFile(
  ".env.local",
  [...vars].map(([k, v]) => `${k}=${v}`).join("\n") + "\n",
  { mode: 0o600 },
);
await chmod(".env.local", 0o600);
await writeFile(
  "public/moon-build.json",
  JSON.stringify(
    {
      version: "moonpark-v5",
      contractSha256: createHash("sha256").update(code).digest("hex"),
      engineSha256: createHash("sha256")
        .update(await readFile("public/engine/moon.wasm"))
        .digest("hex"),
      codeHash: state.code_hash,
      prizeChallengeOpen: challenge.open,
      immutable: true,
      contractAccessKeys: access.keys.length,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    ...config,
    sponsor: key.accountId,
    contractAccessKeys: 0,
    challengeOpen: challenge.open,
  }),
);
