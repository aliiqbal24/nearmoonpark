# Moonpark verification

This record distinguishes automated economic correctness from human assessment of how fun the park is. The complete gameplay prototype is ready for that assessment; final art, audio and submission production follow it.

## Shared simulation

- Native Rust tests check atomic command rejection, connectivity and rerouting, cash and all three goods conservation, health-adjusted resale, speed/batch equivalence, tenant insolvency/recovery, coaster launch tradeoffs and closing behavior.
- Contract tests check ownership, stale revisions, deadlines, speed limits, idempotency and best-score/prize snapshots.
- Five full 540-second scenarios compare every serialized browser-WASM and native state at 54 checkpoints each: **270 exact matches**. The optimized guest-routing implementation also reproduced all 270 pre-optimization state hashes.
- The reachable Gold scenario scores **7,225**, with 95 happy visitors and 736 actual transfers. Its script is a test fixture, not an automated prize contestant.

## Actual NEAR execution

The local NEAR Sandbox deploys the real contract, admits a player, opens a disposable challenge and compares a complete campaign against browser WASM. It checks authorization, retries, revisions and the resulting leaderboard. The latest run uses batches of up to twenty ticks: 29 checkpoints, with a maximum **50.98 TGas** and total **1,332.38 TGas**. Its local detailed report is `outputs/moon-sandbox.json`.

[Public testnet evidence](moon-testnet-smoke.json) contains 54 confirmed transaction/checkpoint records, a 7,225-point Gold score and 736 transfers. This campaign tested the immediately preceding ten-tick contract build. The subsequent routing optimization was checked for exact economic parity; the final build also supports twenty-tick batching. The public manifest `public/moon-build.json` identifies the deployed contract and browser engine hashes. No private keys are included in the report.

The actual prize challenge remains closed. Verification identities and anonymous guest rounds cannot claim prizes.

[Browser testnet evidence](moon-browser-smoke.json) records a complete round against the final twenty-tick contract build. The browser provisioned its restricted-key account, constructed and connected a coaster, ran at 4×, reloaded and resumed mid-round, and finished in approximately 2½ minutes. The confirmed final state exactly matched the client engine, with no pending operations or browser errors.

## Browser and deployment

Playwright covers the opening/skip flow, construction and smart connection, ticket/launch controls, path creation/removal, the coaster camera, economy ledger, full-round closing, save/resume, persistent canvas, invalid overlap without spending, mobile layout and the top-five conditional pledge. Four routine browser tests and the opt-in full NEAR browser campaign pass. Unauthenticated ranked provisioning and profile edits are rejected. A delayed account-setup test exposed and verified the fix for the intro camera overriding the park view. TypeScript and a production Worker/browser build are checked separately. Local practice does not pretend to settle on NEAR.

Google OAuth cannot be exercised until the owner supplies a Google web client. The missing configuration fails closed, with no production bypass. Follow [the setup guide](GOOGLE-AUTH.md), then test the full ranked flow before opening eligibility.

The synthesized sounds and live 3D opening are prototype presentation. No finished audiovisual export or final soundtrack is claimed. A human playtest is still required to assess pacing, clarity, enjoyment and device performance before the asset upgrade.
