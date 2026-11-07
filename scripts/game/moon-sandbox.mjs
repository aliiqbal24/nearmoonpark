import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
const tmp = resolve(".sites-runtime/moon-sandbox");
await mkdir(tmp, { recursive: true });
process.env.TMPDIR = tmp;
const { Sandbox, DEFAULT_ACCOUNT_ID, DEFAULT_PRIVATE_KEY } = await import(
  "near-sandbox"
);
const { Account, JsonRpcProvider, KeyPair, KeyPairSigner } = await import(
  "near-api-js"
);
const sandbox = await Sandbox.start({});
try {
  const p = new JsonRpcProvider({ url: sandbox.rpcUrl }),
    root = new Account(
      DEFAULT_ACCOUNT_ID,
      p,
      KeyPairSigner.fromSecretKey(DEFAULT_PRIVATE_KEY),
    );
  const accounts = [];
  for (const name of ["moon", "alice", "bob"]) {
    const key = KeyPair.fromRandom("ed25519"),
      id = `${name}.${root.accountId}`;
    await root.createAccount({
      newAccountId: id,
      publicKey: key.getPublicKey(),
      nearToTransfer: 50000000000000000000000000n,
    });
    accounts.push(new Account(id, p, new KeyPairSigner(key)));
  }
  const [contract, alice, bob] = accounts;
  await contract.deployContract(
    new Uint8Array(
      await readFile(
        "target/wasm32-unknown-unknown/release/moonpark_contract.wasm",
      ),
    ),
  );
  const call = (a, methodName, args) =>
    a.callFunction({
      contractId: contract.accountId,
      methodName,
      args,
      gas: 250000000000000n,
      waitUntil: "FINAL",
    });
  await call(root, "new", { sponsor: root.accountId });
  await call(root, "register_player", {
    account_id: alice.accountId,
    player_id: "opaque-alice",
    display_name: "Alice",
  });
  await call(root, "open_challenge", {});
  let state = await call(alice, "create_run", {
    challenge_id: "moonpark-v2",
    request_id: "sandbox",
  });
  assert.deepEqual(
    state,
    await call(alice, "create_run", {
      challenge_id: "moonpark-v2",
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
  const native = spawnSync("target/release/examples/moon_replay", ["gold"], {
    encoding: "utf8",
    maxBuffer: 20000000,
  });
  if (native.status) throw Error(native.stderr);
  const replay = JSON.parse(native.stdout),
    rows = [];
  let maxGas = 0n,
    totalGas = 0n;
  const engine=new WebAssembly.Instance(await WebAssembly.compile(await readFile("public/engine/moon.wasm")),{}).exports;
  const simulate=(run,commands,ticks)=>{const bytes=new TextEncoder().encode(JSON.stringify({op:"step",run,commands,ticks})),p=engine.sim_alloc(bytes.length);new Uint8Array(engine.memory.buffer,p,bytes.length).set(bytes);const out=engine.sim_call(p,bytes.length);engine.sim_free(p,bytes.length);const ptr=Number(out>>32n),len=Number(out&0xffffffffn);const result=JSON.parse(new TextDecoder().decode(new Uint8Array(engine.memory.buffer,ptr,len)));engine.sim_free(ptr,len);if(result.error)throw Error(result.error);return result.run;};
  for (let i = 0; i < replay.frames.length; i++) {
    const f = {...replay.frames[i]};
    if(i+1<replay.frames.length&&replay.frames[i+1].commands.length===0){f.ticks=20;i++;}
    const expected=simulate(state.run,f.commands,f.ticks);
    let header = (await p.viewBlock({ finality: "final" })).header;
    while (
      ((BigInt(header.timestamp_nanosec) - BigInt(state.started_at)) * 4n) /
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
      console.log(`Sandbox: ${state.run.tick}/540, ${Number(gas) / 1e12} TGas`);
  }
  assert.equal(state.run.finished, true);
  assert.ok(state.run.partnerships.every(p=>p.status==="completed"));
  const deals=await p.callFunction({contractId:contract.accountId,method:"get_partnerships",args:{run_id:state.run_id}});
  assert.equal(deals.reserved_funding,0);
  assert.equal(deals.available_funding,0);
  const board = await p.callFunction({
    contractId: contract.accountId,
    method: "get_leaderboard",
    args: {},
  });
  assert.equal(board.entries[0].score.total, state.run.score.total);
  assert.equal(board.entries[0].player_id, "opaque-alice");
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
