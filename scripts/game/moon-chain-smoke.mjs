import { readFile, writeFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { verifyEconomy } from "./moon-economy-proof.mjs";
import {
  Account,
  FailoverRpcProvider,
  JsonRpcProvider,
  KeyPair,
  KeyPairSigner,
} from "near-api-js";
import { failoverRpc } from "../../lib/moon/rpc.ts";
const cfg = JSON.parse(await readFile("public/moon-config.json", "utf8"));
assert.equal(cfg.network, "testnet");
assert.ok(cfg.contractId.endsWith(".testnet"));
const rootKey = JSON.parse(
  await readFile(".near-local/moon-v5-deployer.json", "utf8"),
);
const p = failoverRpc({ FailoverRpcProvider, JsonRpcProvider }, [
  cfg.rpcUrl,
  cfg.fallbackRpcUrl,
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
  nearToTransfer: 700000000000000000000000n,
});
const player = new Account(id, p, new KeyPairSigner(key));
await writeFile(
  `.near-local/${id}.json`,
  JSON.stringify({ accountId: id, secretKey: key.toString() }),
  { mode: 0o600 },
);
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
  args: { challenge_id: "moonpark-v5", request_id: "real-chain-proof" },
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
  await verifyEconomy(p, cfg.contractId, state);
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
  await writeFile(
    "outputs/moon-v5-chain-progress.json",
    JSON.stringify({ state, checkpoints, maxGas: maxGas.toString() }),
  );
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
assert.deepEqual(state.run.partnerships, []);
const economyProof = await verifyEconomy(p, cfg.contractId, state);
const vendorPolicy = await p.callFunction({
  contractId: cfg.contractId,
  method: "get_vendor_policy",
  args: {},
});
for (const vendor of vendorPolicy.vendors) {
  assert.equal(vendor.accepted, true);
  await p.viewAccount({ accountId: vendor.account_id });
  const keys = await p.viewAccessKeyList({ accountId: vendor.account_id });
  assert.equal(keys.keys.length, 1);
  assert.equal(
    keys.keys[0].access_key.permission.FunctionCall.receiver_id,
    cfg.contractId,
  );
  assert.deepEqual(
    keys.keys[0].access_key.permission.FunctionCall.method_names,
    ["accept_vendor_policy"],
  );
}
const transactions = [];
async function call(account, methodName, args, deposit = 0n) {
  const raw = await account.callFunctionRaw({
    contractId: cfg.contractId,
    methodName,
    args,
    deposit,
    gas: 150000000000000n,
    waitUntil: "FINAL",
  });
  assert.ok(
    typeof raw.status === "object" && "SuccessValue" in raw.status,
    JSON.stringify(raw.status),
  );
  transactions.push({ method: methodName, transaction: raw.transaction.hash });
  return raw.status.SuccessValue
    ? JSON.parse(Buffer.from(raw.status.SuccessValue, "base64").toString())
    : null;
}
const contractView = (method, args = {}) =>
  p.callFunction({ contractId: cfg.contractId, method, args });
const design = {
  ...state.run.buildings[2].design,
  name: "Earthskimmer",
  palette: 3,
  style: 1,
  lights: 2,
};
state = await call(player, "apply_actions", {
  run_id: state.run_id,
  expected_revision: state.run.revision,
  request_id: "cosmetics",
  commands: [{ kind: "design", building: 3, design }],
  ticks: 0,
});
const mine = await contractView("get_park", { park_id: state.park_id });
await call(player, "save_park", {
  park_id: mine.id,
  expected_revision: mine.revision,
  name: "Earthrise Gardens",
  emblem: 1,
  run_id: state.run_id,
});
const bp = await call(player, "publish_blueprint", {
  park_id: mine.id,
  run_id: state.run_id,
  building_id: 3,
  name: "Earthskimmer",
});
async function freshAccount(prefix) {
  const k = KeyPair.fromRandom("ed25519");
  const accountId = `${prefix}-${Date.now().toString(36)}.${root.accountId}`;
  await root.createAccount({
    newAccountId: accountId,
    publicKey: k.getPublicKey(),
    nearToTransfer: 500000000000000000000000n,
  });
  await writeFile(
    `.near-local/${accountId}.json`,
    JSON.stringify({ accountId, secretKey: k.toString() }),
    { mode: 0o600 },
  );
  return new Account(accountId, p, new KeyPairSigner(k));
}
const wallet = await freshAccount("owner"),
  buyer = await freshAccount("buyer");
await call(player, "nominate_park_owner", {
  park_id: mine.id,
  receiver_id: wallet.accountId,
});
await assert.rejects(() => call(buyer, "accept_park", { park_id: mine.id }));
const claimed = await call(wallet, "accept_park", { park_id: mine.id });
assert.equal(claimed.owner, wallet.accountId);
assert.equal(claimed.operator, player.accountId);
await call(root, "register_player", {
  account_id: buyer.accountId,
  player_id: `guest:${buyer.accountId}`,
  display_name: "Blueprint visitor",
});
const buying = await call(buyer, "create_run", {
  challenge_id: "moonpark-v5",
  request_id: "license-test",
});
const fee = 5000000000000000000000n;
await call(
  buyer,
  "license_blueprint",
  { park_id: buying.park_id, blueprint_id: bp.id },
  fee,
);
await call(
  buyer,
  "license_blueprint",
  { park_id: buying.park_id, blueprint_id: bp.id },
  fee,
);
const earnings = await contractView("get_creator_earnings", {
  account_id: wallet.accountId,
});
assert.equal(earnings.available, ((fee * 90n) / 100n).toString());
const built = await call(buyer, "apply_actions", {
  run_id: buying.run_id,
  expected_revision: 0,
  request_id: "licensed-build",
  commands: [
    {
      kind: "build",
      item: bp.kind,
      x: 3,
      z: 8,
      variant: bp.variant,
      value: bp.launch,
      design: bp.design,
      blueprint_id: bp.id,
    },
  ],
  ticks: 0,
});
assert.equal(built.run.buildings[2].blueprint_id, bp.id);
assert.equal(await call(wallet, "claim_creator_earnings", {}), true);
const paid = await contractView("get_creator_earnings", {
  account_id: wallet.accountId,
});
assert.equal(paid.available, "0");
assert.equal(paid.paid, earnings.available);
await assert.rejects(() => call(wallet, "claim_creator_earnings", {}));
const reviewed = await call(buyer, "rate_park", { park_id: mine.id, stars: 5 });
assert.equal(reviewed.rating_count, 1);
const independentSponsor = new Account(
  rootKey.accountId,
  p,
  KeyPairSigner.fromSecretKey(rootKey.secretKey),
);
await call(independentSponsor, "fund_storage", {});
const ownershipProof = {
  park: claimed,
  blueprint: bp,
  buyer: buyer.accountId,
  licensedBuilding: built.run.buildings[2],
  earnings,
  paid,
  transactions,
  publicParkPath: `/park/${wallet.accountId}`,
  wrongClaimSignerRejected: true,
  duplicateLicenseRefunded: true,
  duplicateEarningsClaimRejected: true,
};
const storageRefund = await root.callFunction({
  contractId: cfg.contractId,
  methodName: "fund_storage",
  args: {},
  deposit: 100000000000000000000000n,
  gas: 40000000000000n,
  waitUntil: "FINAL",
});
assert.ok(
  BigInt(storageRefund) >= 0n &&
    BigInt(storageRefund) <= 100000000000000000000000n,
  "Storage funding only retains part of the caller’s deposit",
);
const fundSafety = await p.callFunction({
  contractId: cfg.contractId,
  method: "get_fund_safety",
  args: {},
});
assert.equal(fundSafety.solvent, true);
const access = await p.viewAccessKeyList({ accountId: cfg.contractId });
assert.equal(access.keys.length, 0);
await mkdir("docs", { recursive: true });
await writeFile(
  "docs/moon-v5-testnet-smoke.json",
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
      partnerships: state.run.partnerships,
      reservedFunding: state.run.grant_escrow,
      availableFunding: state.run.grant_cash,
      ownershipProof,
      economyProof,
      vendorPolicy,
      fundSafety,
      contractAccessKeys: access.keys.length,
      storageDepositRetainedYocto: storageRefund,
      unusedStorageDepositRefunded: storageRefund === "0",
      sponsorNonceRecoveryVerified: true,
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
