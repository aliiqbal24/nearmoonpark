# MOONPARK — A NEAR Future

Build the Moon's best day out. Rockets bring visitors with finite budgets; your rides and independent concessionaires turn their arrival into a little lunar economy.

**Play:** https://last-signal-mars.ajiqbal1.chatgpt.site

One human designs the park; everyone else is an NPC. A narrated, skippable 40-second film leads into a nine-minute opening day. The clock holds at 9:00 until the first shuttle lands. Build rides and paths, tune prices and launches, back independent businesses, and use 1×/2×/4× to watch the consequences.

## Try it

1. **Open your park** starts sponsored NEAR testnet play. The account and gas are included. **Practice offline** runs the same economy locally without transactions.
2. Build a **Mass-Driver Coaster** on empty land and choose **Connect entrance**. Watch guests disembark, walk, queue, pay and ride. Change tickets or launch settings; inspect a visitor's needs and thoughts.
3. Back **Omar** in **Merchant partnerships**. The 100 park credits become his working capital. You receive a fixed 20% opening-day sales share and a **NEP-171 concession certificate** owned by your NEAR account. Completing his service target releases a separate virtual Tourism Board grant.
4. Add **Crater Coolers**, power and maintenance as the park grows. Merchants choose prices, buy stock, pay operating costs, reorder supplies and can become insolvent. Coin trails and sound follow actual income receipts.
5. Use **4×**, ride the mass driver with its front-seat camera, and inspect the economy ledger. NEAR validates commands and computes the final score.
6. At closing, choose **Your NEAR business shares**. Collect the certificate's funded testnet reward and follow its transaction receipt. Optionally review a transfer to another existing testnet account. The new owner receives the uncollected reward right; the park and score stay with its founder.
7. Sign in through the hosted site's **Continue with ChatGPT** link to play a provisionally eligible competition round after the challenge opens. The contract keeps one best result per identity and freezes separate prize standings at the cutoff.

The NEAR badge opens the ownership and funding panel throughout play. No wallet extension, crypto purchase, seed-phrase entry or gas confirmation is required in the normal game loop. Anonymous runs appear as verified exhibitions and cannot take prize standings.

## Why NEAR is part of the game

**Ownership:** backing a merchant issues an actual transferable NEP-171 asset. Standard NFT core, approval, enumeration and metadata methods use `near-contract-standards`. The certificate's current owner controls its reward claim independently of the game interface. Transfer and claim work through the contract API without our server.

**Binding agreements:** the contract fixes the 20% share and prevents unilateral rent changes or demolition of the partnered shop during opening day. Each business has its own finite, contract-managed cash and inventory. Income comes from actual sales or repairs, not a client-supplied reward amount.

**Funded settlement:** a separate testnet NEAR pool reserves up to 0.02 tNEAR per concession. Each earned lunar credit accrues 0.0001 tNEAR, capped by its reserved backing. A successful transfer is recorded once; failed payments restore the claim. Unused reserves return to that same pool at closing. These are testnet demonstration rewards with no cash value. Lunar game credits themselves are not redeemable.

**Verifiable competition:** all rounds use the same engine, starting resources and scoring rules. The client submits commands, never replacement balances or claimed scores. A separately funded testnet prize escrow allocates to the first four frozen ranked accounts at weights 40/30/20/10, normalized if fewer qualify. The sponsor attests the external hackathon award; it cannot redirect winner claims or change the allocated tier. The conditional US$1K/US$5K creator pledge remains separate, unfunded and payable on mainnet only if the qualifying award occurs, subject to the published eligibility review.

**A protected contract:** the v3 economy lives on a separate account with **zero access keys and no upgrade or general withdrawal method**. A gas sponsor has its own account and cannot overwrite the contract. Storage admission checks protect outstanding business/prize liabilities; storage sponsorship refunds only the unused portion of its new deposit. Code/configuration hashes and public evidence are in `public/moon-build.json` and [verification](docs/MOONPARK-VERIFICATION.md).

