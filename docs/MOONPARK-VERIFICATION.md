# Moonpark v3 verification

The v3 ruleset adds fixed-share merchant concessions, transferable NEP-171 ownership, funded testnet rewards and a separate competition escrow. It uses a new keyless testnet contract; historical v1/v2 deployments and evidence are retained. The visible nine-minute timer begins at the first landing after the cinematic handoff.

## Deterministic economy

Fifteen simulation tests and nineteen contract tests cover atomic commands, ownership, revisions, idempotency, elapsed-time limits, connectivity, cash/goods conservation, resale, insolvency, closing and the new mechanics. Partnership tests verify that funding is reserved from a finite balance, old sales cannot meet a new target, rewards pay once, duplicate acceptance fails and expired grants return without refunding the merchant's investment. Shuttle tests verify eight-person arrival groups and boarding before departure.

Five complete nine-minute strategies compare native Rust with browser WASM at all 55 checkpoints each: **275 exact state matches**. The Gold fixture completes all three partnerships, scores **7,737**, delights **96** visitors and records **749** transfers. Balanced and family strategies also clear Gold without the partnership fixture's exact choices. The fixture is verification code, not an automated prize entry.

## NEAR execution

The real contract runs in local NEAR Sandbox with command ownership, retry and timing checks. A complete Gold campaign compares 30 batches against browser WASM and verifies the canonical partnership getter and zero remaining reserved funding. The heaviest batch consumed approximately **55.53 TGas**; the total was approximately **1,450.95 TGas**.

[Public testnet evidence](moon-testnet-smoke.json) records 55 confirmed checkpoints against the native replay, all three completed partnerships, their payout transaction references and the final 7,737-point state. The evidence records per-batch gas as well as public transaction hashes. The public build/configuration manifests record the deployed code and browser-WASM hashes.

The browser suite now contains ten tests, including the first-landing timer and mobile ownership explanation. The opt-in NEAR round adds real reward collection and a reviewed ownership transfer. The complete NEAR round exercises sponsored account creation, a restricted signing key, construction, investment, a reserved grant, 4× simulation, mid-round reload/resume, final settlement and a persisted payout-receipt link, funded reward collection and NFT ownership transfer. A separate finalized-chain readback matched the hosted result. Browser evidence, transaction hashes and reservation/payment receipts are recorded in `moon-browser-smoke.json`. Guest and verification runs are not prize eligible.

## Browser and film

The routine suite covers construction/connection, sliders, path purchase/removal, the ride camera, income ledger, full-round closing, persistent canvas, save/resume, invalid overlap, mobile layout and the conditional top-five board. It separately checks unauthorized ranked/profile requests, partnership funding/completion/departures and actual film decoding/playback/skip. The opt-in complete NEAR round extends these checks through the hosted API and chain.

The film is a deterministic 40-second, 1,200-frame export with 1080p and 720p H.264/AAC deliveries. Full decode, dimensions, duration, frame count and audio levels are verified by the production scripts; representative exported frames and browser playback are reviewed separately. Hosted desktop playback, seeking and handoff passed, as did the live fallback when both movie sources were blocked. A separate 390×844 browser check confirmed selection/playback of the 720p film and the handoff into gameplay. Downloaded hosted assets match both hashes in the public manifest. See `MOONPARK-CINEMA.md` for the editable sources, audio measurements and credits.

TypeScript and the production Worker/browser build are checked before publication. Human review remains the authority on enjoyment and pacing. Hosted ranked identity uses the Sites social gateway; Google remains an optional standalone-host alternative. Anonymous requests fail closed. The real human sign-in handoff is checked separately from anonymous automated play; verification runs never enter prize standings. See `NEAR-ECONOMY.md` for the limits of human award attestation and the separate unfunded USD pledge.

## Ownership and fund protection

Contract tests cover funded one-time issuance, owner-only claims after transfer, pending/double-spend rejection, failed payment recovery, finite reserve return, transfer-call claim locking, frozen weighted prize allocation, sponsor-only award attestation and immutable allocation. An explicit collateral test rejects game storage that would consume reward backing. The full Sandbox run transfers the concession to another account, pays that account, advances past the prize cutoff, allocates and pays the winner, and rejects duplicate claims and external callback forgery. The deploy script checks the actual code hash and empty access-key list.
