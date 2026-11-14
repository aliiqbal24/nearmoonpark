# Persistent Moonpark

The current ruleset is moonpark-v7. New parks start with 3,200 credits, twice the v6 allocation. A 48×48 plot offers three times the original buildable area. Eight building types allow multiple copies. One human makes building decisions, while NPC visitors and two vendors run their own budgets and policies.

The first 12 rockets carry the same 96 paying guests for every opening score. Each guest has a finite wallet and visit. Their departure seals the score and its onchain proof hash. Construction, customization, income and visits continue after scoring. New regular guests bring game-issued test credits. Logistics shipments replenish goods under an explicit signed policy. These assets have no cash value.

Coasters can be edited through eight control points with two fixed station connections. Six handles and a hill-height slider control a closed, smoothed loop. The deterministic engine validates the plot bounds, point spacing, cost and ride parameters. Geometry is saved with the park and each immutable licensed blueprint. Editing is previewed before committing construction costs.

Published park revisions store their own canonical snapshots. A newer revision becomes public when its owner publishes it. The active park continues independently. A park retains its live run through sponsored operator rotation, including its token ledger and sealed score. Browser saves preserve the local operation journal. Private backups enable account recovery.

## NEAR architecture

`crates/moon-sim` is the shared deterministic Rust engine. It compiles to native code for tests and replays, browser WebAssembly for responsive prediction, and a dependency of `crates/moon-contract`. The contract build excludes the browser's raw WASM ABI. Build the browser and contract separately to avoid Cargo feature unification.

The client submits commands rather than claimed balances, states or scores. `create_run` admits a sponsored account; `apply_actions` validates ownership, revision, idempotent request ID, commands, costs and elapsed time. Batches have at most sixteen commands and twenty simulation ticks. The contract limits simulation advancement to four times real elapsed time plus a small initial headroom, with no closing deadline. The first 96 visitors seal the score upon departure. A visit timeout and return shuttle ensure stranded visitors can leave. Later arrivals bring explicitly issued test credits, and the continuing park economy clears those mints, transfers and goods consumption atomically.

The browser predicts the continuing park economy locally, persists its operation journal and rebases on canonical contract responses. Only one transaction is submitted at a time. It uses finalized `EXECUTED` results, avoiding a wait for unrelated gas-refund receipts. A timed-out submission is read back and retried idempotently. Unconfirmed operations remain journaled through refresh and reconnect. A result stays pending until canonical confirmation.

The sponsor creates testnet subaccounts with a browser-generated recovery key and a restricted session key. The server receives public keys only. The session key can call `create_run`, `apply_actions` and `claim_prize`, has a finite allowance and cannot attach deposits. Initial funding is 0.5 testnet NEAR, with a 0.4 NEAR session allowance. Sponsorship has per-IP and global limits. The browser checks the remaining account balance and key allowance before a new round. Private keys are stored locally; public exports exclude them.

The v7 contract is a keyless child account, separate from the sponsor. Onchain access-key queries return an empty list and the code exposes no upgrade method. Separate creator/prize liability counters prevent new run storage from consuming reserved backing. The sponsorship server checks storage headroom before admitting a new account. `fund_storage` retains only needed new sponsorship and refunds the remainder of that same deposit; it cannot withdraw old funds.

NPC businesses use separately keyed testnet accounts with a signed deterministic spending policy. The immutable contract executes that policy and maintains NEP-245 balances atomically with the game. Neon Postgres stores private profile and sponsorship records, with Neon managed Auth for sign-in. The NEAR contract stores canonical game outcomes, asset ownership and rankings. Details and custody boundaries are in `NEAR-ECONOMY.md`.

## Presentation boundary

The persistent Three.js park, animated visitors, occupied rides, delivery rovers, recurring shuttles, coaster camera and rendered opening film are functional. The 40-second, 60 fps film includes licensed orchestral music, original narration and sound design, with a live fallback and reduced-motion presentation. See `MOONPARK-CINEMA.md` for editable production sources and verification. The earlier Mars prototype remains at `/legacy`.
