import { createNeonAuth } from "@neon/auth/next/server";

let auth: ReturnType<typeof createNeonAuth> | undefined;

export function getAuth() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !secret) return null;
  return (auth ??= createNeonAuth({
    baseUrl,
    cookies: { secret, sameSite: "lax" },
  }));
}

export async function identity() {
  const auth = getAuth();
  if (!auth) return null;
  const { data, error } = await auth.getSession();
  if (error) throw new Error("Sign-in could not be verified. Please retry.");
  return data?.user.emailVerified ? data : null;
}
