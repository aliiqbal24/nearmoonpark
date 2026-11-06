# MOONPARK — A NEAR Future

Build the Moon's best day out. Rockets bring visitors with finite budgets; your rides and independent concessionaires turn their arrival into a little lunar economy.

**Play:** https://last-signal-mars.ajiqbal1.chatgpt.site

One player designs the park. Everyone else is an NPC. A skippable 40-second opening leads into a nine-minute challenge, with 1×, 2× and 4× controls. Build rides and paths, tune prices and launches, support small businesses, and compete on a contract-calculated score.

This is the complete gameplay prototype. Final models, character art, music and cinematic production follow human playtesting. The conditional giveaway is public now; the eligible prize challenge stays closed until gameplay is frozen and Google sign-in is configured. No prize is funded or escrowed.

## Try it

1. Choose **Open your park** for instant local practice, or **Play on NEAR** for sponsored testnet play. Watch or skip the opening.
2. Choose **Mass-Driver Coaster**, place it on empty land, then select **Connect entrance**. The yellow tile marks its entrance. R rotates the blueprint; the second layout changes its footprint.
3. See guests walk to the ride, queue, pay and ride. Change tickets or launch settings. Hover or select a visitor to see their budget, preferences and thoughts.
4. Add **Crater Coolers** and an **Earthrise Wheel**. Tenants set their own prices, pay for supplies and send visible delivery rovers along your paths. A solar canopy adds power; the maintenance depot preserves ride condition and value.
5. Open the ledger to inspect actual transfers and confirmed NEAR transaction links. Ride the coaster with its camera. Use fast-forward to reach closing time sooner.
6. Inspect the score breakdown, explore your completed park, export its public record or replay. A pending NEAR result is labelled until verified.

The top-five panel explains ranked sign-in and the conditional prize promise. Anonymous playtesting is not prize eligible. Local practice never claims to make NEAR transactions.

## Run locally

Requirements: Node 22.22.2+, npm and a browser with WebGL. The checked-in browser WASM makes practice runnable without Rust.

```sh
npm ci
npm run dev
```

Open http://localhost:5173. The initial park is usable without secrets, Google configuration or an external API key.

For contract development, install Rust with the wasm32-unknown-unknown target. This project was built with Rust 1.98.1. Cargo.lock pins the dependency graph.

```sh
rustup target add wasm32-unknown-unknown
npm run build:engine
npm run test:economy
npm run test:contract
npm run test:parity
npm run test:sandbox
npm run typecheck
```

With the dev server running, `npm run test:game` runs the Moonpark browser tests. Playwright uses `/usr/bin/chromium`; override `CHROMIUM_PATH` for another installation. `npm run build` builds the hosted Worker and browser assets.

`MOON_CHAIN_UI=1 npm run test:game` also runs the full sponsored testnet browser campaign, including mid-round reload and canonical completion. It requires configured sponsorship and spends testnet funds.

## What NEAR does

The Rust simulation compiles to native code, browser WebAssembly and a NEAR contract. The browser submits **commands**, never replacement states or a claimed score. The contract validates construction, paths, costs, visitor spending, inventories, merchant pricing, revenue shares, investments, maintenance, simulation timing and scoring.

NPC treasuries are **contract-managed balances**, with deterministic policies and finite stock. They are not independently controlled NEAR accounts. Lunar credits are virtual game currency. No LLM, oracle, trading token, NEAR Intents or claimed NEP-245 compatibility is involved. The organizers allow an original NEAR contract fitting the track; named integrations are suggestions rather than mandatory dependencies.

The client predicts smoothly using the same engine and settles bounded batches. Transactions use `EXECUTED` confirmation: game execution is finalized without waiting for gas-refund receipts. Keys are limited to `create_run` and `apply_actions`, with a finite gas allowance and zero attached deposits. Recovery keys stay in the browser; the sponsor receives public keys only. Low-budget sponsored accounts are replaced before a new round, retaining the same signed-in leaderboard identity.

The contract derives scores from its own final state. Each signed-in identity has one best entry, even across different sponsored accounts. The live top five continues after the November 18 cutoff; separate eligible records preserve prize standings. See [implementation notes](docs/MOONPARK.md) and the [verification record](docs/MOONPARK-VERIFICATION.md).

## Testnet and Google setup

`npm run deploy:testnet` creates a faucet-funded testnet contract and writes public configuration plus ignored local secrets. It preserves the earlier Mars contract. Development-only `node scripts/game/moon-deploy.mjs --upgrade` refuses to upgrade an opened prize challenge.

Keep `.near-local/` and `.dev.vars` private. Configure the Moonpark environment keys from `.env.example` as hosted secrets. Initial guest funding is 1.5 testnet NEAR; sponsorship has IP/global limits and a finite reserve. Replenish that reserve before inviting substantial traffic.

After a production build, apply generated migrations to the local preview database:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_red_rockslide.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_blue_lorna_dane.sql
```

Apply each migration once. Sites applies pending hosted migrations during deployment. D1 holds authentication and sponsorship records, not game outcomes.

Google OAuth is the external setup dependency. [Exact setup instructions](docs/GOOGLE-AUTH.md) include the callback URL and required secrets. No fake sign-in or development bypass is enabled in production. Practice and sponsored guest NEAR play remain available while Google is unconfigured.

`npm run test:chain` spends sponsored testnet funds on a separate, non-prize verification run and writes public transaction evidence to `docs/moon-testnet-smoke.json`.

## Submission and provenance

Built for NEAR HACKATHON, Games With Real Economies. Original gameplay, simulation, interface, procedural models, camera sequence and synthesized placeholder audio. The supplied Sites/Vinext starter and declared dependencies provide infrastructure. The Earth texture comes from the Three.js examples; see [visual credits](docs/VISUALS.md).

The previous Mars game remains at `/legacy`, with its source, contract and documentation retained. Its README is [archived separately](docs/MARS-PROTOTYPE.md).

MIT license. A public source repository, final asset/audio upgrade, the human-published X demo and final hackathon submission are release milestones after gameplay review. No social post or hackathon submission has been sent.
