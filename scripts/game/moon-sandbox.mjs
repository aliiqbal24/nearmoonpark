import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { verifyEconomy } from "./moon-economy-proof.mjs";
const tmp = resolve(".sites-runtime/moon-sandbox");
await mkdir(tmp, { recursive: true });
process.env.TMPDIR = tmp;
const { Sandbox, DEFAULT_ACCOUNT_ID, DEFAULT_PRIVATE_KEY } =
  await import("near-sandbox");
const { Account, JsonRpcProvider, KeyPair, KeyPairSigner } =
  await import("near-api-js");
// Keep the cutoff jump inside one epoch; advancing thousands of validator epochs
// would test node maintenance rather than the contract's prize deadline.
const sandbox = await Sandbox.start({
  config: { additionalGenesis: { epoch_length: 10000000 } },
});
try {
  const p = new JsonRpcProvider({ url: sandbox.rpcUrl }),
    root = new Account(
      DEFAULT_ACCOUNT_ID,
      p,
      KeyPairSigner.fromSecretKey(DEFAULT_PRIVATE_KEY),
    );
  const accounts = [];
  for (const name of ["moon", "alice", "bob", "charlie"]) {
    const key = KeyPair.fromRandom("ed25519"),
      id = `${name}.${root.accountId}`;
    await root.createAccount({
      newAccountId: id,
      publicKey: key.getPublicKey(),
      nearToTransfer: 50000000000000000000000000n,
    });
    accounts.push(new Account(id, p, new KeyPairSigner(key)));
  }
  const [contract, alice, bob, charlie] = accounts;
  await contract.deployContract(
    new Uint8Array(
      await readFile(
        "target/wasm32-unknown-unknown/release/moonpark_contract.wasm",
      ),
    ),
  );
  const call = (a, methodName, args, deposit = 0n) =>
    a.callFunction({
      contractId: contract.accountId,
      methodName,
      args,
      deposit,
      gas: 250000000000000n,
      waitUntil: "FINAL",
    });
  await call(root, "new", { sponsor: root.accountId });
  for (const role of ["omar", "mina", "logistics"]) {
    const key = KeyPair.fromRandom("ed25519"),
      id = `${role}.${root.accountId}`;
    await root.createAccount({
      newAccountId: id,
      publicKey: key.getPublicKey(),
      nearToTransfer: 1000000000000000000000000n,
    });
    await call(
      new Account(id, p, new KeyPairSigner(key)),
      "accept_vendor_policy",
      { policy_id: "moonpark-v8-persistent-vendors-1" },
    );
  }
  await call(root, "fund_prizes", {}, 500000000000000000000000n);
  await call(root, "register_player", {
    account_id: alice.accountId,
    player_id: "opaque-alice",
    display_name: "Alice",
  });
  await call(root, "open_challenge", {});
  let state = await call(alice, "create_run", {
    challenge_id: "moonpark-v8",
    request_id: "sandbox",
  });
  assert.deepEqual(
    state,
    await call(alice, "create_run", {
      challenge_id: "moonpark-v8",
      request_id: "sandbox",
    }),
  );
  await assert.rejects(() =>
    call(bob, "apply_actions", {
      run_id: state.run_id,
      expected_revision: 0,
      request_id: "bad",
      commands: [],
      ticks: 1,
    }),
  );
  const openingAssets = await verifyEconomy(p, contract.accountId, state);
  await assert.rejects(() =>
    call(
      alice,
      "mt_transfer",
      {
        receiver_id: `omar.${root.accountId}`,
        token_id: `${state.run_id}:credits`,
        amount: "1",
        approval: null,
        memo: null,
      },
      1n,
    ),
  );
  assert.deepEqual(
    await verifyEconomy(p, contract.accountId, state),
    openingAssets,
  );
  const native = spawnSync("target/release/examples/moon_replay", ["gold"], {
    encoding: "utf8",
    maxBuffer: 20000000,
  });
  if (native.status) throw Error(native.stderr);
  const replay = JSON.parse(native.stdout),
    rows = [];
  let maxGas = 0n,
    totalGas = 0n;
  const engine = new WebAssembly.Instance(
    await WebAssembly.compile(await readFile("public/engine/moon.wasm")),
    {},
  ).exports;
  const simulate = (run, commands, ticks) => {
    const bytes = new TextEncoder().encode(
        JSON.stringify({ op: "step", run, commands, ticks }),
      ),
      p = engine.sim_alloc(bytes.length);
    new Uint8Array(engine.memory.buffer, p, bytes.length).set(bytes);
    const out = engine.sim_call(p, bytes.length);
    engine.sim_free(p, bytes.length);
    const ptr = Number(out >> 32n),
      len = Number(out & 0xffffffffn);
    const result = JSON.parse(
      new TextDecoder().decode(new Uint8Array(engine.memory.buffer, ptr, len)),
    );
    engine.sim_free(ptr, len);
    if (result.error) throw Error(result.error);
    return result.run;
  };
  for (let i = 0; i < replay.frames.length; i++) {
    const f = { ...replay.frames[i] };
    if (
      i + 1 < replay.frames.length &&
      replay.frames[i + 1].commands.length === 0
    ) {
      f.ticks = 20;
      i++;
    }
    const expected = simulate(state.run, f.commands, f.ticks);
    let header = (await p.viewBlock({ finality: "final" })).header;
    while (
      (BigInt(header.timestamp_nanosec) - BigInt(state.started_at)) /
        1000000000n +
        10n <
      BigInt(state.run.tick + f.ticks)
    ) {
      const r = await fetch(sandbox.rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "ff",
          method: "sandbox_fast_forward",
          params: { delta_height: 5 },
        }),
      });
      const v = await r.json();
      if (v.error) throw Error(JSON.stringify(v.error));
      header = (await p.viewBlock({ finality: "final" })).header;
    }
    const args = {
      run_id: state.run_id,
      expected_revision: state.run.revision,
      request_id: `frame-${i}`,
      commands: f.commands,
      ticks: f.ticks,
    };
    const raw = await alice.callFunctionRaw({
      contractId: contract.accountId,
      methodName: "apply_actions",
      args,
      gas: 250000000000000n,
      waitUntil: "FINAL",
    });
    state = await p.callFunction({
      contractId: contract.accountId,
      method: "get_run",
      args: { run_id: state.run_id },
    });
    assert.deepEqual(state.run, expected);
    await verifyEconomy(p, contract.accountId, state);
    const gas = (raw.receipts_outcome || []).reduce(
      (n, o) => n + BigInt(o.outcome.gas_burnt),
      0n,
    );
    maxGas = gas > maxGas ? gas : maxGas;
    totalGas += gas;
    rows.push({
      tick: state.run.tick,
      gas: gas.toString(),
      hash: state.run.hash,
    });
    if (i % 12 === 0)
      console.log(`Sandbox: ${state.run.tick}/550, ${Number(gas) / 1e12} TGas`);
  }
  assert.equal(state.run.finished, true);
  assert.deepEqual(state.run.partnerships, []);
  const economyProof = await verifyEconomy(p, contract.accountId, state);
  const board = await p.callFunction({
    contractId: contract.accountId,
    method: "get_leaderboard",
    args: {},
  });
  assert.equal(board.entries[0].score.total, state.run.score.total);
  const design = {
    ...state.run.buildings[0].design,
    name: "Earthskimmer",
    palette: 3,
    style: 1,
    lights: 2,
  };
  state = await call(alice, "apply_actions", {
    run_id: state.run_id,
    expected_revision: state.run.revision,
    request_id: "cosmetics",
    commands: [{ kind: "design", building: 1, design }],
    ticks: 0,
  });
  const mine = await p.callFunction({
    contractId: contract.accountId,
    method: "get_park",
    args: { park_id: state.park_id },
  });
  const published = await call(alice, "save_park", {
    park_id: mine.id,
    expected_revision: mine.revision,
    name: "Earthrise Gardens",
    emblem: 1,
    run_id: state.run_id,
  });
  const bp = await call(alice, "publish_blueprint", {
    park_id: mine.id,
    run_id: state.run_id,
    building_id: 1,
    name: "Earthskimmer",
  });
  await call(alice, "nominate_park_owner", {
    park_id: mine.id,
    receiver_id: charlie.accountId,
  });
  await assert.rejects(() => call(bob, "accept_park", { park_id: mine.id }));
  const claimed = await call(charlie, "accept_park", { park_id: mine.id });
  assert.equal(claimed.owner, charlie.accountId);
  assert.equal(claimed.operator, alice.accountId);
  await call(root, "register_player", {
    account_id: bob.accountId,
    player_id: "guest:bob",
    display_name: "Bob",
  });
  const buyer = await call(bob, "create_run", {
    challenge_id: "moonpark-v8",
    request_id: "buyer",
  });
  await assert.rejects(() =>
    call(bob, "license_blueprint", {
      park_id: buyer.park_id,
      blueprint_id: bp.id,
    }),
  );
  const fee = 5000000000000000000000n;
  await call(
    bob,
    "license_blueprint",
    { park_id: buyer.park_id, blueprint_id: bp.id },
    fee,
  );
  await call(
    bob,
    "license_blueprint",
    { park_id: buyer.park_id, blueprint_id: bp.id },
    fee,
  );
  const earned = await p.callFunction({
    contractId: contract.accountId,
    method: "get_creator_earnings",
    args: { account_id: charlie.accountId },
  });
  assert.equal(earned.available, ((fee * 90n) / 100n).toString());
  const built = await call(bob, "apply_actions", {
    run_id: buyer.run_id,
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
  assert.equal(built.run.buildings[0].blueprint_id, bp.id);
  const beforeCreator = (await charlie.getState()).balance.total;
  assert.equal(await call(charlie, "claim_creator_earnings", {}), true);
  assert.ok((await charlie.getState()).balance.total > beforeCreator);
  await assert.rejects(() => call(charlie, "claim_creator_earnings", {}));
  await assert.rejects(() =>
    call(bob, "on_creator_paid", { owner: charlie.accountId, amount: "1" }),
  );
  const reviewed = await call(bob, "rate_park", { park_id: mine.id, stars: 5 });
  assert.equal(reviewed.rating_count, 1);
  const ownershipProof = {
    published,
    blueprint: bp,
    claimed,
    licensedBuilding: built.run.buildings[0],
    creatorEarnings: earned,
    privateCallbackRejected: true,
    duplicateLicenseRefunded: true,
  };
  const sealedScore = structuredClone(state.run.score);
  const publishedSnapshot = await p.callFunction({
    contractId: contract.accountId,
    method: "get_park_snapshot",
    args: { park_id: mine.id },
  });
  const originalSupply = state.run.money_supply;
  for (let n = 0; n < 6; n++) {
    const expected = simulate(state.run, [], 20);
    let header = (await p.viewBlock({ finality: "final" })).header;
    while (
      (BigInt(header.timestamp_nanosec) - BigInt(state.started_at)) /
        1000000000n +
        10n <
      BigInt(expected.tick)
    ) {
      await fetch(sandbox.rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "persistent-clock",
          method: "sandbox_fast_forward",
          params: { delta_height: 10 },
        }),
      });
      header = (await p.viewBlock({ finality: "final" })).header;
    }
    const raw = await alice.callFunctionRaw({
      contractId: contract.accountId,
      methodName: "apply_actions",
      args: {
        run_id: state.run_id,
        expected_revision: state.run.revision,
        request_id: `persistent-${n}`,
        commands: [],
        ticks: 20,
      },
      gas: 250000000000000n,
      waitUntil: "FINAL",
    });
    state = await p.callFunction({
      contractId: contract.accountId,
      method: "get_run",
      args: { run_id: state.run_id },
    });
    assert.deepEqual(state.run, expected);
    assert.deepEqual(state.run.score, sealedScore);
    await verifyEconomy(p, contract.accountId, state);
    const gas = raw.receipts_outcome.reduce(
      (n, o) => n + BigInt(o.outcome.gas_burnt),
      0n,
    );
    maxGas = gas > maxGas ? gas : maxGas;
  }
  assert.ok(state.run.money_supply > originalSupply);
  assert.deepEqual(
    await p.callFunction({
      contractId: contract.accountId,
      method: "get_park_snapshot",
      args: { park_id: mine.id },
    }),
    publishedSnapshot,
  );
  await assert.rejects(() =>
    call(
      alice,
      "mt_transfer",
      {
        receiver_id: bob.accountId,
        token_id: `${state.run_id}:credits`,
        amount: "100",
        approval: null,
        memo: null,
      },
      1n,
    ),
  );
  const transferProof = {
    ongoingSettlement: true,
    touristIssuanceVerified: true,
    scoreSealed: true,
    publishedSnapshotImmutable: true,
    operatingAssetsLocked: true,
  };
  const cutoff = 1795046340000000000n;
  let finalHeader = (await p.viewBlock({ finality: "final" })).header;
  for (
    let attempt = 0;
    BigInt(finalHeader.timestamp_nanosec) <= cutoff && attempt < 4;
    attempt++
  ) {
    // Use a conservative 100ms lower bound for Sandbox block intervals. Finality needs a few blocks
    // after fast-forward before its new timestamp appears in final queries.
    const jump =
      Number((cutoff - BigInt(finalHeader.timestamp_nanosec)) / 100000000n) +
      1000;
    const beforeHeight = finalHeader.height;
    const response = await fetch(sandbox.rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "prize-cutoff",
        method: "sandbox_fast_forward",
        params: { delta_height: jump },
      }),
    });
    const result = await response.json();
    if (result.error) throw Error(JSON.stringify(result.error));
    for (let poll = 0; poll < 40; poll++) {
      finalHeader = (await p.viewBlock({ finality: "final" })).header;
      if (finalHeader.height >= beforeHeight + jump) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    console.log(
      JSON.stringify({
        cutoffJump: jump,
        height: finalHeader.height,
        chainTime: new Date(
          Number(BigInt(finalHeader.timestamp_nanosec) / 1000000n),
        ).toISOString(),
      }),
    );
  }
  assert.ok(BigInt(finalHeader.timestamp_nanosec) > cutoff);
  await call(root, "activate_prizes", { tier: "track" });
  const prize = await p.callFunction({
    contractId: contract.accountId,
    method: "get_prize_claim",
    args: { account_id: alice.accountId },
  });
  assert.equal(prize.claimable_yocto, "500000000000000000000000");
  assert.equal(await call(alice, "claim_prize", {}), true);
  await assert.rejects(() => call(alice, "claim_prize", {}));
  const collectedPrize = await p.callFunction({
    contractId: contract.accountId,
    method: "get_prize_claim",
    args: { account_id: alice.accountId },
  });
  assert.equal(collectedPrize.paid_yocto, "500000000000000000000000");
  assert.equal(collectedPrize.claimable_yocto, "0");
  ownershipProof.collectedPrize = collectedPrize;
  await assert.rejects(() =>
    call(alice, "apply_actions", {
      run_id: state.run_id,
      expected_revision: 0,
      request_id: "stale",
      commands: [],
      ticks: 1,
    }),
  );
  await mkdir("outputs", { recursive: true });
  await writeFile(
    "outputs/moon-sandbox.json",
    JSON.stringify(
      {
        maxGas: maxGas.toString(),
        totalGas: totalGas.toString(),
        frames: rows,
        score: state.run.score,
        leaderboard: board,
        ownershipProof,
        economyProof,
        transferProof,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      passed: true,
      frames: rows.length,
      maxTGas: Number(maxGas) / 1e12,
      totalNEARAtMinimumGas: Number(totalGas) * 1e-16,
      score: state.run.score.total,
    }),
  );
} finally {
  await sandbox.tearDown();
}
