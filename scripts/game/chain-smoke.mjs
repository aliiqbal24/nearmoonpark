import {
  Account,
  JsonRpcProvider,
  KeyPair,
  KeyPairSigner,
  actions,
  PublicKey,
} from "near-api-js";
import { readFile, writeFile } from "node:fs/promises";
const key = JSON.parse(await readFile(".near-local/deployer.json", "utf8"));
const config = JSON.parse(await readFile("public/near-config.json", "utf8"));
const { instance } = await WebAssembly.instantiate(
  await readFile("public/engine/sim.wasm"),
  {},
);
const engine = instance.exports;
function wasm(q) {
  const b = new TextEncoder().encode(JSON.stringify(q));
  const ptr = engine.sim_alloc(b.length);
  new Uint8Array(engine.memory.buffer, ptr, b.length).set(b);
  const out = engine.sim_call(ptr, b.length);
  engine.sim_free(ptr, b.length);
  const p = Number(out >> 32n),
    n = Number(out & 0xffffffffn);
  const s = new TextDecoder().decode(
    new Uint8Array(engine.memory.buffer, p, n),
  );
  engine.sim_free(p, n);
  return JSON.parse(s).run;
}
const assert = (await import("node:assert/strict")).default;
const p = new JsonRpcProvider({ url: config.rpcUrl });
const sponsor = new Account(
  key.accountId,
  p,
  KeyPairSigner.fromSecretKey(key.secretKey),
);
const session = KeyPair.fromRandom("ed25519"),
  recovery = KeyPair.fromRandom("ed25519"),
  id = `smoke${Date.now().toString(36)}.${key.accountId}`;
await sponsor.signAndSendTransaction({
  receiverId: id,
  actions: [
    actions.createAccount(),
    actions.transfer(500000000000000000000000n),
    actions.addFullAccessKey(recovery.getPublicKey()),
    actions.addFunctionCallAccessKey(
      session.getPublicKey(),
      config.contractId,
      ["create_run", "step"],
      400000000000000000000000n,
    ),
  ],
  waitUntil: "FINAL",
});
await sponsor.callFunction({
  contractId: config.contractId,
  methodName: "register_player",
  args: { account_id: id },
  waitUntil: "FINAL",
});
const player = new Account(id, p, new KeyPairSigner(session));
let state = await player.callFunction({
  contractId: config.contractId,
  methodName: "create_run",
  args: { scenario_id: "last-signal-v1", seed: 42, request_id: "smoke" },
  gas: 250000000000000n,
  waitUntil: "FINAL",
});
let expected = wasm({ op: "new", seed: 42 });
assert.deepEqual(state.run, expected);
let txs = [];
for (const option of [0, 1, 0, 0, 0, 0, 2, 0]) {
  const result = await player.callFunctionRaw({
    contractId: config.contractId,
    methodName: "step",
    args: {
      run_id: state.run_id,
      expected_revision: state.run.revision,
      command: { kind: "choice", option, target: 0 },
      max_sols: 3,
    },
    gas: 250000000000000n,
    waitUntil: "FINAL",
  });
  expected = wasm({
    op: "step",
    run: expected,
    command: { kind: "choice", option, target: 0 },
    max_sols: 3,
  });
  state = await p.callFunction({
    contractId: config.contractId,
    method: "get_run",
    args: { run_id: state.run_id },
  });
  assert.deepEqual(state.run, expected);
  txs.push({
    hash: result.transaction.hash,
    sol: state.run.sol,
    gas: result.receipts_outcome?.map((r) => r.outcome.gas_burnt),
  });
  console.log("sol", state.run.sol, "hash", state.run.hash.slice(0, 12));
}
console.log("Ending:", state.run.ending);
await writeFile(
  "docs/testnet-smoke.json",
  JSON.stringify(
    { contract: config.contractId, player: id, state, transactions: txs },
    null,
    2,
  ),
);
console.log("Chain smoke complete.");
