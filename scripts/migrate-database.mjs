import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const sql = neon(process.env.DATABASE_URL);
for (const name of ["0001-vercel.sql", "0002-cloud-save.sql"]) {
  const migration = await readFile(
    new URL(`../db/migrations/${name}`, import.meta.url),
    "utf8",
  );
  const statements = migration
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  await sql.transaction(statements.map((statement) => sql.query(statement)));
}
console.log("Moonpark database schema is ready.");
