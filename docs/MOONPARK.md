# Moonpark implementation

Moonpark is a single-player lunar theme park. The player owns rides and land; visitors and concessionaires are NPCs. The 40-second skippable, narrated opening film introduces the first tourists and an optimistic Moon-colonization dream. A ten-second shuttle approach holds the visible clock at 9:00; the playable opening day then lasts 540 simulation seconds (550 total ticks) at 1×, 2× or 4× speed. The park remains visible and explorable at closing.

## The loop

Twelve inbound shuttles can bring up to eight visitors each. The first three flights are fully booked. Later flights carry four to eight visitors according to departing guests’ satisfaction. Reviews are deterministic and cancelled bookings retain their unspent budgets, preserving the money supply. Shuttles visit the spaceport every forty simulation seconds, descend, dock, unload and collect homebound guests. Later flights continue collecting departures. Guests visibly walk the gangway; they wait for an actual boarding window before the contract marks them gone. Visitors have finite wallets, different thrill preferences, hunger and thirst. They walk along connected paths, choose affordable destinations, queue, pay, ride and form opinions. Repeating the same ride gives diminishing satisfaction. Hovering or selecting a guest reveals their actual state.

The player starts with 1,600 credits, a Lunar Bounce and a food concession. Available construction is deliberately small: Bounce (300), Earthrise Wheel (600), Rover Rally (800), Mass-Driver Coaster (1,200), food/drink kiosks (150), maintenance depot (250) and solar canopy (300). Money is stored as integer centicredits. Paths cost two credits per new tile. Smart connection uses a 0–1 breadth-first search to minimize newly purchased tiles; existing paths are free to reuse. Paths can be erased, and walkers reroute. The gate cannot be erased.

Coasters have two footprint blueprints, rotation and three launch settings. Gentle/standard/extreme cycles take 36/30/24 seconds, consume 2/3/4 power and incur 2/4/6 wear per cycle. Coaster height can be Low, Classic or Skyline. Skyline construction costs 200 extra credits once and uses one extra power. Height changes the track geometry and thrill preference calculation. Capacity upgrades add half the base seats and one power demand. Solar canopies add four power to the base eight. Condition affects operation and resale. Selling a ride returns 70% of invested value multiplied by its remaining condition, so buying, wearing out and reselling rides cannot mint credits.

Concessionaires have their own finite cash and inventories. They set prices through deterministic policies responding to recent demand and scarcity. The player chooses placement and revenue share. Supplies are purchased upfront and arrive after fifteen seconds; connected delivery rovers represent those actual orders. Operating costs are charged every fifteen seconds. A tenant unable to pay closes. Lower shares leave more operating cash, and rebuilding provides fresh working capital. The depot buys parts and charges for repairs. No cosmetic delivery changes the economic record.

Every transfer has a sender, recipient, amount and reason. Goods have explicit stock, deliveries and consumption. The ledger shows a bounded recent history; the simulation retains cumulative totals for scoring and conservation tests. Lunar credits are virtual currency, not redeemable tokens.

## Park identity and signature designs

The park desk sets a name, emblem and coordinated color palette. Attractions inherit the park palette and can override it. Each attraction has three styles and lighting choices. A name and all cosmetic selections can be changed freely, including after closing. Construction and height changes close with opening day. Every design command is validated by the shared engine and stored in authoritative run state.

The NEAR registry links a stable park ID to its owner, authorized operator and published layout. Publishing uses a finished verified run from that park. A public visit shows its actual layout and closing result with ambient visitor animation. Visitors can inspect attractions, use the coaster’s front-seat camera and leave a signed review from their own park.

Guest-tested rides can become immutable blueprints after closing. The exchange carries their layout variant, launch, height, name and appearance. A permanent license costs 0.005 tNEAR from a sponsored buyer account and credits 90% to the creator park’s current owner. Construction retains normal game-credit costs. The contract checks provenance against the licensed configuration. Five blueprints can be published per park.

Wallet claiming requires a nomination and signed acceptance by the recipient. The wallet owner can replace the authorized operator. Depleted sponsored accounts rotate without losing the persistent park. Generated account backup/import and wallet-based authorization support recovery. Full protocol details are in `NEAR-ECONOMY.md`.

Income feedback follows actual ledger receipts, with coin trails, smooth cash updates and sound. NPC merchants stand beside their businesses. Their budgets and inventory continue to drive the economy. V4 removes the former merchant partnership and grant offers.

