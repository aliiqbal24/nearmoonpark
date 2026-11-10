import type { Run, Command } from "./model";
import { VERSION } from "./model";
type Exports = {
  memory: WebAssembly.Memory;
  sim_alloc: (n: number) => number;
  sim_free: (p: number, n: number) => void;
  sim_call: (p: number, n: number) => bigint;
};
const loading = new Map<string, Promise<Exports>>();
export async function engine(version = VERSION) {
  if (version !== VERSION && version !== "moonpark-v4")
    throw Error("This park uses an unsupported engine version.");
  let result = loading.get(version);
  if (!result) {
    result = (async () => {
      const path =
        version === "moonpark-v4"
          ? "/engine/moon-v4.wasm"
          : "/engine/moon.wasm";
      const r = await fetch(`${path}?v=${version}`);
      if (!r.ok) throw Error("Moonpark engine could not load.");
      return new WebAssembly.Instance(
        await WebAssembly.compile(await r.arrayBuffer()),
        {},
      ).exports as Exports;
    })();
    loading.set(version, result);
    void result.catch(() => loading.delete(version));
  }
  return result;
}
export async function simulate(input: {
  op: "new" | "step";
  run?: Run;
  commands?: Command[];
  ticks?: number;
}): Promise<Run> {
  const e = await engine(input.run?.version),
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
