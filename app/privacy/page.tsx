import Link from "next/link";

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
        site uses Google sign-in through Neon Auth to establish a verified,
        stable player identity. Neon stores your authentication profile and
        session. Moonpark stores your identity link and chosen public player
        name in Neon Postgres. Your email stays private to authentication.
      </p>
      <p>
        NEAR runs, park ownership, published names, designs, reviews, licenses,
        earnings and transfers are public blockchain records. We link them to a
        random public player identifier. Browser-generated gameplay and recovery
        keys stay in your browser. Local game saves contain these private
        credentials; do not share browser storage or private recovery exports.
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
      <Link href="/">Return to Moonpark</Link>
    </main>
  );
}
