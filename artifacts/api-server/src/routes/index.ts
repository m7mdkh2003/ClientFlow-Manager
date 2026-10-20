import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import clientsRouter from "./clients";
import projectsRouter from "./projects";
import tasksRouter from "./tasks";
import {
  getAuthUserId,
  requireAuth,
  requireSameOriginWrite,
} from "../middlewares/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(requireAuth);
router.use(requireSameOriginWrite);
router.get("/auth/me", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ userId: getAuthUserId(res) });
});
router.use(dashboardRouter);
router.use(clientsRouter);
router.use(projectsRouter);
router.use(tasksRouter);

export default router;
