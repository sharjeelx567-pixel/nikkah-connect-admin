import { Router } from 'express';
import { 
  getVerificationQueue,
  reviewVerification,
  scheduleHumanVerification,
  approveHumanVerification
} from '../controllers/verification.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Secure all routes with authentication and admin role requirement
router.use(authenticate);
router.use(authorize(['super_admin', 'moderator']));

router.get('/queue', getVerificationQueue);
router.post('/review/:userId', reviewVerification);
router.post('/human/:bookingId/schedule', scheduleHumanVerification);
router.post('/human/:userId/approve', approveHumanVerification);

export default router;
