import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const sql = neon(process.env.DATABASE_URL);
const migration = await readFile(
  new URL("../db/migrations/0001-vercel.sql", import.meta.url),
  "utf8",
);
const statements = migration
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);
await sql.transaction(statements.map((statement) => sql.query(statement)));
console.log("Moonpark database schema is ready.");
