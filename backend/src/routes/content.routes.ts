import { Router } from 'express';
import {
  getPublicLegalDocument,
  getAllPublicLegalDocuments,
  getAdminLegalDocuments,
  getAdminLegalDocument,
  createLegalDocument,
  updateLegalDocument,
  publishLegalDocument,
  unpublishLegalDocument,
  archiveLegalDocument,
  restoreLegalDocument,
  deleteLegalDocument,
  getDocumentVersions,
} from '../controllers/content.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

// ── Public Routes (No authentication required for public published policies) ──
router.get('/public', getAllPublicLegalDocuments);
router.get('/public/:slug', getPublicLegalDocument);

// ── Admin Content Management (RBAC Protected) ─────────────────────────────────
router.use(authenticate);

router.get('/', requirePermission('content.view'), getAdminLegalDocuments);
router.get('/:slug', requirePermission('content.view'), getAdminLegalDocument);
router.get('/:slug/versions', requirePermission('content.view'), getDocumentVersions);
router.post('/', requirePermission('content.create'), createLegalDocument);
router.put('/:slug', requirePermission('content.update'), updateLegalDocument);
router.patch('/:slug/publish', requirePermission('content.publish'), publishLegalDocument);
router.patch('/:slug/unpublish', requirePermission('content.publish'), unpublishLegalDocument);
router.patch('/:slug/archive', requirePermission('content.publish'), archiveLegalDocument);
router.patch('/:slug/restore', requirePermission('content.publish'), restoreLegalDocument);
router.delete('/:slug', requirePermission('content.delete'), deleteLegalDocument);

export default router;
