import {
  CreateClientInput,
  UpdateClientInput,
} from "../lib/request-validation";
import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  CreateClientResponse,
  DeleteClientParams,
  GetClientsResponse,
  UpdateClientParams,
  UpdateClientResponse,
} from "@workspace/api-zod";
import { clientsTable, db, projectsTable } from "@workspace/db";
import { getAuthUserId } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/clients", async (_req, res): Promise<void> => {
  const ownerId = getAuthUserId(res);
  const clients = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.ownerId, ownerId))
    .orderBy(clientsTable.name);
  res.json(GetClientsResponse.parse(clients));
});

router.post("/clients", async (req, res): Promise<void> => {
  const ownerId = getAuthUserId(res);
  const parsed = CreateClientInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [client] = await db
    .insert(clientsTable)
    .values({ ...parsed.data, ownerId })
    .returning();
  res.status(201).json(CreateClientResponse.parse(client));
});

router.patch("/clients/:id", async (req, res): Promise<void> => {
  const ownerId = getAuthUserId(res);
  const params = UpdateClientParams.safeParse(req.params);
  const body = UpdateClientInput.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [client] = await db
    .update(clientsTable)
    .set(body.data)
    .where(
      and(
        eq(clientsTable.id, params.data.id),
        eq(clientsTable.ownerId, ownerId),
      ),
    )
    .returning();
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(UpdateClientResponse.parse(client));
});

router.delete("/clients/:id", async (req, res): Promise<void> => {
  const ownerId = getAuthUserId(res);
  const params = DeleteClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(
      and(
        eq(projectsTable.clientId, params.data.id),
        eq(projectsTable.ownerId, ownerId),
      ),
    )
    .limit(1);
  if (project) {
    res
      .status(409)
      .json({ error: "Move or delete this client's projects first" });
    return;
  }

  const [client] = await db
    .delete(clientsTable)
    .where(
      and(
        eq(clientsTable.id, params.data.id),
        eq(clientsTable.ownerId, ownerId),
      ),
    )
    .returning({ id: clientsTable.id });
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
