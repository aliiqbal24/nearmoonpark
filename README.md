# MOONPARK — A NEAR Future

Build the Moon's best day out. Rockets bring visitors with finite budgets; your rides and independent concessionaires turn their arrival into a little lunar economy.

**Play:** https://nearmoonpark.vercel.app

One human designs the park; everyone else is an NPC. A skippable 40-second cinematic leads into a permanent lunar park. The first 12 rockets carry 96 opening visitors. Their finite budgets and completed visits determine a sealed opening score. Later visitors keep paying and fund continued construction. Build rides and paths, tune prices and launches, customize signature rides, and pause or use 1×/2×/4× to watch the consequences.

## Try it

1. **Open your park** starts sponsored NEAR testnet play. The account and gas are included. **Practice offline** runs the same economy locally without transactions.
2. Build a **Mass-Driver Coaster** on empty land and choose **Connect entrance**. Watch guests disembark, walk, queue, pay and ride. Change tickets or launch settings; inspect a visitor's needs and thoughts.
3. Select an attraction and open **Customize your attraction**. Pick colors, a design style, lighting and a name. Choose **Design your coaster** to drag six route handles and adjust hills. The editor closes the loop, smooths banking and generates supports. Track geometry, height and launch strength affect construction cost, guest appeal and ride duration.
4. Add **Crater Coolers**, power and maintenance as the park grows. Merchants choose prices, buy stock, pay operating costs, reorder supplies and can become insolvent. Coin trails and sound follow actual income receipts.
5. Use **4×**, ride the mass driver with its front-seat camera, and inspect the economy ledger. NEAR validates commands and computes the final score.
6. Open **My park and ride exchange** to publish a verified park revision and guest-tested rides. Published layouts are snapshots that people can visit while the owner is away. Other parks can license that design, with 90% of the 0.005 tNEAR fee credited to its creator park’s owner. Visit public parks and ride their coasters. Optionally claim your persistent park through a signed NEAR wallet transaction.
7. Sign in through the hosted site's **Continue with Google** link to play a provisionally eligible competition round after the challenge opens. The contract keeps one best result per identity and freezes separate prize standings at the cutoff.

The NEAR badge opens the ownership and funding panel throughout play. No wallet extension, crypto purchase, seed-phrase entry or gas confirmation is required in the normal game loop. Anonymous runs appear as verified exhibitions and cannot take prize standings.

## Why NEAR is part of the game

**NPC vendor wallets** hold finite opening-day credits and stock. Two shop owners automatically price, restock and pay a fixed 10% park share. Each vendor account signs its deterministic policy. NEP-245 asset clearing and gameplay commit atomically. Normal play uses sponsored testnet gas.

**Persistent ownership** links a park to its NEAR account ID, with signed wallet acceptance, operator authorization and private account backup/restore.

**Player-created markets** make guest-tested ride designs permanent, attributed blueprints. A paid license gives another park the configuration and onchain provenance. Creator income is backed by the actual license payment, with private callbacks for retryable collection.

**Verifiable competition** uses the same Rust engine in browser WASM and the contract. Players submit commands instead of claimed scores. Every park scores the same first 96 visitors. The score freezes after their departure. Later income and construction leave that opening score sealed. A funded testnet prize escrow demonstrates frozen weighted allocation. The conditional US$1K/US$5K creator pledge is separate and unfunded.

**Immutable rules** live in a keyless contract. Creator and prize liabilities are protected from storage growth. The current ruleset is `moonpark-v6`. Earlier v5 parks and earnings can be accessed at `/archive/v5`, with v4 at `/archive/v4`, and v3 funded concessions at `/legacy-claims`.

Read [the NEAR economy](docs/NEAR-ECONOMY.md), [game implementation](docs/MOONPARK.md), [verification](docs/MOONPARK-VERIFICATION.md) and [cinema production](docs/MOONPARK-CINEMA.md).

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

With the dev server running, `npm run test:game` checks gameplay, mobile layout, the first-landing cohort, NEAR explanation and film. `MOON_PUBLIC_UI=1` adds the read-only published-park fixture. Playwright uses `/usr/bin/chromium`; override `CHROMIUM_PATH` if needed. `MOON_CHAIN_UI=1 npm run test:game` additionally spends testnet sponsorship on a complete round, customization, verified park publication and a signature blueprint. `npm run build` builds the Next.js browser application and server routes.

## Deploy a testnet economy

`npm run deploy:testnet` creates a testnet sponsor and a keyless child contract, funds a separate 0.5 tNEAR competition escrow and writes public configuration plus ignored local secrets. The v6 sponsor and restricted vendor policy keys are in `.near-local/moon-v6-deployer.json`. Keep `.near-local/` and `.dev.vars` private. Opening a challenge uses `npm run deploy:testnet -- --open`. New economic rules require another contract and challenge.

Each sponsored player receives 0.5 testnet NEAR and a restricted gameplay key with a 0.4 NEAR allowance. The server receives public keys. Park administration uses browser-held generated credentials, and external wallet claiming uses NEAR Connect with testnet-capable wallets on testnet. Back up private generated credentials before clearing storage. Sponsorship is finite and rate-limited. Public exports exclude private keys.

The Vercel deployment uses Neon Auth's managed Better Auth Google sign-in. Ranked admission requires a server-verified session with a verified email. The client cannot supply its own identity. Configure the canonical Vercel origin in Neon's trusted domains. Shared Google credentials support hackathon testing. Add a dedicated Google OAuth client in Neon for branded production sign-in.

Neon Postgres stores private profile links and sponsorship limits. Game outcomes and ownership are verified on NEAR. Link the Vercel project and provision the free Neon integration, then pull environment values and apply the schema once:

```sh
vercel env pull .env.local
npm run db:migrate
npm run dev
```

The app serves at http://localhost:5173. Production builds use `npm run build` and `npm start`. Private environment values, account backups, test outputs and Rust build artifacts are excluded from Vercel uploads.

`npm run test:chain` makes a separate non-prize verification run and records public transaction evidence. `node scripts/game/moon-deploy.mjs --open` opens the immutable challenge after verification. The prize cutoff is November 18, 2026 at 23:59 UTC. No real-money entry fee or mainnet transaction is part of this prototype.

## Submission and provenance

Built for NEAR HACKATHON, **Games With Real Economies**. Original gameplay, simulation, interface, procedural models, camera sequence, musical score and sound effects. The opening uses locally synthesized Kokoro narration; [cinema sources and credits](docs/MOONPARK-CINEMA.md). Next.js, Vercel, Neon and declared dependencies provide infrastructure. The Earth texture comes from the Three.js examples; [visual credits](docs/VISUALS.md).

The earlier Mars game remains at `/legacy`; [archived README](docs/MARS-PROTOTYPE.md). MIT license. A public source repository, the owner-published demo post and final hackathon submission are separate release milestones. No social post or hackathon submission has been sent.
