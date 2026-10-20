import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { and, eq, inArray } from "drizzle-orm";
import {
  clientsTable,
  db,
  pool,
  projectsTable,
  tasksTable,
} from "@workspace/db";

const { clerkTestAuth } = vi.hoisted(() => ({
  clerkTestAuth: { userId: null as string | null },
}));

vi.mock("@clerk/express", () => ({
  getAuth: () => ({ userId: clerkTestAuth.userId }),
  clerkMiddleware: () =>
    (_req: unknown, _res: unknown, next: (error?: unknown) => void) => next(),
}));

import app from "./app";

const fixtureTag = `authz-${randomUUID()}`;
const ownerA = `${fixtureTag}-owner-a`;
const ownerB = `${fixtureTag}-owner-b`;
const sameOriginHeaders = {
  Host: "clientflow.test",
  Origin: "http://clientflow.test",
};

const api = {
  get(userId: string | null, path: string) {
    clerkTestAuth.userId = userId;
    return request(app).get(path).set(sameOriginHeaders);
  },
  post(userId: string | null, path: string, body: Record<string, unknown>) {
    clerkTestAuth.userId = userId;
    return request(app).post(path).set(sameOriginHeaders).send(body);
  },
  patch(userId: string | null, path: string, body: Record<string, unknown>) {
    clerkTestAuth.userId = userId;
    return request(app).patch(path).set(sameOriginHeaders).send(body);
  },
  remove(userId: string | null, path: string) {
    clerkTestAuth.userId = userId;
    return request(app).delete(path).set(sameOriginHeaders);
  },
};

afterAll(async () => {
  const testOwners = [ownerA, ownerB];
  await db.delete(tasksTable).where(inArray(tasksTable.ownerId, testOwners));
  await db
    .delete(projectsTable)
    .where(inArray(projectsTable.ownerId, testOwners));
  await db
    .delete(clientsTable)
    .where(inArray(clientsTable.ownerId, testOwners));
  await pool.end();
});

describe("API authentication and per-user authorization", () => {
  it("keeps health public and rejects unauthenticated workspace requests", async () => {
    await request(app).get("/api/healthz").expect(200);

    await api.get(null, "/api/dashboard").expect(401);
    await api.get(null, "/api/auth/me").expect(401);
    await api.get(null, "/api/clients").expect(401);
    await api.get(null, "/api/projects").expect(401);
    await api.get(null, "/api/tasks").expect(401);
    await api.post(null, "/api/clients", { name: fixtureTag }).expect(401);
    await api.post(null, "/api/projects", { name: fixtureTag, clientId: 1 }).expect(401);
    await api.post(null, "/api/tasks", { title: fixtureTag, projectId: 1 }).expect(401);
    await api.patch(null, "/api/clients/1", { name: fixtureTag }).expect(401);
    await api.patch(null, "/api/projects/1", { name: fixtureTag }).expect(401);
    await api.patch(null, "/api/tasks/1", { title: fixtureTag }).expect(401);
    await api.remove(null, "/api/clients/1").expect(401);
    await api.remove(null, "/api/projects/1").expect(401);
    await api.remove(null, "/api/tasks/1").expect(401);
  });

  it("isolates clients, projects, tasks, and dashboard totals between users", async () => {
    const identity = await api.get(ownerA, "/api/auth/me").expect(200);
    expect(identity.body).toEqual({ userId: ownerA });
    expect(identity.headers["cache-control"]).toBe("no-store");

    const clientResponse = await api
      .post(ownerA, "/api/clients", { name: `${fixtureTag}-client` })
      .expect(201);
    const clientId = clientResponse.body.id as number;

    const projectResponse = await api
      .post(ownerA, "/api/projects", {
        name: `${fixtureTag}-project`,
        clientId,
      })
      .expect(201);
    const projectId = projectResponse.body.id as number;

    const taskResponse = await api
      .post(ownerA, "/api/tasks", {
        title: `${fixtureTag}-task`,
        projectId,
      })
      .expect(201);
    const taskId = taskResponse.body.id as number;

    expect(
      (await api.get(ownerA, "/api/clients").expect(200)).body.map(
        (client: { id: number }) => client.id,
      ),
    ).toContain(clientId);
    expect(
      (await api.get(ownerA, "/api/projects").expect(200)).body.map(
        (project: { id: number }) => project.id,
      ),
    ).toContain(projectId);
    expect(
      (await api.get(ownerA, "/api/tasks").expect(200)).body.map(
        (task: { id: number }) => task.id,
      ),
    ).toContain(taskId);

    expect((await api.get(ownerB, "/api/clients").expect(200)).body).toEqual([]);
    expect((await api.get(ownerB, "/api/projects").expect(200)).body).toEqual([]);
    expect((await api.get(ownerB, "/api/tasks").expect(200)).body).toEqual([]);

    const otherDashboard = (await api.get(ownerB, "/api/dashboard").expect(200))
      .body;
    expect(otherDashboard.clientCount).toBe(0);
    expect(otherDashboard.projectCount).toBe(0);
    expect(otherDashboard.activeProjectCount).toBe(0);
    expect(otherDashboard.taskCounts).toEqual({
      todo: 0,
      in_progress: 0,
      done: 0,
    });

    await api
      .post(ownerB, "/api/projects", {
        name: `${fixtureTag}-foreign-project`,
        clientId,
      })
      .expect(400);
    await api
      .post(ownerB, "/api/tasks", {
        title: `${fixtureTag}-foreign-task`,
        projectId,
      })
      .expect(400);

    await api
      .patch(ownerB, `/api/clients/${clientId}`, { name: "unauthorized edit" })
      .expect(404);
    await api
      .patch(ownerB, `/api/projects/${projectId}`, { name: "unauthorized edit" })
      .expect(404);
    await api
      .patch(ownerB, `/api/tasks/${taskId}`, { title: "unauthorized edit" })
      .expect(404);
    await api.remove(ownerB, `/api/clients/${clientId}`).expect(404);
    await api.remove(ownerB, `/api/projects/${projectId}`).expect(404);
    await api.remove(ownerB, `/api/tasks/${taskId}`).expect(404);

    const [storedClient] = await db
      .select({ ownerId: clientsTable.ownerId, name: clientsTable.name })
      .from(clientsTable)
      .where(and(eq(clientsTable.id, clientId), eq(clientsTable.ownerId, ownerA)));
    expect(storedClient).toEqual({
      ownerId: ownerA,
      name: `${fixtureTag}-client`,
    });
  });

  it("rejects cross-origin state-changing requests", async () => {
    clerkTestAuth.userId = ownerA;
    await request(app)
      .post("/api/clients")
      .set({ Host: "clientflow.test", Origin: "https://attacker.test" })
      .send({ name: `${fixtureTag}-csrf` })
      .expect(403);
  });
});
