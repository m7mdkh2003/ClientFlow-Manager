import {
  index,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id"),
  name: text("name").notNull(),
  company: text("company"),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  ownerIdIndex: index("clients_owner_id_idx").on(table.ownerId),
  ownerIdIdUnique: unique("clients_owner_id_id_unique").on(
    table.ownerId,
    table.id,
  ),
}));

export type Client = typeof clientsTable.$inferSelect;
export type NewClient = typeof clientsTable.$inferInsert;
