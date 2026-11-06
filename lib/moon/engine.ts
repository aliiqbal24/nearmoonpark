import type { Run, Command } from "./model";
type Exports = {
  memory: WebAssembly.Memory;
  sim_alloc: (n: number) => number;
  sim_free: (p: number, n: number) => void;
  sim_call: (p: number, n: number) => bigint;
};
let loading: Promise<Exports> | undefined;
export async function engine() {
  return (loading ??= (async () => {
    const r = await fetch("/engine/moon.wasm");
    if (!r.ok) throw Error("Moonpark engine could not load.");
    return new WebAssembly.Instance(
      await WebAssembly.compile(await r.arrayBuffer()),
      {},
    ).exports as Exports;
  })());
}
export async function simulate(input: {
  op: "new" | "step";
  run?: Run;
  commands?: Command[];
  ticks?: number;
}): Promise<Run> {
  const e = await engine(),
    bytes = new TextEncoder().encode(JSON.stringify(input)),
    p = e.sim_alloc(bytes.length);
  new Uint8Array(e.memory.buffer, p, bytes.length).set(bytes);
  let result: bigint;
  try {
    result = e.sim_call(p, bytes.length);
  } finally {
    e.sim_free(p, bytes.length);
  }
  const ptr = Number(result >> 32n),
    len = Number(result & 0xffffffffn);
  let value;
  try {
    value = JSON.parse(
      new TextDecoder().decode(new Uint8Array(e.memory.buffer, ptr, len)),
    );
  } finally {
    e.sim_free(ptr, len);
  }
  if (value.error) throw Error(value.error);
  return value.run;
}
