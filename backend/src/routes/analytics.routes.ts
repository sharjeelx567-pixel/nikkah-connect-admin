import { Router } from 'express';
import { getDashboardStats, getUserGrowth, getRecentActivity } from '../controllers/analytics.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/dashboard', requirePermission('analytics.view'), getDashboardStats);
router.get('/stats', requirePermission('analytics.view'), getDashboardStats);
router.get('/growth', requirePermission('analytics.view'), getUserGrowth);
router.get('/activity', requirePermission('analytics.view'), getRecentActivity);

export default router;
