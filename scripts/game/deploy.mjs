import {
  Account,
  JsonRpcProvider,
  KeyPair,
  KeyPairSigner,
  actions,
  PublicKey,
} from "near-api-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const dir = ".near-local";
await mkdir(dir, { recursive: true });
let key;
try {
  key = JSON.parse(await readFile(`${dir}/deployer.json`, "utf8"));
} catch {
  const pair = KeyPair.fromRandom("ed25519");
  key = {
    accountId: `last-signal-${Date.now().toString(36)}.testnet`,
    secretKey: pair.toString(),
  };
  await writeFile(`${dir}/deployer.json`, JSON.stringify(key), { mode: 0o600 });
}
const provider = new JsonRpcProvider({
  url: process.env.NEAR_RPC_URL || "https://test.rpc.fastnear.com",
});
const pair = KeyPair.fromString(key.secretKey);
const account = new Account(key.accountId, provider, new KeyPairSigner(pair));
try {
  await account.getState();
} catch {
  const r = await fetch("https://helper.nearprotocol.com/account", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      newAccountId: key.accountId,
      newAccountPublicKey: pair.getPublicKey().toString(),
    }),
  });
  if (!r.ok)
    throw Error(`Faucet ${r.status}: ${(await r.text()).slice(0, 300)}`);
  console.log("Faucet funded", key.accountId);
}
const code = new Uint8Array(
  await readFile(
    "target/wasm32-unknown-unknown/release/last_signal_contract.wasm",
  ),
);
await account.signAndSendTransaction({
  receiverId: key.accountId,
  actions: process.argv.includes("--upgrade")
    ? [actions.deployContract(code)]
    : [
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
const state = await account.getState();
const config = {
  contractId: key.accountId,
  rpcUrl: "https://test.rpc.fastnear.com",
  fallbackRpcUrl: "https://rpc.testnet.near.org",
  codeHash: state.codeHash,
  network: "testnet",
};
await writeFile("public/near-config.json", JSON.stringify(config, null, 2));
await writeFile(
  ".dev.vars",
  `NEAR_SPONSOR_ID=${key.accountId}\nNEAR_SPONSOR_KEY=${key.secretKey}\nNEAR_CONTRACT_ID=${key.accountId}\n`,
  { mode: 0o600 },
);
console.log(JSON.stringify(config));
