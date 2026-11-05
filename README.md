# LAST SIGNAL

Earth is gone. Govern humanity's last Martian settlement through 24 sols and eight decisions. NPC institutions buy inputs, produce essentials, pay wages, adjust prices, and defer repairs when their money or materials run out. Your policies determine who can afford to survive.

A complete scrappy game for NEAR HACKATHON, Games With Real Economies. All story, economics, recovery actions, endings, and replay are implemented. Geometry and authored text deliberately stand in for the later art and audio pass.

## Play

Hosted: https://last-signal-mars.ajiqbal1.chatgpt.site

Select **Take command**, read or skip the transmission, and choose your first allocation policy. Choose **Fast** between decisions to accelerate the colony. A complete run targets 8–10 minutes, or 3–5 using fast-forward; reading speed and testnet latency affect this.

- Eight choices govern allocation, access to essentials, construction, working capital, maintenance, rescue, storm response, and recovery.
- Five autonomous NPC institutions, three household groups, a public treasury, six resource/accounting types.
- Three finite aid uses, at most one per chapter. Select a building before repairs or portable power.
- Four reachable endings. Finish and replay the same seed to compare strategies.
- Inspect actual trades, inventories, NPC pricing explanations, cause links, decisions, and transaction receipts.
- Recovery and mission-record exports are separate. The private recovery export contains credentials; keep it private. The playtest export contains no credentials.

NEAR testnet is the default. A sponsored guest account is created from browser-generated public keys, with no extension or payment. Account creation runs alongside the opening story. Practice mode uses the exact same Rust simulation in browser WebAssembly and is labeled **LOCAL PRACTICE** throughout; it never claims to make transactions.

## Run locally

Node >=22.22.2, npm, Git, and a modern browser are required. The checked-in `public/engine/sim.wasm` makes practice immediately runnable without Rust.

```sh
npm ci
npm run dev -- --port 5173
```

Open http://localhost:5173. Uncheck NEAR on the title screen for practice. Local Workers load ignored `.dev.vars` when present.

To compile or test contracts, install stable Rust, add `~/.cargo/bin` to PATH, and install the wasm target:

```sh
rustup target add wasm32-unknown-unknown
npm run build:engine
cargo build --release -p last-signal-sim --example replay
npm run test:parity
npm run test:economy
npm run test:contract
npm run typecheck
```

Start the app, then run `npm run test:game`. Playwright uses `/usr/bin/chromium` by default; set `CHROMIUM_PATH` or install Chromium for your environment. To explicitly verify sponsored guest entry and a real testnet-signed choice, run `RUN_NEAR=1 npx playwright test -g 'NEAR guest'`. This spends only sponsored testnet NEAR.

## Deploy your own testnet instance

`npm run deploy:testnet` creates one faucet-funded **testnet** deployer, deploys the compiled contract, writes its public configuration, and writes ignored `.dev.vars`. Private keys go only in `.near-local/` and `.dev.vars`, both ignored. The command never accesses mainnet. Replenish testnet reserves before inviting substantial traffic.

Build once with `npm run build`. Apply the generated D1 migration locally:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_red_rockslide.sql
```

Configure the three variables in `.env.example` as hosted secrets. D1 stores guest provisioning and sponsorship limits; it never supplies game outcomes. The Sites hosting manifest binds D1 as `DB`. Public hosting is needed for anonymous judge entry.

`node scripts/game/deploy.mjs --upgrade` is a development-only redeployment to the existing account. For a frozen published scenario, use a new deployment and retain the prior contract rather than changing rules for existing runs. `npm run test:chain` creates a separate test player and records a complete eight-decision testnet run in `docs/testnet-smoke.json`.

## What NEAR enforces

The Rust contract validates ownership, revision, allowed actions, costs, aid limits, market transfers, production recipes, wages, maintenance, consumption, casualties, and endings. The browser submits **commands**, never arbitrary replacement states. Every playthrough is isolated. A bounded history includes transactions between institutional balances and hashes of the simulation state.

The shared `last-signal-sim` Rust crate compiles to native code, browser WASM, and the contract. Native/WASM parity is checked byte-for-byte. Pricing lives in `crates/sim/src/pricing.rs`. No real money, trading token, or external oracle is needed.

NPC treasuries are **contract-managed balances** with deterministic behavioral policies. They are not separately controlled NEAR wallets and do not use generative AI. The implementation does not claim NEP-245 compatibility, NEAR Intents, or independent NPC custody. Those are optional suggestions in the Games example prompt; an original NEAR contract that fits the track is eligible.

The browser holds a recovery key and a restricted gameplay key. Only `create_run` and `step` are authorized for the latter, with a bounded gas allowance. Gameplay attaches no NEAR. The sponsor holds no player private keys. Accounts are testnet-only and pre-funded for gas/storage. Clearing browser storage loses access unless the private recovery file was exported. Up to eight runs per admitted guest account and the eight most recent local runs are retained in the browser archive. NEAR run histories remain onchain.

## Judge walkthrough

1. Start seed 42 and protect the greenhouse. Choose Fast. See NPC wages and real input trades in **Inspect inventory & trades**.
2. Choose household-budget support. See credits move to households and get spent on essentials.
3. Build water recycling or expand the workshop. The project completes after its specified duration.
4. Make the payroll and maintenance decisions. Inspect equipment condition and the workshop parts inventory.
5. Rescue the survey team. Their arrival changes population, demand, wellbeing, and the story.
6. Face the storm. Open **Why did this happen?** to inspect power shortages and linked maintenance effects.
7. Finish, inspect the ending and actual transaction links, and replay the same seed.

Example strong strategy (zero-based option indices): `[0,1,0,0,0,0,2,0]`. Another: `[1,1,2,0,0,0,2,0]`. These require no aid. Broadly relying on market access without maintenance produces a weaker society. Exact balance and claims are in `docs/ECONOMY.md` and `docs/VERIFICATION.md`.

## Submission status

This repository was started from an empty workspace during the eligible build window. The Sites Vinext starter, React, near-sdk, near-api-js, serde, sha2, Lucide, and Playwright are dependencies/boilerplate; gameplay and simulation are new. MIT license.

This is the full scrappy playtest version. Final artwork/audio, human gameplay approval, a public source repository, the public X demo post, and the organizer's final submission remain separate milestones. No social post or hackathon submission has been sent by this app.

For a full isolated local blockchain integration test, run `npm run test:sandbox` after building the contract. The `near-sandbox` library downloads a version-pinned local node on first use. The test deploys the real WASM, verifies admission/idempotency/ownership, plays all 24 sols, and checks stale-revision rejection without using public RPCs.
