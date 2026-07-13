import { Router } from 'express';
import { sendNotification, getNotificationHistory, getScheduledNotifications, deleteScheduledNotification } from '../controllers/notifications.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/send', authorize(['super_admin', 'moderator', 'support']), sendNotification);
router.get('/history', authorize(['super_admin', 'moderator', 'support']), getNotificationHistory);
router.get('/scheduled', authorize(['super_admin', 'moderator', 'support']), getScheduledNotifications);
router.delete('/scheduled/:id', authorize(['super_admin', 'moderator', 'support']), deleteScheduledNotification);

export default router;
