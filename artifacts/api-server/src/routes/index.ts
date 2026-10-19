import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import clientsRouter from "./clients";
import projectsRouter from "./projects";
import tasksRouter from "./tasks";
import {
  requireAuth,
  requireSameOriginWrite,
} from "../middlewares/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(requireAuth);
router.use(requireSameOriginWrite);
router.use(dashboardRouter);
router.use(clientsRouter);
router.use(projectsRouter);
router.use(tasksRouter);

export default router;
