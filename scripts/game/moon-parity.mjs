import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
const e = new WebAssembly.Instance(
  await WebAssembly.compile(await readFile("public/engine/moon.wasm")),
  {},
).exports;
function sim(input) {
  const bytes = new TextEncoder().encode(JSON.stringify(input));
  const p = e.sim_alloc(bytes.length);
  new Uint8Array(e.memory.buffer, p, bytes.length).set(bytes);
  const out = e.sim_call(p, bytes.length);
  e.sim_free(p, bytes.length);
  const ptr = Number(out >> 32n),
    len = Number(out & 0xffffffffn);
  const value = JSON.parse(
    new TextDecoder().decode(new Uint8Array(e.memory.buffer, ptr, len)),
  );
  e.sim_free(ptr, len);
  if (value.error) throw Error(value.error);
  return value.run;
}
for (const strategy of ["idle", "coaster", "balanced", "family", "gold"]) {
  const native = spawnSync("target/release/examples/moon_replay", [strategy], {
    encoding: "utf8",
    maxBuffer: 20_000_000,
  });
  if (native.status) throw Error(native.stderr);
  const replay = JSON.parse(native.stdout);
  let run = sim({ op: "new" });
  let maxActive = 0;
  for (const f of replay.frames) {
    run = sim({ op: "step", run, commands: f.commands, ticks: f.ticks });
    assert.deepEqual(run, f.run);
    maxActive = Math.max(
      maxActive,
      run.guests.filter(
        (g) => !["upcoming", "gone", "cancelled"].includes(g.status),
      ).length,
    );
  }
  assert.equal(run.finished, true);
  assert.equal(run.tick, 550);
  assert.ok(run.score.total <= 10000);
  assert.ok(maxActive <= 48);
  if (strategy === "gold") assert.ok(run.score.total >= 7000);
  console.log(
    JSON.stringify({
      strategy,
      score: run.score,
      buildings: run.buildings.map((b) => b.kind),
      trades: run.trade_count,
      maxActive,
      parity: replay.frames.length,
    }),
  );
}
