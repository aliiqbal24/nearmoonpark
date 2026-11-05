import type { Run, Command } from "./model";
type Exports = {
  memory: WebAssembly.Memory;
  sim_alloc: (n: number) => number;
  sim_free: (p: number, n: number) => void;
  sim_call: (p: number, n: number) => bigint;
};
let loading: Promise<Exports> | undefined;
export async function engine() {
  loading ??= fetch("/engine/sim.wasm")
    .then((r) => {
      if (!r.ok) throw Error("Simulation could not load.");
      return r.arrayBuffer();
    })
    .then((b) => WebAssembly.compile(b))
    .then((m) => new WebAssembly.Instance(m, {}).exports as Exports);
  return loading;
}
export async function simulate(input: {
  op: string;
  seed?: number;
  run?: Run;
  command?: Command;
  max_sols?: number;
}): Promise<Run> {
  const e = await engine();
  const bytes = new TextEncoder().encode(JSON.stringify(input));
  const p = e.sim_alloc(bytes.length);
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
