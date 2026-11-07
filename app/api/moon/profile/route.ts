import { getAuth, identity } from "@/lib/moon/auth";
import { getSql } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!getAuth()) return Response.json({ configured: false, player: null });
  const signed = await identity();
  if (!signed?.user) return Response.json({ configured: true, player: null });
  const sql = getSql();
  let [row] =
    await sql`SELECT player_id,display_name FROM moon_profile WHERE user_id=${signed.user.id}`;
  if (!row) {
    const id = crypto.randomUUID();
    const name = "Moon Explorer " + id.slice(0, 4).toUpperCase();
    await sql`INSERT INTO moon_profile(user_id,player_id,display_name,created_at)
      VALUES(${signed.user.id},${id},${name},${Date.now()}) ON CONFLICT (user_id) DO NOTHING`;
    [row] =
      await sql`SELECT player_id,display_name FROM moon_profile WHERE user_id=${signed.user.id}`;
  }
  return Response.json({ configured: true, player: row });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Origin mismatch" }, { status: 403 });
  const signed = await identity();
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
  const sql = getSql();
  await sql`UPDATE moon_profile SET display_name=${name} WHERE user_id=${signed.user.id}`;
  return Response.json({ ok: true });
}
