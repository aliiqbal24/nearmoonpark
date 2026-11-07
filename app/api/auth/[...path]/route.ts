import { getAuth } from "@/lib/moon/auth";

export const dynamic = "force-dynamic";

async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const auth = getAuth();
  if (!auth)
    return Response.json(
      {
        error:
          "Sign-in is being configured. Practice and NEAR play are available.",
      },
      { status: 503 },
    );
  const method = request.method as "GET" | "POST";
  return auth.handler()[method](request, context);
}

export const GET = handle;
export const POST = handle;
