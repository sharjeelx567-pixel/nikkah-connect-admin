import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import * as adminsController from '../controllers/admins.controller';
import * as auditController from '../controllers/audit.controller';

const router = Router();

// Only Super Admins can manage admins
router.use(authenticate);
router.use(authorize(['super_admin']));

router.get('/', adminsController.listAdmins);
router.post('/', adminsController.createAdmin);
router.put('/:id/role', adminsController.updateAdminRole);
router.patch('/:id/status', adminsController.toggleAdminStatus);
router.delete('/:id', adminsController.deleteAdmin);

router.get('/audit-logs', auditController.getAuditLogs);

export default router;
