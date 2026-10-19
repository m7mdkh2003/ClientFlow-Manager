import {
  date,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { clientsTable } from "./clients";

export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "active",
  "completed",
]);

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
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
});

export type Project = typeof projectsTable.$inferSelect;
export type NewProject = typeof projectsTable.$inferInsert;
