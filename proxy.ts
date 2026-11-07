import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@/lib/moon/auth";

// Exchange Neon's OAuth verifier on the public game entry page.
// Ranked API routes independently verify the resulting session.
export function proxy(request: NextRequest) {
  const auth = getAuth();
  if (!auth) return NextResponse.next();
  return auth.middleware({ publicRoutes: ["/"] })(request);
}

export const config = { matcher: ["/"] };
