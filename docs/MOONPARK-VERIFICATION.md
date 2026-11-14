# Moonpark v8 verification

The immutable contract is `game.moonpark-mwgh000n.testnet`, with code hash `8iTkztBYZvA3CecctfCPgZuEgteyaiF9eP5EcXY9EBgk`. The public build manifest records the exact browser-engine and contract SHA-256 values. The deployed account has zero access keys. All funding uses free testnet assets.

All 25 simulation tests and 37 contract tests pass. Five full strategies produce 367 exact native/browser-WASM state matches. The balanced and Gold fixtures score 8,941. Sandbox verification checks 39 batches and reaches a maximum of 69.42 TGas. The public testnet proof checks 75 canonical checkpoints, five wallet holdings, signed ownership, a paid ride license and its creator payout. Its maximum batch uses 63.12 TGas. [Public replay](moon-v8-testnet-smoke.json)

Twenty-three browser checks cover the new guided opening, fixed fares, automatic opening, exact half-price resale, cursor-drawn and draggable tracks, a 30×30 footprint, a 60-metre hill, pre-build appearance choices, catalogue scrolling and tooltips, unfinished draft recovery, saved parks, two independent recovery contexts, stale-edit reconciliation, earlier engines, cinema playback and fallback, audio decoding, the 8K sky and phone layouts. TypeScript, targeted ESLint and the production Next.js build pass. Static image optimization warnings are retained for the existing game artwork.

The Neon recovery schema and AES-256-GCM encryption have database round-trip, authenticated-data isolation and tamper checks. Recovery rows are scoped to the verified user, contract and run. Separate rows retain guest and ranked parks. Current operator and generated owner keys are validated against NEAR. Authority revisions reject stale operator updates. The browser resumes the canonical park and reconciles compatible pending commands. Practice saves and unfinished designs stay in browser storage.

V6 and v7 saves retain their archived engines and original economic rules. Their separate sponsors support operator renewal, with an explicit earlier-rules banner and a new-workshop entry. The v7 eligible prize board had zero entries before v8 opened.

---

# Earlier v7 verification record

The current contract is `game.moonpark-mwgdp7qs.testnet`. New parks receive 3,200 lunar credits. The shared Rust engine initializes their score baseline from that allocation, so the starting grant creates no score. A regression test constructs two coasters and a wheel from the initial budget and checks exact conservation.

All 20 simulation tests and 37 contract tests pass. Five strategies produce 351 exact native/WASM checkpoint matches. Gold and balanced score 7,377. The Sandbox proof verifies 37 settled batches with a maximum of 68.09 TGas. The public testnet proof verifies 71 checkpoints, real account holdings, signed park ownership, licensing and a creator payout, with a maximum batch of 60.12 TGas.

V6 remains a persistent supported ruleset. Its archived engine, configuration, ownership desk and published snapshots are retained. The provisioning API accepts the known v6 contract through its separate sponsor credentials and rejects unknown contracts. A live API check provisions a restricted v6 session and creates its original 1,600-credit run. Browser checks also resume archived v4, v5 and v6 saves. The retired v6 prize board had zero eligible entries before v7 admission opened.

All 28 game browser cases and both camera-preview cases pass across the release runs. The changed source passes targeted ESLint and TypeScript checks.

The sky uses an 8K GPU-compressed Milky Way texture and 16,000 separately rendered point stars. GPU captures verify the full 8192×4096 compressed texture and analytic star geometry, with zero page errors. A texture-loading fallback covers restricted devices and failed downloads. Both full opening films are re-rendered from this scene with higher H.264 bitrate limits.

Evidence is recorded in [the v7 canonical replay](moon-v7-testnet-smoke.json), [Sandbox settlement](moon-v7-sandbox-smoke.json), [the authored browser park](moon-v7-browser-smoke.json) and [v6 sponsored recovery](moon-v6-renewal-smoke.json) and [v7 browser licensing](moon-v7-license-ui-proof.json). Earlier verification records follow.

---

# Earlier v6 verification record

The current immutable contract is `game.moonpark-mwgb9j6a.testnet`. The browser and contract share the persistent Rust simulation. Parks have 48×48 plots, custom eight-point coasters, continuing trade after scoring and independently published visitor snapshots. The first 96 visitors seal the opening score. Later paying arrivals fund further building. Earlier v5 and v4 contracts, saved engines and public pages remain accessible.

## Simulation and NEAR

