export default function Privacy() {
  return (
    <main
      style={{
        maxWidth: 760,
        margin: "50px auto",
        padding: 24,
        lineHeight: 1.8,
      }}
    >
      <h1>Moonpark privacy</h1>
      <p>
        Practice and guest NEAR play do not require sign-in. Ranked play on this
        site uses ChatGPT sign-in to establish a stable player identity. We
        store a site-scoped identity and your chosen public player name. We do
        not publish your email on NEAR or the leaderboard. A separately
        configured Google sign-in deployment may also store the name, email and
        session supplied by that provider.
      </p>
      <p>
        NEAR runs, concession ownership, reward claims and transfers are public
        blockchain records. We link them to a random public player identifier.
        Browser-generated gameplay and recovery keys stay in your browser. Local
        game saves contain these private credentials; do not share browser
        storage or private recovery exports.
      </p>
      <p>
        Account sponsorship records public keys, account identifiers and
        rate-limit data including IP addresses. These protect the limited
        testnet sponsorship budget. Winner verification may require ownership
        and eligibility information before the creator sends a conditional
        prize.
      </p>
      <p>
        You can sign out and clear local practice saves in your browser.
        Blockchain records cannot be erased. Deletion requests for private
        account data can be made to the creator through the public project
        repository once published.
      </p>
      <a href="/">Return to Moonpark</a>
    </main>
  );
}
