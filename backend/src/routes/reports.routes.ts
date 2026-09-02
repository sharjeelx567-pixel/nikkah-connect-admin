import { Router } from 'express';
import { getReports, resolveReport, dismissReport } from '../controllers/reports.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('reports.view'), getReports);
router.patch('/:id/resolve', requirePermission('reports.manage'), resolveReport);
router.patch('/:id/dismiss', requirePermission('reports.manage'), dismissReport);

export default router;
