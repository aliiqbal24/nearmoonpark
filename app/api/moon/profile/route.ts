import { env } from "cloudflare:workers";
import { getAuth, identity } from "@/lib/moon/auth";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const auth = getAuth(request);
  if (!auth) return Response.json({ configured: false, player: null });
  const signed = await identity(request);
  if (!signed?.user) return Response.json({ configured: true, player: null });
  const db = (env as unknown as { DB: D1Database }).DB;
  let row = await db
    .prepare("SELECT player_id,display_name FROM moon_profile WHERE user_id=?")
    .bind(signed.user.id)
    .first<{ player_id: string; display_name: string }>();
  if (!row) {
    const id = crypto.randomUUID();
    const name = "Moon Explorer " + id.slice(0, 4).toUpperCase();
    await db
      .prepare(
        "INSERT OR IGNORE INTO moon_profile(user_id,player_id,display_name,created_at) VALUES(?,?,?,?)",
      )
      .bind(signed.user.id, id, name, Date.now())
      .run();
    row = await db
      .prepare(
        "SELECT player_id,display_name FROM moon_profile WHERE user_id=?",
      )
      .bind(signed.user.id)
      .first<{ player_id: string; display_name: string }>();
  }
  return Response.json({ configured: true, player: row });
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Origin mismatch" }, { status: 403 });
  const signed = await identity(request);
  if (!signed?.user)
    return Response.json(
      { error: "Sign in to change your player name." },
      { status: 401 },
    );
  const body = (await request.json()) as { display_name?: string };
  const name = String(body.display_name || "")
    .replace(/[\x00-\x1f]/g, "")
    .trim();
  if (!name || [...name].length > 24)
    return Response.json(
      { error: "Choose a name of 1–24 characters." },
      { status: 400 },
    );
  const db = (env as unknown as { DB: D1Database }).DB;
  await db
    .prepare("UPDATE moon_profile SET display_name=? WHERE user_id=?")
    .bind(name, signed.user.id)
    .run();
  return Response.json({ ok: true });
}
