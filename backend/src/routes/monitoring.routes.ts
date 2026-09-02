import { Router } from "express";
import { getSystemHealth, getSystemErrorLogs } from "../controllers/monitoring.controller";
import { authenticate, requirePermission } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/health", requirePermission("analytics.view", "audit_logs.view"), getSystemHealth);
router.get("/errors", requirePermission("audit_logs.view"), getSystemErrorLogs);

export default router;
