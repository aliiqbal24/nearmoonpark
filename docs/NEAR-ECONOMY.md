# Why Moonpark uses NEAR

The player makes park decisions; NEAR supplies transferable ownership, public economic rules and funded settlement. Extra crypto screens are optional. One click to back a merchant issues the concession; the closing screen leads to collection. The normal game loop uses sponsored accounts and restricted keys without wallet extensions, seed-phrase entry or gas prompts.

## What a concession owns

A NEP-171 token identifies one merchant agreement in one opening day (`run_id:partnership_id`). Accepting invests 100 lunar park credits, fixes a 20% sales share and protects those terms against rent changes or demolition. The game records actual post-agreement income. An independent testnet pool reserves up to 0.02 tNEAR for the token, subject to available backing. Its claim accrues at 0.0001 tNEAR per earned lunar credit, capped by that reserve.

The NFT owner controls the uncollected testnet claim. Standard `nft_transfer`, `nft_transfer_call`, approval, metadata and enumeration methods work independently of the Moonpark interface. The founder still operates the park and retains its game credits and score; ownership transfer cannot buy a ranked advantage. NFT ownership does not promise future opening days or cash value.

Claims transfer actual testnet NEAR from the contract, with pending and paid accounting. Private callbacks make a failed transfer retryable. Transfer-call acceptance locks prevent temporary receivers from collecting before ownership resolves. At closing, unused reserves return to the business pool and earned unclaimed funds remain reserved.

## Competition and the conditional giveaway

The contract validates each command and computes scores from its own state. Guest exhibitions can appear on the public board; only admitted signed-in identities in the opened challenge enter the separate provisional prize snapshot. All runs have the same resources, arrivals and rules. Each identity has one best result. The cutoff is November 18, 2026 at 23:59 UTC.

A separate **0.5 tNEAR demonstration escrow** has been deposited. After the cutoff, the sponsor can attest a qualifying track or grand-prize award once. The contract chooses the first four frozen ranked accounts and allocates 40/30/20/10, normalized if fewer qualify. Winner accounts collect directly. The sponsor cannot pick another payout recipient, rewrite an allocated tier, or withdraw the deposited prize pool. Successful/pending claims cannot pay twice; failed transfers remain retryable.

The external hackathon award still needs human attestation. Social admission, human eligibility review and availability of gas sponsorship are trust boundaries; they are not magically decentralized by the scoring contract. The **US$1K/US$5K personal pledge remains conditional and unfunded**, with mainnet payment and eligibility review separate from this testnet mechanism. Testnet tokens do not fund that USD pledge.

## Who can change the rules or take funds?

The v3 economy account has no access keys and exposes no upgrade or general withdrawal method. The sponsor is a separate account. The owner cannot replace the economy code through that sponsor key. The reproducible deploy script compares local and deployed code hashes and asserts an empty access-key list.

Business and prize obligations are tracked separately. Before writing growing run/player state, the contract checks that liquid balance still covers both obligations plus headroom. Game storage cannot consume reserved rewards. The sponsor checks headroom before admitting new accounts and can top it up. `fund_storage` can refund only the unneeded part of its caller's new deposit; it cannot extract previously held funds.

## Public interfaces

| Method | Purpose |
| --- | --- |
| `get_run`, `get_challenge` | Canonical economy, score and fixed rules |
| `get_merchant_wallets` | Contract-managed merchant cash, inventory, pricing and reasoning |
| `get_concessions`, `get_business_share` | Ownership-linked reserves, earned/paid/pending rewards |
| `nft_token`, `nft_tokens_for_owner`, `nft_metadata` | Standard discoverable ownership and metadata |
| `nft_transfer`, `nft_transfer_call` | Standard ownership transfer; one yocto deposit |
| `claim_business_reward` | Current owner collects its unclaimed reward |
| `get_prize_snapshot`, `get_prize_claim` | Frozen ranking, funded escrow and winner entitlement |
| `claim_prize` | Allocated winner collects its prize |
| `get_fund_safety` | Liquid backing, obligations and storage headroom |

NPC wallets are contract-managed simulation balances. NPCs have no independent signing keys. Lunar credits and stock are game state, not NEP-245 assets. There are no NEAR Intents swaps or LLM-controlled agents. An original NEAR contract fitting the track is explicitly allowed by official Q-011; the named protocols and sample prompt are suggestions. See [the rules](https://nearhackathon.com/HACKATHON.md).

## Evidence

[Sandbox evidence](moon-sandbox-smoke.json) includes an actual ownership transfer, rejection of the former owner, collection by the new owner, successful frozen-prize settlement and duplicate/private-callback rejection. [Public testnet evidence](moon-testnet-smoke.json) records the full replay, ownership/payment receipts and backing checks. [Browser evidence](moon-browser-smoke.json) records the complete player flow. Historical v1/v2 evidence is retained under its versioned filenames.
