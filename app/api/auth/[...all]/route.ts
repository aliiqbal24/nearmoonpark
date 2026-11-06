import { getAuth } from "@/lib/moon/auth";
export const dynamic = "force-dynamic";
async function handle(request: Request) {
  const auth = getAuth(request);
  if (!auth)
    return Response.json(
      {
        error:
          "Google sign-in is awaiting OAuth configuration. Practice and NEAR playtesting remain available.",
      },
      { status: 503 },
    );
  return auth.handler(request);
}
export const GET = handle;
export const POST = handle;
