import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import {
  CreateTaskBody,
  CreateTaskResponse,
  DeleteTaskParams,
  GetTasksQueryParams,
  GetTasksResponse,
  UpdateTaskBody,
  UpdateTaskParams,
  UpdateTaskResponse,
} from "@workspace/api-zod";
import { clientsTable, db, projectsTable, tasksTable } from "@workspace/db";

const router: IRouter = Router();

const taskSelection = {
  id: tasksTable.id,
  projectId: tasksTable.projectId,
  projectName: projectsTable.name,
  clientName: clientsTable.name,
  title: tasksTable.title,
  description: tasksTable.description,
  status: tasksTable.status,
  priority: tasksTable.priority,
  dueDate: tasksTable.dueDate,
  createdAt: tasksTable.createdAt,
};

router.get("/tasks", async (req, res): Promise<void> => {
  const parsed = GetTasksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const filters = [];
  if (parsed.data.projectId !== undefined) {
    filters.push(eq(tasksTable.projectId, parsed.data.projectId));
  }
  if (parsed.data.status !== undefined) {
    filters.push(eq(tasksTable.status, parsed.data.status));
  }

  const tasks = await db
    .select(taskSelection)
    .from(tasksTable)
    .innerJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .innerJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(asc(tasksTable.dueDate), asc(tasksTable.createdAt));
  res.json(GetTasksResponse.parse(tasks));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(eq(projectsTable.id, parsed.data.projectId))
    .limit(1);
  if (!project) {
    res.status(400).json({ error: "Select an existing project" });
    return;
  }

  const taskData = {
    ...parsed.data,
    dueDate:
      parsed.data.dueDate instanceof Date
        ? parsed.data.dueDate.toISOString().slice(0, 10)
        : parsed.data.dueDate,
  };
  const [created] = await db
    .insert(tasksTable)
    .values(taskData)
    .returning({ id: tasksTable.id });
  const [task] = await db
    .select(taskSelection)
    .from(tasksTable)
    .innerJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .innerJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(eq(tasksTable.id, created.id));
  res.status(201).json(CreateTaskResponse.parse(task));
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  const body = UpdateTaskBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  if (body.data.projectId !== undefined) {
    const [project] = await db
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .where(eq(projectsTable.id, body.data.projectId))
      .limit(1);
    if (!project) {
      res.status(400).json({ error: "Select an existing project" });
      return;
    }
  }

  const updateData = {
    ...body.data,
    dueDate:
      body.data.dueDate instanceof Date
        ? body.data.dueDate.toISOString().slice(0, 10)
        : body.data.dueDate,
  };
  const [updated] = await db
    .update(tasksTable)
    .set(updateData)
    .where(eq(tasksTable.id, params.data.id))
    .returning({ id: tasksTable.id });
  if (!updated) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const [task] = await db
    .select(taskSelection)
    .from(tasksTable)
    .innerJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .innerJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(eq(tasksTable.id, params.data.id));
  res.json(UpdateTaskResponse.parse(task));
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db
    .delete(tasksTable)
    .where(eq(tasksTable.id, params.data.id))
    .returning({ id: tasksTable.id });
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
