import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "@/db";
import { user, session, account, verification } from "@/db/schema";
export type AuthEnv = {
  DB?: D1Database;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
};
export function getAuth(request: Request) {
  const e = env as unknown as AuthEnv;
  if (
    !e.DB ||
    !e.GOOGLE_CLIENT_ID ||
    !e.GOOGLE_CLIENT_SECRET ||
    !e.BETTER_AUTH_SECRET
  )
    return null;
  const origin = e.BETTER_AUTH_URL || new URL(request.url).origin;
  return betterAuth({
    appName: "Moonpark",
    baseURL: origin,
    secret: e.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), {
      provider: "sqlite",
      schema: { user, session, account, verification },
    }),
    socialProviders: {
      google: {
        clientId: e.GOOGLE_CLIENT_ID,
        clientSecret: e.GOOGLE_CLIENT_SECRET,
      },
    },
    emailAndPassword: { enabled: false },
    trustedOrigins: [origin],
    session: { expiresIn: 60 * 60 * 24 * 7 },
    advanced: { useSecureCookies: origin.startsWith("https:") },
  });
}
export async function identity(request: Request) {
  const auth = getAuth(request);
  return auth ? auth.api.getSession({ headers: request.headers }) : null;
}
