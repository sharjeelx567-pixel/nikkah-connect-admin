import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getUnreadCount, getAlerts, markAsRead, createAlert } from '../controllers/admin-alerts.controller';
import { authenticate, requirePermission, verifyFirebaseAppUser } from '../middlewares/auth.middleware';

const router = Router();

// Called by the Flutter app itself (a real end user, not an admin) to alert
// staff about a new upload/submission — must stay reachable without an admin
// JWT, but every caller must still be a genuine signed-in Firebase user
// (verifyFirebaseAppUser) and is rate-limited/validated to prevent spam.
const createAlertLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
router.post('/', createAlertLimiter, verifyFirebaseAppUser, createAlert);

router.use(authenticate); // Everything below is admin-console only

router.get('/unread-count', requirePermission('notifications.view'), getUnreadCount);
router.get('/', requirePermission('notifications.view'), getAlerts);
router.patch('/:id/read', requirePermission('notifications.view'), markAsRead);

export default router;
