import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { and, eq, inArray, like } from "drizzle-orm";
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
const testOwners = [ownerA, ownerB];
const sameOriginHeaders = {
  Host: "clientflow.test",
  Origin: "http://clientflow.test",
};
let fixtureNamespaceIsClean = false;

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

beforeAll(async () => {
  const [existingClientByOwner, existingProjectByOwner, existingTaskByOwner] =
    await Promise.all([
      db
        .select({ id: clientsTable.id })
        .from(clientsTable)
        .where(inArray(clientsTable.ownerId, testOwners))
        .limit(1),
      db
        .select({ id: projectsTable.id })
        .from(projectsTable)
        .where(inArray(projectsTable.ownerId, testOwners))
        .limit(1),
      db
        .select({ id: tasksTable.id })
        .from(tasksTable)
        .where(inArray(tasksTable.ownerId, testOwners))
        .limit(1),
    ]);
  const [existingClientByTag, existingProjectByTag, existingTaskByTag] =
    await Promise.all([
      db
        .select({ id: clientsTable.id })
        .from(clientsTable)
        .where(like(clientsTable.name, `${fixtureTag}%`))
        .limit(1),
      db
        .select({ id: projectsTable.id })
        .from(projectsTable)
        .where(like(projectsTable.name, `${fixtureTag}%`))
        .limit(1),
      db
        .select({ id: tasksTable.id })
        .from(tasksTable)
        .where(like(tasksTable.title, `${fixtureTag}%`))
        .limit(1),
    ]);

  if (
    existingClientByOwner.length ||
    existingProjectByOwner.length ||
    existingTaskByOwner.length ||
    existingClientByTag.length ||
    existingProjectByTag.length ||
    existingTaskByTag.length
  ) {
    throw new Error("Refusing to run authorization tests in a non-empty fixture namespace");
  }
  fixtureNamespaceIsClean = true;
});

afterAll(async () => {
  if (fixtureNamespaceIsClean) {
    await db
      .delete(tasksTable)
      .where(like(tasksTable.title, `${fixtureTag}%`));
    await db
      .delete(projectsTable)
      .where(like(projectsTable.name, `${fixtureTag}%`));
    await db
      .delete(clientsTable)
      .where(like(clientsTable.name, `${fixtureTag}%`));
  }
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

    const ownerBClientResponse = await api
      .post(ownerB, "/api/clients", { name: `${fixtureTag}-owner-b-client` })
      .expect(201);
    const ownerBClientId = ownerBClientResponse.body.id as number;

    const ownerBProjectResponse = await api
      .post(ownerB, "/api/projects", {
        name: `${fixtureTag}-owner-b-project`,
        clientId: ownerBClientId,
      })
      .expect(201);
    const ownerBProjectId = ownerBProjectResponse.body.id as number;

    const ownerBTaskResponse = await api
      .post(ownerB, "/api/tasks", {
        title: `${fixtureTag}-owner-b-task`,
        projectId: ownerBProjectId,
      })
      .expect(201);
    const ownerBTaskId = ownerBTaskResponse.body.id as number;

    expect(
      (await api.get(ownerA, "/api/clients").expect(200)).body.map(
        (client: { id: number }) => client.id,
      ),
    ).toEqual([clientId]);
    expect(
      (await api.get(ownerA, "/api/projects").expect(200)).body.map(
        (project: { id: number }) => project.id,
      ),
    ).toEqual([projectId]);
    expect(
      (await api.get(ownerA, "/api/tasks").expect(200)).body.map(
        (task: { id: number }) => task.id,
      ),
    ).toEqual([taskId]);

    expect(
      (await api.get(ownerB, "/api/clients").expect(200)).body.map(
        (client: { id: number }) => client.id,
      ),
    ).toEqual([ownerBClientId]);
    expect(
      (await api.get(ownerB, "/api/projects").expect(200)).body.map(
        (project: { id: number }) => project.id,
      ),
    ).toEqual([ownerBProjectId]);
    expect(
      (await api.get(ownerB, "/api/tasks").expect(200)).body.map(
        (task: { id: number }) => task.id,
      ),
    ).toEqual([ownerBTaskId]);

    await api.get(ownerB, `/api/clients/${clientId}`).expect(404);
    await api.get(ownerB, `/api/projects/${projectId}`).expect(404);
    await api.get(ownerB, `/api/tasks/${taskId}`).expect(404);

    const otherDashboard = (await api.get(ownerB, "/api/dashboard").expect(200))
      .body;
    expect(otherDashboard.clientCount).toBe(1);
    expect(otherDashboard.projectCount).toBe(1);
    expect(otherDashboard.activeProjectCount).toBe(
      ownerBProjectResponse.body.status === "active" ? 1 : 0,
    );
    const taskCounts = otherDashboard.taskCounts as Record<string, number>;
    expect(taskCounts[ownerBTaskResponse.body.status]).toBe(1);
    expect(
      Object.values(taskCounts).reduce((total, count) => total + count, 0),
    ).toBe(1);

    await api
      .post(ownerB, "/api/projects", {
        name: `${fixtureTag}-foreign-project`,
        clientId,
      })
      .expect(400);
    await api
      .patch(ownerB, `/api/projects/${ownerBProjectId}`, { clientId })
      .expect(400);
    await api
      .post(ownerB, "/api/tasks", {
        title: `${fixtureTag}-foreign-task`,
        projectId,
      })
      .expect(400);
    await api
      .patch(ownerB, `/api/tasks/${ownerBTaskId}`, { projectId })
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

    const [storedProject] = await db
      .select({
        ownerId: projectsTable.ownerId,
        name: projectsTable.name,
        clientId: projectsTable.clientId,
      })
      .from(projectsTable)
      .where(
        and(
          eq(projectsTable.id, projectId),
          eq(projectsTable.ownerId, ownerA),
        ),
      );
    expect(storedProject).toEqual({
      ownerId: ownerA,
      name: `${fixtureTag}-project`,
      clientId,
    });

    const [storedTask] = await db
      .select({
        ownerId: tasksTable.ownerId,
        title: tasksTable.title,
        projectId: tasksTable.projectId,
      })
      .from(tasksTable)
      .where(and(eq(tasksTable.id, taskId), eq(tasksTable.ownerId, ownerA)));
    expect(storedTask).toEqual({
      ownerId: ownerA,
      title: `${fixtureTag}-task`,
      projectId,
    });

    const [storedOwnerBProject] = await db
      .select({
        ownerId: projectsTable.ownerId,
        name: projectsTable.name,
        clientId: projectsTable.clientId,
      })
      .from(projectsTable)
      .where(
        and(
          eq(projectsTable.id, ownerBProjectId),
          eq(projectsTable.ownerId, ownerB),
        ),
      );
    expect(storedOwnerBProject).toEqual({
      ownerId: ownerB,
      name: `${fixtureTag}-owner-b-project`,
      clientId: ownerBClientId,
    });

    const [storedOwnerBTask] = await db
      .select({
        ownerId: tasksTable.ownerId,
        title: tasksTable.title,
        projectId: tasksTable.projectId,
      })
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.id, ownerBTaskId),
          eq(tasksTable.ownerId, ownerB),
        ),
      );
    expect(storedOwnerBTask).toEqual({
      ownerId: ownerB,
      title: `${fixtureTag}-owner-b-task`,
      projectId: ownerBProjectId,
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
