import { spawnSync } from "node:child_process";
import { copyFile } from "node:fs/promises";
const build = spawnSync(
  "cargo",
  [
    "build",
    "--locked",
    "--release",
    "--target",
    "wasm32-unknown-unknown",
    "-p",
    "last-signal-sim",
    "-p",
    "last-signal-contract",
  ],
  { stdio: "inherit" },
);
if (build.status) process.exit(build.status);
await copyFile(
  "target/wasm32-unknown-unknown/release/last_signal_sim.wasm",
  "public/engine/sim.wasm",
);
