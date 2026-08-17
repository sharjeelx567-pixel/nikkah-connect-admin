import { Router } from 'express';
import { getUnreadCount, getAlerts, markAsRead, createAlert } from '../controllers/admin-alerts.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Public route for mobile app to send alerts (bypass admin auth)
router.post('/', createAlert);

router.use(authenticate); // Ensure only authenticated admins can access

router.get('/unread-count', getUnreadCount);
router.get('/', getAlerts);
router.patch('/:id/read', markAsRead);

export default router;