All 19 simulation tests and 37 contract tests pass. Five strategies produce 363 exact native/WASM state matches. Gold and balanced score 7,271, while family scores 7,384. Continued arrivals, explicit credit and stock issuance, long-running ticks, operator handoff, immutable snapshots, score sealing and committed vendor balances are covered.

The NEAR Sandbox proof checks 39 batches, ownership claiming, paid licenses, creator collection, private callback guards and prize allocation. Its heaviest batch uses 67.82 TGas. The public testnet replay checks 75 canonical checkpoints and all five wallet holdings. Its heaviest batch uses 59.38 TGas. Deployment verifies the code hash, zero contract access keys and independently signed NPC policies. Free testnet funds cover gas and storage.

The sponsored browser flow creates a park through the real provisioning API, edits its coaster, serves guests, publishes its park while the opening is ongoing and publishes an immutable authored blueprint. A second browser flow licenses that eight-point design, credits its creator 0.0045 tNEAR and verifies exact construction geometry onchain. Public visitors see the published snapshot without modifying their local save. Private backup validation rejects an invalid signing key and restores valid account control. Queued edits recover after a sealed opening without changing its score.

Evidence is recorded in [the canonical replay](moon-v6-testnet-smoke.json), [Sandbox settlement](moon-v6-sandbox-smoke.json), [the sponsored authored park](moon-v6-browser-smoke.json) and [browser licensing](moon-v6-license-ui-proof.json). The retired v5 contract had zero eligible prize entries immediately before the transition. Public test fixtures are guest exhibitions.

## Presentation and browser coverage

All 25 game browser cases and both camera-preview cases were verified across the release runs. Routine browser coverage includes complete opening-day scoring, continuing play, construction, overlap rejection, refresh recovery, the coaster editor, mobile layout, first-landing timing, NEAR explanations, public snapshots, archived v4/v5 engines, movie decoding and fallback. The transaction-spending tests separately exercise sponsorship, publication, licensing, private account backup and queued journal recovery. Targeted ESLint reports no errors in the changed game components and libraries. Repository-wide lint still reports 19 errors in the earlier Mars prototype and its components.

The rebuilt opening has 2,400 frames at 60 fps in both landscape and separately composed portrait delivery. Both complete files decode successfully. Exported shots were visually reviewed, including the front-seat correction. The encoded soundtrack measures −15.75 LUFS, −1.67 dBTP and 4.5 LU loudness range. This environment cannot audition audio, so perceptual listening remains a human review item. Editable production and music attribution are recorded in [the cinematic production record](MOONPARK-CINEMA.md).

External personal-wallet approval remains a human handoff. Google sign-in was verified during the earlier hosting migration. This release verifies NEAR ownership and payments with separately controlled signing accounts.

---

# Earlier v5 verification record

V5 adds separately keyed vendor accounts, a signed deterministic policy and finite NEP-245 credits and stock. Two merchants manage pricing, deliveries and a fixed 10% park share automatically. Park staff handle maintenance. Eight building types permit repeat placement. The new immutable testnet contract is `game.moonpark-mwam94si.testnet`. Saved v4 days retain their original engine and contract, and `/archive/v4` exposes earlier parks and earnings.

## Simulation and contract

Seventeen simulation tests and thirty-five contract tests pass. They cover cash conservation, atomic batches, default values for older serialized buildings, height construction charged once, cosmetic edits after closing, rejection of late height changes, snapshotting inherited palettes, published-park paging, recommendation-driven rocket bookings, signed ownership acceptance, operator authorization, license provenance, duplicate license refunds, creator-payment retries and frozen prize allocation. Historical concession fixtures still exercise earlier reward accounting.

Five full strategies match native Rust and browser WASM at every checkpoint, totaling **275 exact state matches**. The balanced and Gold fixtures score **7,161** with **94** happy guests and **843** transfers. The family fixture scores **7,257**. Automated fixtures are verification runs and use guest identities.

The NEAR Sandbox run matches the engine across **29 settled batches** and completes signed park claiming, verified layout publication, an immutable blueprint, licensed construction, creator payment, a player review and prize settlement after the cutoff. It rejects a wrong claim signer, missing license deposit, duplicate earnings withdrawal and forged private callback. The heaviest batch used **61.27 TGas**. Editable test output is generated at `outputs/moon-sandbox.json`.

## Live testnet

The public manifests contain the engine and contract hashes. Deployment verifies the code hash and empty access-key list. The contract is keyless and the `moonpark-v5` challenge is open. Creator and prize obligations are included in the solvency guard. Sponsorship uses a separate funded account.

