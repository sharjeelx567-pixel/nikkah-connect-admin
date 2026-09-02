import { Router } from 'express';
import {
  sendNotification,
  getNotificationHistory,
  getScheduledNotifications,
  deleteScheduledNotification,
} from '../controllers/notifications.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/history', requirePermission('notifications.view'), getNotificationHistory);
router.get('/scheduled', requirePermission('notifications.view'), getScheduledNotifications);
router.post('/send', requirePermission('notifications.send'), sendNotification);
router.delete('/scheduled/:id', requirePermission('notifications.send'), deleteScheduledNotification);

export default router;
