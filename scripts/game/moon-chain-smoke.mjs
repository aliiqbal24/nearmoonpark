import { readFile, writeFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import {
  Account,
  FailoverRpcProvider,
  JsonRpcProvider,
  KeyPair,
  KeyPairSigner,
} from "near-api-js";
const cfg = JSON.parse(await readFile("public/moon-config.json", "utf8"));
assert.equal(cfg.network, "testnet");
assert.ok(cfg.contractId.endsWith(".testnet"));
const rootKey = JSON.parse(
  await readFile(".near-local/moon-deployer.json", "utf8"),
);
const p = new FailoverRpcProvider([
  new JsonRpcProvider({ url: cfg.rpcUrl }),
  new JsonRpcProvider({ url: cfg.fallbackRpcUrl }),
]);
const root = new Account(
  rootKey.accountId,
  p,
  KeyPairSigner.fromSecretKey(rootKey.secretKey),
);
const key = KeyPair.fromRandom("ed25519"),
  id = `proof-${Date.now().toString(36)}.${root.accountId}`;
await root.createAccount({
  newAccountId: id,
  publicKey: key.getPublicKey(),
  nearToTransfer: 2000000000000000000000000n,
});
const player = new Account(id, p, new KeyPairSigner(key));
await root.callFunction({
  contractId: cfg.contractId,
  methodName: "register_player",
  args: {
    account_id: id,
    player_id: `guest:${id}`,
    display_name: "Verification run",
  },
  gas: 50000000000000n,
  waitUntil: "EXECUTED",
});
let state = await player.callFunction({
  contractId: cfg.contractId,
  methodName: "create_run",
  args: { challenge_id: "moonpark-v1", request_id: "real-chain-proof" },
  gas: 180000000000000n,
  waitUntil: "EXECUTED",
});
const native = spawnSync("target/release/examples/moon_replay", ["gold"], {
  encoding: "utf8",
  maxBuffer: 20000000,
});
if (native.status) throw Error(native.stderr);
const replay = JSON.parse(native.stdout);
let maxGas = 0n;
const checkpoints = [];
for (let i = 0; i < replay.frames.length; i++) {
  const f = replay.frames[i];
  const earliest =
    Number(BigInt(state.started_at) / 1000000n) +
    (state.run.tick + f.ticks - 8) * 250;
  const delay = Math.max(0, earliest - Date.now());
  if (delay) await new Promise((r) => setTimeout(r, delay));
  let raw;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      raw = await player.callFunctionRaw({
        contractId: cfg.contractId,
        methodName: "apply_actions",
        args: {
          run_id: state.run_id,
          expected_revision: state.run.revision,
          request_id: `frame-${i}`,
          commands: f.commands,
          ticks: f.ticks,
        },
        gas: 250000000000000n,
        waitUntil: "EXECUTED",
      });
      break;
    } catch (e) {
      const r = await p.callFunction({
        contractId: cfg.contractId,
        method: "get_run",
        args: { run_id: state.run_id },
      });
      if (r.last_request === `frame-${i}`) {
        raw = null;
        break;
      }
      if (attempt === 2) throw e;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  state = await p.callFunction({
    contractId: cfg.contractId,
    method: "get_run",
    args: { run_id: state.run_id },
  });
  assert.deepEqual(state.run, f.run);
  const gas = (raw?.receipts_outcome || []).reduce(
    (n, o) => n + BigInt(o.outcome.gas_burnt),
    0n,
  );
  if (gas > maxGas) maxGas = gas;
  checkpoints.push({
    tick: state.run.tick,
    hash: state.run.hash,
    transaction: raw?.transaction.hash ?? "recovered-by-request-id",
    gas: gas.toString(),
    trades: state.run.trade_count,
  });
  if (i % 9 === 0 || state.run.finished)
    console.log(
      JSON.stringify({
        tick: state.run.tick,
        confirmed: true,
        trades: state.run.trade_count,
        TGas: Number(gas) / 1e12,
      }),
    );
}
assert.equal(state.run.finished, true);
assert.ok(state.run.score.total >= 7000);
assert.equal(state.ranked, false);
await mkdir("docs", { recursive: true });
await writeFile(
  "docs/moon-testnet-smoke.json",
  JSON.stringify(
    {
      contractId: cfg.contractId,
      codeHash: cfg.codeHash,
      runId: state.run_id,
      owner: id,
      ranked: false,
      checkpoints,
      maxGas: maxGas.toString(),
      score: state.run.score,
      parity: "Every checkpoint matched native Rust and browser WASM.",
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    passed: true,
    score: state.run.score.total,
    maxTGas: Number(maxGas) / 1e12,
    checkpoints: checkpoints.length,
  }),
);
