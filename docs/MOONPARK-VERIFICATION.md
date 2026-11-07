# Moonpark v2 verification

The v2 ruleset adds recurring passenger shuttles, merchant partnerships and finite reserved grants. It uses a separate testnet deployment; the earlier v1 records are preserved in `moon-v1-testnet-smoke.json` and `moon-v1-browser-smoke.json`. Prize eligibility remains closed during gameplay review.

## Deterministic economy

Thirteen simulation tests and six contract tests cover atomic commands, ownership, revisions, idempotency, elapsed-time limits, connectivity, cash/goods conservation, resale, insolvency, closing and the new mechanics. Partnership tests verify that funding is reserved from a finite balance, old sales cannot meet a new target, rewards pay once, duplicate acceptance fails and expired grants return without refunding the merchant's investment. Shuttle tests verify eight-person arrival groups and boarding before departure.

Five complete nine-minute strategies compare native Rust with browser WASM at all 54 checkpoints each: **270 exact state matches**. The Gold fixture completes all three partnerships, scores **7,408**, delights **96** visitors and records **737** transfers. Balanced and family strategies also clear Gold without the partnership fixture's exact choices. The fixture is verification code, not an automated prize entry.

## NEAR execution

The real contract runs in local NEAR Sandbox with command ownership, retry and timing checks. A complete Gold campaign compares 29 batches against browser WASM and verifies the canonical partnership getter and zero remaining reserved funding. The heaviest batch consumed approximately **53.85 TGas**; the total was approximately **1,382.55 TGas**.

[Public testnet evidence](moon-testnet-smoke.json) records 54 confirmed checkpoints against the native replay, all three completed partnerships, their payout transaction references and the final 7,408-point state. Its heaviest batch consumed approximately **50.41 TGas**. The public build/configuration manifests record the deployed code and browser-WASM hashes.

The browser suite exercises sponsored account creation, a restricted signing key, construction, investment, a reserved grant, 4× simulation, mid-round reload/resume, final settlement and a persisted payout-receipt link. Browser evidence is recorded in `moon-browser-smoke.json`. Guest and verification runs are not prize eligible.

## Browser and film

The routine suite covers construction/connection, sliders, path purchase/removal, the ride camera, income ledger, full-round closing, persistent canvas, save/resume, invalid overlap, mobile layout and the conditional top-five board. It separately checks unauthorized ranked/profile requests, partnership funding/completion/departures and actual film decoding/playback/skip. The opt-in complete NEAR round extends these checks through the hosted API and chain.

The film is a deterministic 40-second, 1,200-frame export with 1080p and 720p H.264/AAC deliveries. Full decode, dimensions, duration, frame count and audio levels are verified by the production scripts; representative exported frames and browser playback are reviewed separately. Its public manifest records asset hashes. See `MOONPARK-CINEMA.md` for the editable sources, audio measurements and credits.

TypeScript and the production Worker/browser build are checked before publication. Human review remains the authority on enjoyment and pacing. Google OAuth still requires an owner-created client; missing credentials fail closed, and the prize challenge will not open until sign-in is verified and rules are frozen.
