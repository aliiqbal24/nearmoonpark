# Why Moonpark uses NEAR

Moonpark v9 makes a player’s park and signature ride designs persistent economic objects. Players can publish a guest-tested ride, license a design from another park and collect creator income. NEAR records ownership, verifies the design’s source and settles actual testnet payments. Ordinary construction uses sponsored accounts and responsive local prediction.

## Automatic vendor wallets

Two fictional lunar cameo concession owners run Attention Kitchen and Finality Fizz. Haseeb’s Dragonfly Garage provides automatic maintenance. Park staff maintain rides automatically for a fixed ten-credit service fee. The catalogue has exactly eight building types and permits multiple copies. Shop prices, restocking, per-sale running costs and the 10% park share follow public deterministic rules in `crates/moon-sim/src/catalog.rs` and `lib.rs`. A quiet shop keeps its working capital. The player manages placement and the visitor experience. Rides use fixed fares, open automatically and sell for half their construction investment. Solar canopies receive finite Logistics credits for energy exports. Park profit uses cash plus construction investment for active assets, so building a new attraction preserves its booked value until sale.

Illia, Mert and Lunar Logistics each have a separately created NEAR testnet account. Each account signs `accept_vendor_policy` before the contract can open an economy. Their only access key is restricted to accepting that policy on the immutable game contract. The host holds no NPC trading key in its runtime environment. The deployment script preserves these policy keys privately for reproducibility.

Each park starts with a connected kitchen, drink stall and maintenance garage, a full 3,200-credit building budget and four finite NEP-245 asset types, credits, food, drinks and maintenance parts. Credits use cents, while stock uses whole units. Token IDs include the run ID so one park or day cannot spend another’s budget. The player account holds park credits, each merchant account holds its branches’ credits and stock, and Logistics holds the supplier and builder balances. Visitor budgets share the game contract’s passenger escrow. Paid deliveries already belong to the buyer and count as its inventory in transit.

`apply_actions` verifies the previous token holdings against canonical game state, executes the shared engine, verifies money and goods conservation, clears net account obligations, burns consumed goods and saves the new state atomically. NEP-245 mint, transfer and burn events accompany the clearing. The readable trade journal shows individual purchases, restocks and park shares. A clearing event can net several of those trades together. A failed transaction commits neither game progress nor asset changes, and request IDs make retries idempotent.

Assets are committed to the operating park and its signed vendor policy. Automatic clearing transfers balances between the real accounts. The public transfer and transfer-call methods enforce this operating lock. Returning guests receive explicitly issued test credits after the opening score is sealed. Logistics issues a 1,024-unit shipment whenever an inventory reserve falls below 128 units. The engine records issued supplies and consumption so every mint, transfer and burn reconciles with its ledger. Normal gameplay uses the zero-deposit restricted session key.

All native funding comes from free testnet funds. Credits and inventory have no redemption or cash value. Native testnet NEAR pays gas and storage. Merchant accounts are franchise wallets shared across their shops, with separate asset types for each opening day. Guests have individual simulated budgets inside the shared escrow.

## Persistent park ownership

Every admitted game account gets one stable park and active run. Returning to that account returns its existing park. The registry records the owner, authorized operator, name, emblem, published snapshot and signature designs. Owners can publish after the first landing. Publication snapshots the confirmed run for offline visits at `/park/OWNER_ACCOUNT?version=v9`, with `/park/p-PARK_ID?version=v9` as an ID alternative. Each publication replaces the public revision while the owner continues building. Earlier links select v4, v5, v6, v7 or v8, and unversioned historical links resolve the earlier registries first.

The generated account initially owns its park. Claiming connects a supported wallet through NEAR Connect on testnet, nominates its account and requires that account to sign `accept_park`. A nomination alone does not transfer ownership. The recipient cannot already own another park. The game operator can update and publish the park. Its owner can replace that operator, including when restoring on a new browser.

A depleted sponsored operator can rotate to a fresh admitted account while preserving the park ID, owner, licenses, published snapshot, live simulation and its token balances. Ranked operators must retain the same admitted player identity. Generated account keys are held in the browser. Verified Google sign-in also stores a compact encrypted recovery record in Neon for cross-device restoration. AES-256-GCM binds that record to the authenticated user and contract. The server holds its encryption key as a private Vercel secret. The confirmed simulation is fetched from NEAR when restoring. The park desk exports a private backup containing operator and locally held owner credentials, and verifies imported recovery keys against NEAR before storing them. An external wallet owner can authorize another browser without sharing a seed phrase.

## Signature rides and licenses

