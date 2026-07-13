import { Router } from 'express';
import { getDashboardStats, getUserGrowth, getRecentActivity } from '../controllers/analytics.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/stats', getDashboardStats);
router.get('/growth', getUserGrowth);
router.get('/activity', getRecentActivity);

export default router;
