import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const provisioning = sqliteTable("provisioning", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  sessionKey: text("session_key").notNull(),
  status: text("status").notNull(),
  ip: text("ip").notNull(),
  createdAt: integer("created_at").notNull(),
});
