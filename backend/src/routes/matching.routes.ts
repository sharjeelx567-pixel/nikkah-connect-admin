import { Router } from 'express';
import { 
  getMatchingStats, 
  getCompatibilityStats, 
  getConnectionRequests, 
  getAnonymousSignals, 
  getDormantProfiles 
} from '../controllers/matching.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Secure all routes with authentication and admin role requirement
router.use(authenticate);
router.use(authorize(['super_admin', 'moderator']));

router.get('/stats', getMatchingStats);
router.get('/compatibility-stats', getCompatibilityStats);
router.get('/connection-requests', getConnectionRequests);
router.get('/anonymous-signals', getAnonymousSignals);
router.get('/dormant-profiles', getDormantProfiles);

export default router;
