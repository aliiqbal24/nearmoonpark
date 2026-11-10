# Moonpark v5 verification

V5 adds separately keyed vendor accounts, a signed deterministic policy and finite NEP-245 credits and stock. Two merchants manage pricing, deliveries and a fixed 10% park share automatically. Park staff handle maintenance. Eight building types permit repeat placement. The new immutable testnet contract is `game.moonpark-mwam94si.testnet`. Saved v4 days retain their original engine and contract, and `/archive/v4` exposes earlier parks and earnings.

## Simulation and contract

Seventeen simulation tests and thirty-five contract tests pass. They cover cash conservation, atomic batches, default values for older serialized buildings, height construction charged once, cosmetic edits after closing, rejection of late height changes, snapshotting inherited palettes, published-park paging, recommendation-driven rocket bookings, signed ownership acceptance, operator authorization, license provenance, duplicate license refunds, creator-payment retries and frozen prize allocation. Historical concession fixtures still exercise earlier reward accounting.

Five full strategies match native Rust and browser WASM at every checkpoint, totaling **275 exact state matches**. The balanced and Gold fixtures score **7,161** with **94** happy guests and **843** transfers. The family fixture scores **7,257**. Automated fixtures are verification runs and use guest identities.

The NEAR Sandbox run matches the engine across **29 settled batches** and completes signed park claiming, verified layout publication, an immutable blueprint, licensed construction, creator payment, a player review and prize settlement after the cutoff. It rejects a wrong claim signer, missing license deposit, duplicate earnings withdrawal and forged private callback. The heaviest batch used **61.27 TGas**. Editable test output is generated at `outputs/moon-sandbox.json`.

## Live testnet

The public manifests contain the engine and contract hashes. Deployment verifies the code hash and empty access-key list. The contract is keyless and the `moonpark-v5` challenge is open. Creator and prize obligations are included in the solvency guard. Sponsorship uses a separate funded account.

The public replay checks all fifty-five game checkpoints against native Rust, publishes a customized park and ride, claims the park through a different signing account, buys and builds its blueprint, collects the creator’s 90% share and checks solvency. Repeated license calls credit once and refund their new deposit. The proof script preserves progress before subsequent payment checks. Storage deposits may be retained when headroom needs funding.

The v4 eligible prize board was empty before the v5 transition. V4 ownership, licenses and funded earnings stay in their immutable contract. The main game resumes v4 saves with its archived WASM engine, and earlier public visits select that contract. V3 funded claims remain accessible through `/legacy-claims`.

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
