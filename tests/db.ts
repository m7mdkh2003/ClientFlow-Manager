import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../lib/db/src/schema";
export * from "../lib/db/src/schema";
export const pgReview = new PGlite();
await pgReview.exec(`
CREATE TYPE project_status AS ENUM ('planning','active','completed');
CREATE TYPE task_status AS ENUM ('todo','in_progress','done');
CREATE TYPE task_priority AS ENUM ('low','medium','high');
CREATE TABLE clients (id SERIAL PRIMARY KEY, owner_id TEXT, name TEXT NOT NULL, company TEXT, email TEXT, phone TEXT, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(owner_id,id));
CREATE TABLE projects (id SERIAL PRIMARY KEY, owner_id TEXT, name TEXT NOT NULL, client_id INTEGER NOT NULL REFERENCES clients(id), description TEXT, status project_status NOT NULL DEFAULT 'planning', deadline DATE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(owner_id,id), FOREIGN KEY(owner_id,client_id) REFERENCES clients(owner_id,id));
CREATE TABLE tasks (id SERIAL PRIMARY KEY, owner_id TEXT, project_id INTEGER NOT NULL REFERENCES projects(id), title TEXT NOT NULL, description TEXT, status task_status NOT NULL DEFAULT 'todo', priority task_priority NOT NULL DEFAULT 'medium', due_date DATE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(owner_id,id), FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id));
`);
export const db = drizzle(pgReview, { schema });
export const pool = { end: () => pgReview.close() };