The public replay checks all fifty-five game checkpoints against native Rust, publishes a customized park and ride, claims the park through a different signing account, buys and builds its blueprint, collects the creator’s 90% share and checks solvency. Repeated license calls credit once and refund their new deposit. The proof script preserves progress before subsequent payment checks. Storage deposits may be retained when headroom needs funding.

The v4 eligible prize board was empty before the v5 transition. V4 ownership, licenses and funded earnings stay in their immutable contract. The main game resumes v4 saves with its archived WASM engine, and earlier public visits select that contract. V3 funded claims remain accessible through `/legacy-claims`.

The canonical Vercel site also completed a fresh sponsored opening day, displayed the account balances, confirmed its score, published the park and published a signature ride. Its public proof is in `moon-v5-browser-smoke.json`. Public links include their registry version. Regression checks distinguish the current v5 park from unversioned v4 numeric IDs and earlier owner-address bookmarks.

## Vendor-asset verification

Every Sandbox and live testnet checkpoint compares all five account holdings with canonical game state, including paid inventory in transit. Credit supply stays constant and food, drink and part consumption reduces their supplies exactly. Each opening day has separate token IDs. Deployment verifies that the three NPC accounts exist, have one restricted policy key each and signed acceptance. The game contract itself has zero access keys.

Tests reject player impersonation of a vendor and transfers out of an active economy. Closing-day transfers preserve total supply. A transfer-call to an account without a receiver contract refunds its assets. Unit tests cover a failed receiver result and preservation of transferred balances through later cosmetic edits. The browser wallet view was inspected at desktop and 390-pixel widths, and the rent slider and investment options are absent. `outputs/moon-v5-vendor-wallets.png` and its mobile counterpart record this view.

Free official faucet funds and existing testnet reserves supplied deployment, NPC accounts, player gas and storage. No mainnet funds were used. Sponsorship remains finite and rate-limited. Native creator and prize obligations remain protected from storage growth.

## Browser checks

All twenty-two browser cases passed across the routine, transaction-spending and final regression runs. This includes actual testnet licensing, private backup import/export and recovery of queued cosmetic edits after a completed day. The new React components also pass the targeted ESLint check.


The routine suite covers complete construction and closing, prices, the ride camera, ledger, saved-game resume, rejected overlap, mobile layout, first-landing timing, sign-in guards, immediate design changes, palette inheritance and the opening movie’s playback/fallback. The opt-in NEAR flow covers sponsored account creation, restricted-key settlement, named ride customization, final verification, park publication and blueprint publication.

A separate public-park integration check covers its verified closing record, explorable rendered layout, coaster POV and mobile sizing. The licensing browser check resumes an admitted test account, buys a community design through the actual exchange, confirms the creator balance increase and verifies the constructed blueprint ID onchain.

Run the integration checks after the public replay has seeded its fixture.

```sh
npm run test:chain
MOON_CHAIN_UI=1 MOON_PUBLIC_UI=1 npm run test:game
```

Use `CHROMIUM_PATH` to select Chromium. GPU verification on this machine uses `MOON_CAPTURE_GPU=1 CHROMIUM_PATH=/usr/lib/chromium/chromium`, with hardware video decode disabled for this Vulkan test setup. Software rendering retains its direct-render fallback.

TypeScript, whitespace checks and the production Next.js build are verified before publication. The external personal-wallet approval remains a human handoff. Google sign-in was verified during the earlier hosting migration. Contract-level claims and real testnet creator payments are exercised with separate signing accounts. Public visits animate ambient guests around a verified layout.

## Presentation

The existing 40-second film, original score, narration, 1080p desktop delivery and portrait mobile delivery accompany the new game. Its editable production and provenance are in `MOONPARK-CINEMA.md`. The new attraction styles use original code-native geometry and material changes. No film re-export was needed for this feature release.

Current evidence is recorded in [the public replay](moon-v5-testnet-smoke.json), [Sandbox settlement](moon-v5-sandbox-smoke.json) and [the full sponsored browser day](moon-v5-browser-smoke.json). The public replay verified all 55 checkpoints, a signed claim by a different account, licensed construction, a 0.0045 tNEAR creator payment and solvent protected balances. Its heaviest batch used 58.60 TGas.

MyNearWallet disabled new app connections during its November 2026 sunset. The release uses NEAR Connect with current testnet-capable wallets. The picker and Intear connection-method screen were inspected in-browser. This environment reached Meteor’s Cloudflare block, and the final personal wallet approval remains a human verification step. [MyNearWallet sunset notice](https://www.mynearwallet.com/sunset)
