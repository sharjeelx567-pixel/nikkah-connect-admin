import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';
import * as adminsController from '../controllers/admins.controller';
import * as auditController from '../controllers/audit.controller';

const router = Router();

router.use(authenticate);

router.get('/roles', requirePermission('roles.view', 'admins.view'), adminsController.getRolesAndPermissions);
router.get('/', requirePermission('admins.view'), adminsController.listAdmins);
router.post('/', requirePermission('admins.create'), adminsController.createAdmin);
router.put('/:id', requirePermission('admins.update'), adminsController.updateAdmin);
// The frontend's "Change" role control calls PATCH /:id/role specifically —
// updateAdmin already fully handles a role-only update (validation, safeguard
// against self-demotion, Firestore write, Firebase custom-claims sync), so
// this just exposes that same handler under the path the UI actually calls.
router.patch('/:id/role', requirePermission('admins.update'), adminsController.updateAdmin);
router.patch('/:id/status', requirePermission('admins.disable'), adminsController.toggleAdminStatus);
router.delete('/:id', requirePermission('admins.delete'), adminsController.deleteAdmin);

router.get('/audit-logs', requirePermission('audit_logs.view'), auditController.getAuditLogs);

export default router;
