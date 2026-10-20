import {
  date,
  foreignKey,
  integer,
  index,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { clientsTable } from "./clients";

export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "active",
  "completed",
]);

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id"),
  name: text("name").notNull(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clientsTable.id),
  description: text("description"),
  status: projectStatusEnum("status").notNull().default("planning"),
  deadline: date("deadline", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  ownerIdIndex: index("projects_owner_id_idx").on(table.ownerId),
  ownerIdIdUnique: uniqueIndex("projects_owner_id_id_unique").on(
    table.ownerId,
    table.id,
  ),
  ownerClientForeignKey: foreignKey({
    name: "projects_owner_client_fk",
    columns: [table.ownerId, table.clientId],
    foreignColumns: [clientsTable.ownerId, clientsTable.id],
  }),
}));

export type Project = typeof projectsTable.$inferSelect;
export type NewProject = typeof projectsTable.$inferInsert;
