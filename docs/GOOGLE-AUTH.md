# Google sign-in

Moonpark uses Neon managed Auth and a free Neon Postgres database through Vercel Marketplace. The game proxies Auth requests through `/api/auth/[...path]`. The home-page proxy exchanges the OAuth verifier for an HTTP-only session. Ranked API handlers independently verify the session and require a verified email.

## Hosted configuration

The Vercel project is `nearmoonpark`. Its production origin is `https://nearmoonpark.vercel.app`, which is registered in Neon Auth's trusted domains. Localhost callbacks are allowed by Neon for development.

Set `NEON_AUTH_BASE_URL` and a random `NEON_AUTH_COOKIE_SECRET` of at least 32 characters as private runtime variables. Marketplace supplies the database connection variables. Pull them into ignored `.env.local` for local development, then run `npm run db:migrate` to create Moonpark's private profile and sponsorship tables. Neon manages its own identity tables.

Never commit credentials or paste them into chat. Rotating the cookie secret invalidates cached sessions.

## Google provider

Google is currently enabled using Neon's shared testing OAuth client. The consent screen identifies Neon. For a Moonpark-branded production consent screen, configure an owned Google OAuth web client in Neon Console under Better Auth. Use the exact redirect URI shown there, which belongs to Neon's hosted Auth service. The game's return URL is `https://nearmoonpark.vercel.app/?ranked=1`.

Only basic identity scopes are requested, including email and profile. The public player name defaults to a pseudonym and can be edited. Google email remains private.

## Verification and prize opening

Verify a fresh sign-in, refresh, sign-out and return visit. Check that anonymous requests cannot obtain ranked sponsorship and that the same verified identity retains its public player ID.

Once gameplay is approved and the final rules and build are frozen, the contract sponsor can explicitly call `open_challenge`. This is a one-time operation. The current playtest deployment has not opened it. Preserve an opened prize contract and deploy a new ruleset for later changes.