A signature blueprint is published from a contract-verified park and a ride that actually served guests. Its immutable record includes kind, footprint variant, launch setting, height, curated palette, design style, lighting, name, authored track control points and original creator attribution. Inherited colors are resolved at publication, so the design keeps its creator’s appearance in another park. A park can publish 32 design versions. A changed design receives a new versioned blueprint ID. Unmodified licensed rides retain source attribution and cannot be republished as original blueprints. Structural redesign clears the source marker, resets the ride's guest-tested status and requires new visitors before publication. The purchased license remains with the park.

Each park pays once for a permanent license. The exact fee is **0.005 testnet NEAR**, taken from its sponsored account. The contract credits **90%** to the creator park’s owner at the time of purchase. The remaining **10%** supports storage. Game construction still costs the normal number of lunar credits, with track geometry and appearance included. Buying a license provides the published configuration and its onchain provenance.

Repeated license submissions refund the new deposit and credit the creator once. Licensed construction is checked against both the buyer’s entitlement and the immutable design. Creator earnings accumulate as liabilities. A pending withdrawal cannot be spent again. A failed transfer restores availability through a private callback. Accrued earnings stay with their recipient if park ownership subsequently changes.

Published designs can be independently inspected through NEAR. A player could manually recreate visual choices. The contract records a paid license and attribution for builds declaring that provenance.

## Visitors and competition

NPCs have finite virtual budgets, cash, inventory, preferences and deterministic decision policies. The first 12 rockets carry the same 96 opening visitors. Their finite visits and budgets bound the competitive score. Community park reviews are separate signed records, with one editable rating per reviewing park. Public park pages animate ambient visitors around the published layout and expose the sealed opening score.

The contract validates commands and calculates the opening score from the first 96 visitors. Their completed departures seal the score, revision and proof hash. Later visitor income and construction continue independently. Signed-in identities get one best eligible leaderboard result, and guest exhibitions appear on the public board. Community reviews are independently signed and do not alter that score.

The current immutable challenge is **moonpark-v9**. Earlier parks, licenses and creator earnings are accessible at `/archive/v8`, `/archive/v7`, `/archive/v6`, `/archive/v5` and `/archive/v4`. V4, v5, v6, v7 and v8 browser saves resume with their archived engines and contracts. Historical v3 concession ownership and funded claims remain at `/legacy-claims`.

A separate **0.5 tNEAR** competition escrow demonstrates payouts. After the November 18, 2026, 23:59 UTC cutoff, the sponsor may attest a qualifying hackathon award once. The contract allocates the first four frozen accounts at weights 40/30/20/10, normalized if fewer qualify. The park owner at completion receives the winner entitlement. Eligible accounts collect directly. The external award requires human attestation.

Only the current finished ruleset’s eligible scores count toward the conditional USD giveaway. Earlier records stay on their original contracts.

The personal **US$1K track / US$5K grand-prize pledge** remains conditional and unfunded. Its eligibility review and eventual payment are separate from testnet. Testnet tokens have no cash value. Lunar game credits are game-issued multi-tokens scoped to one park run.

## Contract and custody boundaries

The v9 contract is a keyless child account with no upgrade or general withdrawal method. Its separate sponsor creates game accounts and supplies storage funding. The deploy script compares code hashes and verifies the empty access-key list. Creator and prize liabilities are protected from storage growth. `fund_storage` refunds only the unneeded part of a new deposit.

Provisioning receives public keys. Authenticated recovery receives generated testnet credentials and encrypts them before database storage. This service can recover a Google-linked sponsored account using its server-held encryption secret. Ordinary gameplay uses a restricted session key. Park administration and testnet license deposits use the browser-held generated recovery key. Wallet claiming and external-owner administration use NEAR Connect with testnet-capable wallets. Sponsorship, identity admission, browser key storage, wallet availability and external-award attestation remain operational trust boundaries.

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
| `get_run`, `get_challenge`, `get_merchant_wallets` | Canonical simulation and vendor branches |
| `accept_vendor_policy`, `get_vendor_policy` | Independently signed deterministic spending policy |
| `get_run_economy` | Confirmed account holdings and finite asset supplies |
| `mt_balance_of`, `mt_batch_balance_of`, `mt_supply`, `mt_batch_supply`, `mt_token` | NEP-245 views |
| `mt_transfer`, `mt_batch_transfer`, `mt_transfer_call`, `mt_batch_transfer_call` | Standard asset interface, restricted while the persistent park policy operates |
| `register_asset_storage` | Deposit-backed recipient storage |
| `get_prize_snapshot`, `get_prize_claim`, `claim_prize` | Frozen eligible standings and prize collection |
| `get_fund_safety` | Solvency and storage headroom |

NEAR Connect filters for testnet support. MyNearWallet’s retired connection flow is excluded. Wallet credentials are handled by the selected wallet.

The game uses an original NEAR contract. Official Q-011 permits this implementation for the track. [Official hackathon rules](https://nearhackathon.com/HACKATHON.md)
