# Google sign-in setup

The integration is implemented, but no Google OAuth web client was available in this environment. Browser account setup was unavailable. Until credentials are configured, the game clearly disables Google sign-in and ranked admission; practice and anonymous NEAR playtests remain available.

## Create the client

In Google Cloud Console, choose the project that will own Moonpark. Configure Google Auth Platform branding and audience, then create an OAuth client of type **Web application**. Use the real Moonpark name and the published privacy and terms pages:

- Privacy: `https://last-signal-mars.ajiqbal1.chatgpt.site/privacy`
- Terms: `https://last-signal-mars.ajiqbal1.chatgpt.site/terms`
- Production callback: `https://last-signal-mars.ajiqbal1.chatgpt.site/api/auth/callback/google`
- Local callback, if needed: `http://localhost:5173/api/auth/callback/google`

Configure the appropriate public audience for the competition. An OAuth app restricted to a test-user allowlist will not work for arbitrary judges or players. Only basic identity scopes are used: OpenID, email and profile. Moonpark does not request Gmail or Drive access.

## Store credentials privately

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as hosted runtime secrets. Retain the generated `BETTER_AUTH_SECRET`; changing it invalidates sessions. Set `BETTER_AUTH_URL` to `https://last-signal-mars.ajiqbal1.chatgpt.site` in hosting. A local `.dev.vars` may use `http://localhost:5173`. Never commit credentials or paste them into chat.

Redeploy a saved Site version after changing hosted environment values. D1 migrations include the Better Auth user/session/account/verification tables and the private Moonpark profile and sponsorship tables.

## Verify before opening prizes

Test a fresh sign-in, sign-out and return visit. Confirm that the public name defaults to a pseudonym and can be edited, while the Google email stays private. Play a full ranked round, confirm its canonical NEAR score, then sign in on another browser and check that the same player has one best leaderboard entry. Verify that signed-out requests cannot obtain ranked sponsorship.

Once gameplay is approved and the final rules/build are frozen, the contract sponsor can explicitly call `open_challenge`. It is a one-time operation. The current playtest deployment intentionally has not opened it. Do not upgrade an opened prize contract; deploy a new ruleset instead.
