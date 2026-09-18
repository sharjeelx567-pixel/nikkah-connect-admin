import { Router } from 'express';
import { listCommunities, createCommunity, updateCommunity } from '../controllers/communities.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('content.view'), listCommunities);
router.post('/', requirePermission('content.create'), createCommunity);
router.patch('/:id', requirePermission('content.update'), updateCommunity);

export default router;
