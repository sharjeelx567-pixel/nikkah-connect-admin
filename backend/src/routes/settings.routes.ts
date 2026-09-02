import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('settings.view'), getSettings);
router.patch('/', requirePermission('settings.manage'), updateSettings);

export default router;
