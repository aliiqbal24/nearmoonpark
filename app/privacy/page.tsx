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
        Practice does not require sign-in. Ranked play uses Google to establish
        a stable player identity. We store your account name, email, session and
        chosen public player name in our application database. Your email is not
        published on NEAR or the leaderboard.
      </p>
      <p>
        Ranked runs and game transactions are public blockchain records. We link
        them to a random public player identifier. Browser-generated gameplay
        and recovery keys stay in your browser. Local game saves contain these
        private credentials; do not share browser storage or private recovery
        exports.
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
