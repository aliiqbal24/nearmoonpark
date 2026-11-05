# Verification record

## Automated coverage

- Native simulation: legal-action validation, atomic rejection, fixed credit supply, nonnegative inventories, aid limits, two successful strategies across six seeds, every legal decision prefix has a continuation, causal references, trade history, all ending paths, and normal/fast-forward economic equivalence.
- Contract: admission, idempotent run creation, ownership enforcement, stale-revision rejection, and authoritative output matching the shared core.
- Native/browser parity: 27 states across three seeds and complete eight-choice paths compared as exact JSON values.
- Browser: full campaign with aid, forecast, eight choices, trading records, ending, refresh/resume, replay; narrow-screen overflow check; NEAR guest provisioning and a real restricted-key-signed decision.
- Production build and TypeScript checks.

## Testnet evidence

`public/near-config.json` gives the active contract and deployed code hash. `docs/testnet-smoke.json` contains a complete real testnet run, transaction hashes, 24 daily summaries, and actual trades. The sponsor uses testnet faucet funds only. No mainnet transaction was made.

The full chain smoke test completed 449 goods trades. Three-sol execution grew from approximately 12 TGas early to approximately 102 TGas at the finale, against a 250 TGas allowance. These are measured examples, not worst-case guarantees for future expanded scenarios.

## Playtest limits

Human readability, emotional engagement, difficulty, and the 8–10 / 3–5 minute pacing targets still need the owner's playtest. Automated fast runs prove functionality rather than reading time. Public RPC latency varies. Sponsorship has finite testnet funds and rate limits; local practice remains explicit and available.

Guest account recovery is device-local unless the recovery export is saved. There is no email login or cross-device account discovery. There are eight runs per admitted testnet account. The most recent eight practice records are retained locally; exports preserve a chosen record.

The first delivery intentionally uses simple SVG geometry, text, and CSS animation. Final art, sound, cinematics, and the submission demo are a later pass after gameplay acceptance.

The full local-node integration test uses `near-sandbox` 0.3.5 (node 2.14.0), the official near-api-js client, and the actual compiled contract WASM. It tests a complete campaign plus rejected unauthorized and stale calls, independently of public testnet.

All 24 authoritative testnet sols also matched browser-WASM output exactly at every committed three-sol boundary. Local Sandbox integration passed independently. Current unit checks: 10 simulation tests and 4 contract tests; browser checks: 2 offline flows and one separately opted-in testnet flow.

Hosted QA caught a FastNear testnet shard error during guest creation. Both hosted sponsorship and browser signing now use two RPC providers. Provisioning retries reuse the same generated keys/account, and recovery exports carry a run identifier for restoration in a clean browser. Practice remains explicitly labeled if a network outage prevents sponsored play.
