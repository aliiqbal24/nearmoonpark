# Moonpark v4 verification

V4 replaces merchant partnership offers with persistent parks, signed wallet claims, attraction customization and a player-created ride exchange. It uses the separate immutable testnet contract `game.moonpark-mw65jiya.testnet`. The visible nine-minute clock starts at the first rocket landing.

## Simulation and contract

Sixteen simulation tests and twenty-nine contract tests pass. They cover cash conservation, atomic batches, default values for older serialized buildings, height construction charged once, cosmetic edits after closing, rejection of late height changes, snapshotting inherited palettes, published-park paging, recommendation-driven rocket bookings, signed ownership acceptance, operator authorization, license provenance, duplicate license refunds, creator-payment retries and frozen prize allocation. Historical concession fixtures still exercise earlier reward accounting.

Five full strategies match native Rust and browser WASM at every checkpoint, totaling **275 exact state matches**. The balanced and Gold fixtures score **7,161** with **94** happy guests and **738** transfers. The family fixture scores **7,257**. Automated fixtures are verification runs and use guest identities.

The NEAR Sandbox run matches the engine across **29 settled batches** and completes signed park claiming, verified layout publication, an immutable blueprint, licensed construction, creator payment, a player review and prize settlement after the cutoff. It rejects a wrong claim signer, missing license deposit, duplicate earnings withdrawal and forged private callback. The heaviest batch used **54.68 TGas**. Editable test output is generated at `outputs/moon-sandbox.json`.

## Live testnet

The public manifests contain the engine and contract hashes. Deployment verifies the code hash and empty access-key list. The contract is keyless and the `moonpark-v4` challenge is open. Creator and prize obligations are included in the solvency guard. Sponsorship uses a separate funded account.

The public replay checks all fifty-five game checkpoints against native Rust, publishes a customized park and ride, claims the park through a different signing account, buys and builds its blueprint, collects the creator’s 90% share and checks solvency. Repeated license calls credit once and refund their new deposit. The proof script preserves progress before subsequent payment checks. Storage deposits may be retained when headroom needs funding.

The v3 eligible prize board was empty when v4 opened. The earlier immutable contract and its funded claims remain available through `/legacy-claims`. A saved unfinished earlier day can be passively settled from its confirmed state before collection.

## Browser checks

All fifteen browser cases passed across the full sponsored-round run and the fourteen-case final verification run. This includes actual testnet licensing, private backup import/export and recovery of queued cosmetic edits after a completed day. The new React components also pass the targeted ESLint check.


The routine suite covers complete construction and closing, prices, the ride camera, ledger, saved-game resume, rejected overlap, mobile layout, first-landing timing, sign-in guards, immediate design changes, palette inheritance and the opening movie’s playback/fallback. The opt-in NEAR flow covers sponsored account creation, restricted-key settlement, named ride customization, final verification, park publication and blueprint publication.

A separate public-park integration check covers its verified closing record, explorable rendered layout, coaster POV and mobile sizing. The licensing browser check resumes an admitted test account, buys a community design through the actual exchange, confirms the creator balance increase and verifies the constructed blueprint ID onchain.

Run the integration checks after the public replay has seeded its fixture.

```sh
npm run test:chain
MOON_CHAIN_UI=1 MOON_PUBLIC_UI=1 npm run test:game
```

Use `CHROMIUM_PATH` to select Chromium. GPU verification on this machine uses `MOON_CAPTURE_GPU=1 CHROMIUM_PATH=/usr/lib/chromium/chromium`, with hardware video decode disabled for this Vulkan test setup. Software rendering retains its direct-render fallback.

TypeScript, whitespace checks and the production Worker/browser build are verified before publication. The external wallet approval and full human social sign-in handoffs require human review. Contract-level claims and real testnet creator payments are exercised with separate signing accounts. Public visits animate ambient guests around a verified layout.

## Presentation

The existing 40-second film, original score, narration, 1080p desktop delivery and portrait mobile delivery accompany the new game. Its editable production and provenance are in `MOONPARK-CINEMA.md`. The new attraction styles use original code-native geometry and material changes. No film re-export was needed for this feature release.

Current evidence is recorded in [the public replay](moon-v4-testnet-smoke.json), [Sandbox settlement](moon-v4-sandbox-smoke.json) and [the full sponsored browser day](moon-v4-browser-smoke.json). The public replay verified all 55 checkpoints, a signed claim by a different account, licensed construction, a 0.0045 tNEAR creator payment and solvent protected balances. Its heaviest batch used 51.02 TGas.

MyNearWallet disabled new app connections during its November 2026 sunset. The release uses NEAR Connect with current testnet-capable wallets. The picker and Intear connection-method screen were inspected in-browser. This environment reached Meteor’s Cloudflare block, and the final personal wallet approval remains a human verification step. [MyNearWallet sunset notice](https://www.mynearwallet.com/sunset)
