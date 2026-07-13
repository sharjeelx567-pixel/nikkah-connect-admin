import { Router } from 'express';
import { getReports, resolveReport, dismissReport } from '../controllers/reports.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', authorize(['super_admin', 'moderator', 'support']), getReports);
router.patch('/:id/resolve', authorize(['super_admin', 'moderator', 'support']), resolveReport);
router.patch('/:id/dismiss', authorize(['super_admin', 'moderator', 'support']), dismissReport);

export default router;
