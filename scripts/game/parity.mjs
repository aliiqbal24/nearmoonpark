import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
const { instance } = await WebAssembly.instantiate(
  await readFile("public/engine/sim.wasm"),
  {},
);
const e = instance.exports;
function wasm(q) {
  const data = new TextEncoder().encode(JSON.stringify(q));
  const p = e.sim_alloc(data.length);
  new Uint8Array(e.memory.buffer, p, data.length).set(data);
  const result = e.sim_call(p, data.length);
  e.sim_free(p, data.length);
  const ptr = Number(result >> 32n),
    len = Number(result & 0xffffffffn);
  const s = new TextDecoder().decode(new Uint8Array(e.memory.buffer, ptr, len));
  e.sim_free(ptr, len);
  return JSON.parse(s);
}
let count = 0;
for (const seed of [0, 42, 999]) {
  let run;
  for (const option of [null, 0, 1, 0, 0, 0, 0, 2, 0]) {
    const q =
      option === null
        ? { op: "new", seed }
        : {
            op: "step",
            run,
            command: { kind: "choice", option, target: 0 },
            max_sols: 3,
          };
    const native = spawnSync("target/release/examples/replay", [], {
      input: JSON.stringify(q) + "\n",
      encoding: "utf8",
    });
    assert.equal(native.status, 0, native.stderr);
    const expected = JSON.parse(native.stdout);
    const actual = wasm(q);
    assert.deepEqual(actual, expected);
    run = actual.run;
    count++;
  }
}
console.log(`${count} native / browser-WASM states match byte-for-byte.`);
