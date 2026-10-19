import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  CreateProjectBody,
  CreateProjectResponse,
  DeleteProjectParams,
  GetProjectsResponse,
  UpdateProjectBody,
  UpdateProjectParams,
  UpdateProjectResponse,
} from "@workspace/api-zod";
import {
  clientsTable,
  db,
  projectsTable,
  tasksTable,
} from "@workspace/db";

const router: IRouter = Router();

const projectSelection = {
  id: projectsTable.id,
  name: projectsTable.name,
  clientId: projectsTable.clientId,
  clientName: clientsTable.name,
  description: projectsTable.description,
  status: projectsTable.status,
  deadline: projectsTable.deadline,
  createdAt: projectsTable.createdAt,
};

router.get("/projects", async (_req, res): Promise<void> => {
  const projects = await db
    .select(projectSelection)
    .from(projectsTable)
    .innerJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .orderBy(projectsTable.createdAt);
  res.json(GetProjectsResponse.parse(projects));
});

router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [client] = await db
    .select({ id: clientsTable.id })
    .from(clientsTable)
    .where(eq(clientsTable.id, parsed.data.clientId))
    .limit(1);
  if (!client) {
    res.status(400).json({ error: "Select an existing client" });
    return;
  }

  const projectData = {
    ...parsed.data,
    deadline:
      parsed.data.deadline instanceof Date
        ? parsed.data.deadline.toISOString().slice(0, 10)
        : parsed.data.deadline,
  };
  const [created] = await db
    .insert(projectsTable)
    .values(projectData)
    .returning();
  const [project] = await db
    .select(projectSelection)
    .from(projectsTable)
    .innerJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(eq(projectsTable.id, created.id));
  res.status(201).json(CreateProjectResponse.parse(project));
});

router.patch("/projects/:id", async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  const body = UpdateProjectBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  if (body.data.clientId !== undefined) {
    const [client] = await db
      .select({ id: clientsTable.id })
      .from(clientsTable)
      .where(eq(clientsTable.id, body.data.clientId))
      .limit(1);
    if (!client) {
      res.status(400).json({ error: "Select an existing client" });
      return;
    }
  }

  const updateData = {
    ...body.data,
    deadline:
      body.data.deadline instanceof Date
        ? body.data.deadline.toISOString().slice(0, 10)
        : body.data.deadline,
  };
  const [updated] = await db
    .update(projectsTable)
    .set(updateData)
    .where(eq(projectsTable.id, params.data.id))
    .returning({ id: projectsTable.id });
  if (!updated) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [project] = await db
    .select(projectSelection)
    .from(projectsTable)
    .innerJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(eq(projectsTable.id, params.data.id));
  res.json(UpdateProjectResponse.parse(project));
});

router.delete("/projects/:id", async (req, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db
    .select({ id: tasksTable.id })
    .from(tasksTable)
    .where(eq(tasksTable.projectId, params.data.id))
    .limit(1);
  if (task) {
    res.status(409).json({ error: "Move or delete this project's tasks first" });
    return;
  }

  const [project] = await db
    .delete(projectsTable)
    .where(eq(projectsTable.id, params.data.id))
    .returning({ id: projectsTable.id });
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
