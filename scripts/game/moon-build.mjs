import { spawnSync } from "node:child_process";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
function build(name) {
  const r = spawnSync(
    "cargo",
    [
      "build",
      "--locked",
      "--release",
      "--target",
      "wasm32-unknown-unknown",
      "-p",
      name,
    ],
    { stdio: "inherit" },
  );
  if (r.status) process.exit(r.status);
}
// Separate feature resolution keeps the browser ABI out of the NEAR contract.
build("moonpark-sim");
await mkdir("public/engine", { recursive: true });
await copyFile(
  "target/wasm32-unknown-unknown/release/moonpark_sim.wasm",
  "public/engine/moon.wasm",
);
build("moonpark-contract");
const browser = WebAssembly.Module.exports(
  await WebAssembly.compile(await readFile("public/engine/moon.wasm")),
).map((x) => x.name);
const contract = WebAssembly.Module.exports(
  await WebAssembly.compile(
    await readFile(
      "target/wasm32-unknown-unknown/release/moonpark_contract.wasm",
    ),
  ),
).map((x) => x.name);
assert.ok(browser.includes("sim_call"));
assert.ok(!contract.includes("sim_call"));
