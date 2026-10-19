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
  unique,
} from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "done",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
]);

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id"),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("todo"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  dueDate: date("due_date", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  ownerIdIndex: index("tasks_owner_id_idx").on(table.ownerId),
  ownerIdIdUnique: unique("tasks_owner_id_id_unique").on(
    table.ownerId,
    table.id,
  ),
  ownerProjectForeignKey: foreignKey({
    name: "tasks_owner_project_fk",
    columns: [table.ownerId, table.projectId],
    foreignColumns: [projectsTable.ownerId, projectsTable.id],
  }),
}));

export type Task = typeof tasksTable.$inferSelect;
export type NewTask = typeof tasksTable.$inferInsert;
