export default function Terms() {
  return (
    <main
      style={{
        maxWidth: 760,
        margin: "50px auto",
        padding: 24,
        lineHeight: 1.8,
      }}
    >
      <h1>Moonpark competition terms</h1>
      <p>
        The conditional giveaway is a personal commitment by the Moonpark
        creator. It is not sponsored or guaranteed by NEAR or the hackathon
        organizers. No purchase or entry payment is required.
      </p>
      <p>
        If Moonpark wins first place in the Games With Real Economies track,
        four eligible players receive US$400, US$300, US$200 and US$100. If
        Moonpark wins the overall grand prize, those amounts become US$2,000,
        US$1,500, US$1,000 and US$500 instead. The larger pool replaces the
        smaller. No qualifying win means no USD payout. The USD pledge is not
        currently funded or escrowed. A separate funded testnet escrow
        demonstrates the contract's ranking and payout mechanism; testnet tokens
        have no cash value and do not fund this USD pledge.
      </p>
      <p>
        Prize-eligible runs must belong to the published, opened Moonpark
        challenge and be completed onchain by November 18, 2026 at 23:59 UTC.
        Internal playtests, offline practice and guest runs are not eligible.
        One best score per signed-in player is ranked; one prize per eligible
        person. Automated play, duplicate-person entries, identity abuse and
        exploited runs are ineligible. Winners are reviewed before manual
        payment. The creator will request proof of account ownership and arrange
        payment after the qualifying hackathon award is received.
      </p>
      <p>
        The live top five continues after the cutoff. Separate eligible records
        preserve prize standings. Scores are ordered by total, satisfaction,
        equity gain and earliest qualifying completion. Presentation upgrades
        preserve challenge rules. Any revised gameplay requires a separate
        challenge and cannot overwrite existing prize records.
      </p>
      <p>
        This release uses NEAR testnet. Signed-in runs become provisionally
        eligible after the published challenge opens. The immutable economy
        contract has no access keys or upgrade method. Its testnet prize pool is
        allocated after the cutoff and the creator's qualifying-award
        attestation, in frozen rank order with weights 40/30/20/10. If fewer
        than four accounts qualify, those weights are normalized among them.
        Claims pay only the allocated winner account and cannot be redirected by
        the sponsor. The separate USD commitment remains subject to the human
        eligibility review and mainnet payment described above.
      </p>
      <p>
        Parks are recorded on the current Moonpark v4 NEAR testnet contract. A
        generated game account initially owns its park. Claiming requires the
        nominated wallet account to sign acceptance onchain. The authorized game
        account may update the park, publish designs and rotate its sponsored
        session. Its owner can replace that operator. Private browser keys must
        be backed up for account recovery. Each blueprint license costs 0.005
        testnet NEAR, funded from the buyer’s sponsored account. The creator
        park’s owner at purchase receives 90%, and 10% supports storage. A
        permanent license records attribution for that park. Accrued earnings
        stay with their recipient when park ownership changes. These testnet
        tokens have no cash value. Earlier v3 concession ownership and funded
        claims remain accessible through the earlier-claims page. At the v4
        transition, the v3 eligible prize board was empty. The current giveaway
        uses the separate v4 challenge and its published rules.
      </p>
      <a href="/">Return to Moonpark</a>
    </main>
  );
}
