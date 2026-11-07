import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | undefined;

export function getSql() {
  if (!process.env.DATABASE_URL)
    throw new Error("Moonpark database is not configured.");
  return (client ??= neon(process.env.DATABASE_URL));
}

export async function reserveSponsorship(input: {
  id: string;
  accountId: string;
  sessionKey: string;
  playerId: string;
  ip: string;
}) {
  const sql = getSql();
  const now = Date.now();
  const [, rows] = await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(hashtext('moonpark-sponsorship'))`,
    sql`INSERT INTO moon_provisioning(id,account_id,session_key,player_id,status,ip,created_at)
        SELECT ${input.id},${input.accountId},${input.sessionKey},${input.playerId},'pending',${input.ip},${now}
        WHERE (SELECT COUNT(*) FROM moon_provisioning WHERE created_at > ${now - 86400000}) < 100
          AND (SELECT COUNT(*) FROM moon_provisioning WHERE created_at > ${now - 3600000} AND ip = ${input.ip}) < 8
        ON CONFLICT (id) DO NOTHING RETURNING id`,
  ]);
  return rows.length > 0;
}
