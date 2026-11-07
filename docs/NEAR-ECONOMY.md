# Why Moonpark uses NEAR

Moonpark v4 makes a player’s park and signature ride designs persistent economic objects. Players can publish a guest-tested ride, license a design from another park and collect creator income. NEAR records ownership, verifies the design’s source and settles actual testnet payments. Ordinary construction uses sponsored accounts and responsive local prediction.

## Persistent park ownership

Every admitted game account gets a park registry entry when it starts its first opening day. The entry records a stable park ID, owner account ID, authorized game operator, name, emblem, published opening day and signature designs. New scored days use standardized resources. Publishing a finished day gives that persistent park a public layout at `/park/OWNER_ACCOUNT`, with a stable alternative at `/park/p-PARK_ID`.

The generated account initially owns its park. Claiming connects a supported wallet through NEAR Connect on testnet, nominates its account and requires that account to sign `accept_park`. A nomination alone does not transfer ownership. The recipient cannot already own another park. The game operator can update and publish the park. Its owner can replace that operator, including when restoring on a new browser.

A depleted sponsored operator can rotate to a fresh admitted account without changing the park ID, owner, licenses or published layout. Ranked operators must retain the same admitted player identity. Generated account keys remain browser-held. The park desk exports a private backup containing operator and locally held owner credentials, and verifies imported recovery keys against NEAR before storing them. An external wallet owner can authorize another browser without sharing a seed phrase.

## Signature rides and licenses

A signature blueprint is published from a completed, contract-verified opening day and a ride that actually served guests. Its immutable record includes kind, footprint variant, launch setting, height, curated palette, design style, lighting, name and original creator attribution. Inherited colors are resolved at publication, so the design keeps its creator’s appearance in another park. A park can publish five designs. Licensed rides retain source attribution and cannot be republished as original blueprints through the contract.

Each park pays once for a permanent license. The exact fee is **0.005 testnet NEAR**, taken from its sponsored account. The contract credits **90%** to the creator park’s owner at the time of purchase. The remaining **10%** supports storage. Game construction still costs the normal number of lunar credits, including the Skyline height upgrade. Buying a license provides the published configuration and its onchain provenance.

Repeated license submissions refund the new deposit and credit the creator once. Licensed construction is checked against both the buyer’s entitlement and the immutable design. Creator earnings accumulate as liabilities. A pending withdrawal cannot be spent again. A failed transfer restores availability through a private callback. Accrued earnings stay with their recipient if park ownership subsequently changes.

Published designs can be independently inspected through NEAR. A player could manually recreate visual choices. The contract records a paid license and attribution for builds declaring that provenance.

## Visitors and competition

NPCs have finite virtual budgets, cash, inventory, preferences and deterministic decision policies. Departing visitors’ satisfaction affects later rocket occupancy. Community park reviews are separate signed records, with one editable rating per reviewing park. Public park pages animate ambient visitors around the published layout and expose the actual closing score.

The contract validates gameplay commands and calculates scores. Signed-in identities get one best eligible result, while guest exhibitions appear on the public board. Park ownership, licenses and cosmetics persist across attempts. Each scored attempt starts with the same resources and guest schedule, with recommendations responding deterministically to that attempt’s decisions. Cosmetic edits remain available after closing and preserve score and finances.

The current immutable challenge is **moonpark-v4**. The prior v3 eligible prize board was empty when v4 opened. Historical concession ownership and funded claims are available at `/legacy-claims` on the earlier immutable contract.

A separate **0.5 tNEAR** competition escrow demonstrates payouts. After the November 18, 2026, 23:59 UTC cutoff, the sponsor may attest a qualifying hackathon award once. The contract allocates the first four frozen accounts at weights 40/30/20/10, normalized if fewer qualify. The park owner at completion receives the winner entitlement. Eligible accounts collect directly. The external award requires human attestation.

The personal **US$1K track / US$5K grand-prize pledge** remains conditional and unfunded. Its eligibility review and eventual payment are separate from testnet. Testnet tokens have no cash value. Lunar game credits are virtual simulation currency.

## Contract and custody boundaries

The v4 contract is a keyless child account with no upgrade or general withdrawal method. Its separate sponsor creates game accounts and supplies storage funding. The deploy script compares code hashes and verifies the empty access-key list. Creator and prize liabilities are protected from storage growth. `fund_storage` refunds only the unneeded part of a new deposit.

The server receives public keys. Ordinary gameplay uses a restricted session key. Park administration and testnet license deposits use the browser-held generated recovery key. Wallet claiming and external-owner administration use NEAR Connect with testnet-capable wallets. Sponsorship, identity admission, browser key storage, wallet availability and external-award attestation remain operational trust boundaries.

## Public interfaces

| Method | Purpose |
| --- | --- |
| `get_park`, `get_park_by_owner`, `get_park_by_operator`, `list_parks` | Persistent ownership and published park identity |
| `save_park` | Revision-checked identity and verified layout publication |
| `nominate_park_owner`, `accept_park` | Two-step signed ownership claim |
| `set_park_operator`, `rotate_park_operator` | Owner recovery and sponsored session rotation |
| `publish_blueprint`, `get_blueprint`, `list_blueprints` | Guest-tested immutable ride designs |
| `license_blueprint`, `has_license` | Deposit-backed permanent licensing |
| `get_creator_earnings`, `claim_creator_earnings` | Backed creator balances and retryable payments |
| `rate_park` | One editable signed review per reviewing park |
| `get_run`, `get_challenge`, `get_merchant_wallets` | Canonical simulation and NPC treasuries |
| `get_prize_snapshot`, `get_prize_claim`, `claim_prize` | Frozen eligible standings and prize collection |
| `get_fund_safety` | Solvency and storage headroom |

NEAR Connect filters for testnet support. MyNearWallet’s retired connection flow is excluded. Wallet credentials are handled by the selected wallet.

The game uses an original NEAR contract. Official Q-011 permits this implementation for the track. [Official hackathon rules](https://nearhackathon.com/HACKATHON.md)
