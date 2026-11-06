# Moonpark implementation

Moonpark is a single-player lunar theme park. The player owns rides and land; visitors and concessionaires are NPCs. The 40-second skippable opening introduces the first tourists and an optimistic Moon-colonization dream. The playable opening day lasts 540 simulation seconds at 1×, 2× or 4× speed. The park remains visible and explorable at closing.

## The loop

Six rockets bring sixteen visitors each. Visitors have finite wallets, different thrill preferences, hunger and thirst. They walk along connected paths, choose affordable destinations, queue, pay, ride and form opinions. Repeating the same ride gives diminishing satisfaction. Hovering or selecting a guest reveals their actual state.

The player starts with 1,600 credits, a Lunar Bounce and a food concession. Available construction is deliberately small: Bounce (300), Earthrise Wheel (600), Rover Rally (800), Mass-Driver Coaster (1,200), food/drink kiosks (150), maintenance depot (250) and solar canopy (300). Money is stored as integer centicredits. Paths cost two credits per new tile. Smart connection uses a 0–1 breadth-first search to minimize newly purchased tiles; existing paths are free to reuse. Paths can be erased, and walkers reroute. The gate cannot be erased.

Coasters have two footprint blueprints, rotation and three launch settings. Gentle/standard/extreme cycles take 36/30/24 seconds, consume 2/3/4 power and incur 2/4/6 wear per cycle. Capacity upgrades add half the base seats and one power demand. Solar canopies add four power to the base eight. Condition affects operation and resale. Selling a ride returns 70% of invested value multiplied by its remaining condition, so buying, wearing out and reselling rides cannot mint credits.

Concessionaires have their own finite cash and inventories. They set prices through deterministic policies responding to recent demand and scarcity. The player chooses placement and revenue share, or invests 100 credits. Supplies are purchased upfront and arrive after fifteen seconds; connected delivery rovers represent those actual orders. Operating costs are charged every fifteen seconds. A tenant unable to pay closes until investment restores operating cash. The depot buys parts and charges for repairs. No cosmetic delivery changes the economic record.

Every transfer has a sender, recipient, amount and reason. Goods have explicit stock, deliveries and consumption. The ledger shows a bounded recent history; the simulation retains cumulative totals for scoring and conservation tests. Lunar credits are virtual currency, not redeemable tokens.

## Scoring and competition

The contract calculates a maximum 10,000 points: 6,000 for satisfaction, 2,500 for positive equity gain (capped at 1,500 credits) and 1,500 for distinct visitor/ride-family experiences (capped at three per visitor). Guests need a completed ride to contribute satisfaction. Bronze is 3,500, Silver 5,500 and Gold 7,000. Score details are available during play and at closing.

Signed-in players have one opaque identity and one best leaderboard entry across their sponsored accounts. Google names and email addresses are not published; a pseudonym is the default. Anonymous NEAR playtests are not ranked. The live board retains the top five. Prize candidates are retained separately, so later play cannot displace eligible pre-cutoff results. The cutoff is November 18, 2026 at 23:59 UTC.

The public conditional pledge is present before prize eligibility opens. A Games track win yields US$400/300/200/100 for the first four eligible players. A grand-prize win replaces that pool with US$2,000/1,500/1,000/500. The fifth place remains visible without a cash award. No win means no payout. This is an unfunded, manually paid promise after the organizer receives an award, not escrow. Terms explain identity, anti-automation and eligibility requirements.

The deployed playtest challenge remains closed to prizes. After gameplay review, configure and verify Google sign-in, freeze the rules/build, then explicitly open the challenge. The deployment script refuses to upgrade an opened challenge.

## NEAR architecture

`crates/moon-sim` is the shared deterministic Rust engine. It compiles to native code for tests and replays, browser WebAssembly for responsive prediction, and a dependency of `crates/moon-contract`. The contract build excludes the browser's raw WASM ABI. Build the browser and contract separately to avoid Cargo feature unification.

The client submits commands rather than claimed balances, states or scores. `create_run` admits a sponsored account; `apply_actions` validates ownership, revision, idempotent request ID, commands, costs and elapsed time. Batches have at most sixteen commands and twenty simulation ticks. The contract limits simulation advancement to four times real elapsed time plus a small initial headroom, and rejects new decisions after the nine-minute wall-clock deadline. Passive settlement can finish an interrupted round after its deadline.

The browser predicts up to forty ticks ahead, persists its operation journal and rebases on canonical contract responses. Only one transaction is submitted at a time. It uses finalized `EXECUTED` results, avoiding a wait for unrelated gas-refund receipts. A timed-out submission is read back and retried idempotently. Unconfirmed decisions arriving after closing are excluded and labelled. A result stays pending until canonical confirmation.

The sponsor creates testnet subaccounts with a browser-generated recovery key and a restricted session key. The server receives public keys only. The session key can call only `create_run` and `apply_actions`, has a finite allowance and cannot attach deposits. Initial funding is 1.5 testnet NEAR, with a 1.2 NEAR session allowance. Sponsorship has per-IP and global limits. The browser checks the remaining account balance and key allowance before a new round. Private keys are stored locally; public exports exclude them.

NPC businesses use contract-managed treasuries and deterministic policies, not independent wallet custody or language models. D1 stores private authentication, profile and sponsorship records. The NEAR contract stores canonical game outcomes and rankings. This implementation does not claim NEAR Intents or NEP-245 support.

## Presentation boundary

The persistent Three.js park, animated visitors, occupied rides, delivery rovers, rockets, coaster camera and live opening sequence are functional. Models and synthesized WebAudio are original placeholders. The next phase follows human gameplay review: finished character and ride assets, lighting and effects, original polished music/sound, cinematic finishing and the submission demo. The earlier Mars prototype remains at `/legacy`.
