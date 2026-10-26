import { afterAll, expect, it, vi } from "vitest";
import request from "supertest";
import { pool } from "@workspace/db";
vi.mock("@clerk/express", () => ({
  getAuth: () => ({ userId: "review-customer" }),
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
}));
import app from "../artifacts/api-server/src/app";
const headers = { Host: "clientflow.test", Origin: "http://clientflow.test" };
const post = (path: string, data: unknown) =>
  request(app)
    .post("/api" + path)
    .set(headers)
    .send(data);
const patch = (path: string, data: unknown) =>
  request(app)
    .patch("/api" + path)
    .set(headers)
    .send(data);
const del = (path: string) =>
  request(app)
    .delete("/api" + path)
    .set(headers);
afterAll(async () => {
  await pool.end();
});
it("customer workflow: client → project → task → progress → safe deletes", async () => {
  const c = (
    await post("/clients", {
      name: "Review Customer",
      email: "review@example.com",
      phone: "+970000000000",
      notes: "First meeting",
    }).expect(201)
  ).body;
  await patch("/clients/" + c.id, { company: "Review Company" }).expect(200);
  const p = (
    await post("/projects", {
      name: "Website",
      clientId: c.id,
      status: "active",
      deadline: "2026-12-20",
    }).expect(201)
  ).body;
  const t = (
    await post("/tasks", {
      title: "Homepage",
      projectId: p.id,
      status: "todo",
      priority: "high",
      dueDate: "2026-12-01",
    }).expect(201)
  ).body;
  const started = (
    await patch("/tasks/" + t.id, { status: "in_progress" }).expect(200)
  ).body;
  expect(started.dueDate.slice(0, 10)).toBe("2026-12-01");
  expect(started.priority).toBe("high");
  expect(
    (
      await request(app)
        .get("/api/tasks?projectId=" + p.id + "&status=in_progress")
        .set(headers)
        .expect(200)
    ).body,
  ).toHaveLength(1);
  await patch("/tasks/" + t.id, { status: "done" }).expect(200);
  const d = (await request(app).get("/api/dashboard").set(headers).expect(200))
    .body;
  expect(d.taskCounts.done).toBe(1);
  expect(d.activeProjectCount).toBe(1);
  const clientBlocked = await del("/clients/" + c.id).expect(409);
  expect(clientBlocked.body.error).toContain("projects first");
  await del("/projects/" + p.id).expect(409);
  await del("/tasks/" + t.id).expect(204);
  await del("/projects/" + p.id).expect(204);
  await del("/clients/" + c.id).expect(204);
});
it("rejects a client name containing only spaces", async () => {
  await post("/clients", { name: "   " }).expect(400);
});
it("returns a validation response for an empty edit", async () => {
  const c = (await post("/clients", { name: "Empty edit review" }).expect(201))
    .body;
  await patch("/clients/" + c.id, {}).expect(400);
});
it("clears optional project deadlines explicitly", async () => {
  const c = (await post("/clients", { name: "Date review" }).expect(201)).body;
  const p = (
    await post("/projects", {
      name: "Deadline",
      clientId: c.id,
      deadline: "2026-12-15",
    }).expect(201)
  ).body;
  const updated = (
    await patch("/projects/" + p.id, { deadline: null }).expect(200)
  ).body;
  expect(updated.deadline).toBeNull();
});
it("normalizes required names and rejects blank or empty project/task updates", async () => {
  const client = (
    await post("/clients", { name: "  Trimmed client  " }).expect(201)
  ).body;
  expect(client.name).toBe("Trimmed client");
  await post("/projects", { name: "   ", clientId: client.id }).expect(400);
  const project = (
    await post("/projects", {
      name: "  Trimmed project  ",
      clientId: client.id,
    }).expect(201)
  ).body;
  expect(project.name).toBe("Trimmed project");
  await patch("/projects/" + project.id, {}).expect(400);
  await patch("/projects/" + project.id, { name: "   " }).expect(400);
  await post("/tasks", { title: "   ", projectId: project.id }).expect(400);
  const task = (
    await post("/tasks", {
      title: "  Trimmed task  ",
      projectId: project.id,
    }).expect(201)
  ).body;
  expect(task.title).toBe("Trimmed task");
  await patch("/tasks/" + task.id, {}).expect(400);
  await patch("/tasks/" + task.id, { title: "   " }).expect(400);
  await patch("/clients/" + client.id, { unknownField: "ignored" }).expect(400);
});