NPC treasuries are contract-managed game balances, not independently signing NEAR accounts. This project does not claim NEAR Intents, NEP-245 items or LLM-controlled NPCs. The [official rules, Q-011](https://nearhackathon.com/HACKATHON.md) allow an original NEAR contract fitting the track; named integrations and the sample prompt are suggestions.

## Run locally

Requirements: Node 22.22.2+, npm and WebGL. Checked-in WASM makes offline practice runnable without Rust or secrets.

```sh
npm ci
npm run dev
```

Open http://localhost:5173 and select **Practice offline**. For contract development, install Rust and the WASM target (this project uses Rust 1.98.1; Cargo.lock pins dependencies):

```sh
rustup target add wasm32-unknown-unknown
npm run build:engine
npm run test:economy
npm run test:contract
npm run test:parity
npm run test:sandbox
npm run typecheck
```

With the dev server running, `npm run test:game` checks gameplay, mobile layout, the first-landing clock, NEAR explanation and film. Playwright uses `/usr/bin/chromium`; override `CHROMIUM_PATH` if needed. `MOON_CHAIN_UI=1 npm run test:game` additionally spends testnet sponsorship on a complete round, mid-round resume, reward collection and ownership transfer. `npm run build` builds the Worker/browser application.

## Deploy a testnet economy

`npm run deploy:testnet` creates a testnet sponsor and a **keyless child contract**, funds a merchant pool and a separate 0.5 tNEAR competition escrow, and writes public configuration plus ignored local secrets. The sponsor key is in `.near-local/moon-v3-deployer.json`. Preserve `.near-local/` and `.dev.vars`; never publish them. Existing Mars, Moonpark v1 and v2 deployments are preserved. There is no upgrade path for v3; new economic rules require a new deployment and challenge.

Each sponsored player receives 0.5 testnet NEAR and a session key with a 0.4 NEAR allowance. Its allowed methods are `create_run`, `apply_actions`, `claim_business_reward` and `claim_prize`; it cannot attach deposits. Optional certificate transfers use the browser-held recovery key for the standard one-yocto deposit. The sponsor receives public keys only. IP/global limits, finite reserves and protected storage backing bound sponsorship. Browser keys stay on the device; transfer a certificate to a wallet you control for external custody.

The hosted site uses the Sites platform's social sign-in. `MOON_CHATGPT_AUTH=1` is trusted only in production at the configured `BETTER_AUTH_URL` on `.chatgpt.site`, behind Sites' identity gateway. Do not enable gateway-header trust on another hosting provider. Google OAuth remains an optional standalone alternative; [setup](docs/GOOGLE-AUTH.md). Anonymous access fails closed for ranked admission and profile changes.

D1 holds identity, profile and sponsorship records, not game outcomes. Sites applies pending hosted migrations. Local preview migrations, applied once after a production build:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_red_rockslide.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_blue_lorna_dane.sql
```

`npm run test:chain` makes a separate non-prize verification run and records public transaction evidence. `node scripts/game/moon-deploy.mjs --open` opens the immutable challenge after verification. The prize cutoff is November 18, 2026 at 23:59 UTC. No real-money entry fee or mainnet transaction is part of this prototype.

## Submission and provenance

Built for NEAR HACKATHON, **Games With Real Economies**. Original gameplay, simulation, interface, procedural models, camera sequence, musical score and sound effects. The opening uses locally synthesized Kokoro narration; [cinema sources and credits](docs/MOONPARK-CINEMA.md). Sites/Vinext and declared dependencies provide infrastructure. The Earth texture comes from the Three.js examples; [visual credits](docs/VISUALS.md).

The earlier Mars game remains at `/legacy`; [archived README](docs/MARS-PROTOTYPE.md). MIT license. A public source repository, the owner-published demo post and final hackathon submission are separate release milestones. No social post or hackathon submission has been sent.