## Scoring and competition

The contract calculates a maximum 10,000 points: 6,000 for satisfaction, 2,500 for positive equity gain (capped at 1,500 credits) and 1,500 for distinct visitor/ride-family experiences (capped at three per visitor). Guests need a completed ride to contribute satisfaction. Bronze is 3,500, Silver 5,500 and Gold 7,000. Score details are available during play and at closing.

The public top five includes contract-verified guest exhibitions. Signed-in players have one opaque identity and one best result across their sponsored accounts. The hosted site uses the Sites social identity gateway; a random public pseudonym is the default. Guest and verification runs cannot enter the separate provisional prize standings. The cutoff is November 18, 2026 at 23:59 UTC; later results cannot displace that snapshot.

A separate 0.5 tNEAR escrow demonstrates funded competition payouts. After the cutoff, the sponsor may attest a Games-track or grand-prize award once. The contract itself chooses the first four frozen accounts and allocates 40/30/20/10, normalized if fewer qualify. Each account collects its own allocation; failed transfers remain retryable, and successful or pending claims cannot be duplicated. There is no administrator-selected payout recipient or general withdrawal. Human attestation is still required for the external hackathon result; the chain does not know that result by itself.

The personal USD pledge remains separate: US$400/300/200/100 after a Games track first-place award, or US$2,000/1,500/1,000/500 after the grand prize. No qualifying win means no USD payout. This pledge is not funded by testnet tokens; eligibility review and mainnet payments follow the published terms. The fifth place stays visible without a scheduled cash award.

## NEAR architecture

`crates/moon-sim` is the shared deterministic Rust engine. It compiles to native code for tests and replays, browser WebAssembly for responsive prediction, and a dependency of `crates/moon-contract`. The contract build excludes the browser's raw WASM ABI. Build the browser and contract separately to avoid Cargo feature unification.

The client submits commands rather than claimed balances, states or scores. `create_run` admits a sponsored account; `apply_actions` validates ownership, revision, idempotent request ID, commands, costs and elapsed time. Batches have at most sixteen commands and twenty simulation ticks. The contract limits simulation advancement to four times real elapsed time plus a small initial headroom, and rejects new economic decisions after a 565-second maximum wall deadline: ten approach seconds, nine playable minutes and fifteen seconds of bounded confirmation/handoff grace. The grace adds no simulation ticks, spending opportunities or score. Passive settlement can finish an interrupted round after its deadline. Cosmetic-only changes can be submitted after closing without altering money or score.

The browser predicts up to forty ticks ahead, persists its operation journal and rebases on canonical contract responses. Only one transaction is submitted at a time. It uses finalized `EXECUTED` results, avoiding a wait for unrelated gas-refund receipts. A timed-out submission is read back and retried idempotently. Unconfirmed decisions arriving after closing are excluded and labelled. A result stays pending until canonical confirmation.

The sponsor creates testnet subaccounts with a browser-generated recovery key and a restricted session key. The server receives public keys only. The session key can call `create_run`, `apply_actions` and `claim_prize`, has a finite allowance and cannot attach deposits. Initial funding is 0.5 testnet NEAR, with a 0.4 NEAR session allowance. Sponsorship has per-IP and global limits. The browser checks the remaining account balance and key allowance before a new round. Private keys are stored locally; public exports exclude them.

The v4 contract is a keyless child account, separate from the sponsor. Onchain access-key queries return an empty list and the code exposes no upgrade method. Separate creator/prize liability counters prevent new run storage from consuming reserved backing. The sponsorship server checks storage headroom before admitting a new account. `fund_storage` retains only needed new sponsorship and refunds the remainder of that same deposit; it cannot withdraw old funds.

NPC businesses use contract-managed treasuries and deterministic policies, not independent wallet custody or language models. D1 stores private authentication, profile and sponsorship records. The NEAR contract stores canonical game outcomes and rankings. This implementation does not claim NEAR Intents or NEP-245 support.

## Presentation boundary

The persistent Three.js park, animated visitors, occupied rides, delivery rovers, recurring shuttles, coaster camera and rendered opening film are functional. The film includes an original score, narration and sound design, with a live fallback and reduced-motion presentation. Further character/ride artwork and the submission demo follow gameplay review. See `MOONPARK-CINEMA.md` for editable production sources and verification. The earlier Mars prototype remains at `/legacy`.
