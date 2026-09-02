import { Router } from 'express';
import { getChaperoneFlags, resolveChaperoneFlag } from '../controllers/family.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/chaperone-flags', requirePermission('chat_moderation.view'), getChaperoneFlags);
router.patch('/chaperone-flags/:id/resolve', requirePermission('chat_moderation.manage'), resolveChaperoneFlag);

export default router;
