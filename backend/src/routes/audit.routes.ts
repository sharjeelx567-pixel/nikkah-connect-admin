import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('audit_logs.view'), getAuditLogs);

export default router;
