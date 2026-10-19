import { Router, type IRouter } from "express";
import { and, asc, count, eq, isNotNull, ne } from "drizzle-orm";
import { GetDashboardResponse } from "@workspace/api-zod";
import {
  clientsTable,
  db,
  projectsTable,
  tasksTable,
} from "@workspace/db";
import { getAuthUserId } from "../middlewares/auth";

const router: IRouter = Router();

const upcomingTaskSelection = {
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

router.get("/dashboard", async (_req, res): Promise<void> => {
  const ownerId = getAuthUserId(res);
  const [clientTotal] = await db
    .select({ value: count() })
    .from(clientsTable)
    .where(eq(clientsTable.ownerId, ownerId));
  const [projectTotal] = await db
    .select({ value: count() })
    .from(projectsTable)
    .where(eq(projectsTable.ownerId, ownerId));
  const [activeProjects] = await db
    .select({ value: count() })
    .from(projectsTable)
    .where(
      and(
        eq(projectsTable.status, "active"),
        eq(projectsTable.ownerId, ownerId),
      ),
    );
  const groupedTasks = await db
    .select({ status: tasksTable.status, value: count() })
    .from(tasksTable)
    .where(eq(tasksTable.ownerId, ownerId))
    .groupBy(tasksTable.status);
  const taskCounts = { todo: 0, in_progress: 0, done: 0 };
  for (const group of groupedTasks) {
    taskCounts[group.status] = group.value;
  }

  const upcomingTasks = await db
    .select(upcomingTaskSelection)
    .from(tasksTable)
    .innerJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .innerJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(
      and(
        eq(tasksTable.ownerId, ownerId),
        eq(projectsTable.ownerId, ownerId),
        eq(clientsTable.ownerId, ownerId),
        ne(tasksTable.status, "done"),
        isNotNull(tasksTable.dueDate),
      ),
    )
    .orderBy(asc(tasksTable.dueDate))
    .limit(5);

  res.json(
    GetDashboardResponse.parse({
      clientCount: clientTotal.value,
      projectCount: projectTotal.value,
      activeProjectCount: activeProjects.value,
      taskCounts,
      upcomingTasks,
    }),
  );
});

export default router;
