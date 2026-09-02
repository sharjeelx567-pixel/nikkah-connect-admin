import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';
import {
  getPendingPhotos,
  approvePhoto,
  rejectPhoto,
  bulkApprovePhotos,
  requestReupload,
  getUserPhotoDetail,
  approveUserImage,
  rejectUserImage,
} from '../controllers/photos.controller';

const router = Router();

router.use(authenticate);

router.get('/pending', requirePermission('photos.view'), getPendingPhotos);
router.post('/bulk-approve', requirePermission('photos.approve'), bulkApprovePhotos);
router.patch('/:uid/approve', requirePermission('photos.approve'), approvePhoto);
router.patch('/:uid/reject', requirePermission('photos.reject'), rejectPhoto);
router.patch('/:uid/request-reupload', requirePermission('photos.reject', 'photos.view'), requestReupload);

// Per-image moderation — every image a user uploaded, addressed individually by URL.
router.get('/:uid', requirePermission('photos.view'), getUserPhotoDetail);
router.patch('/:uid/images/approve', requirePermission('photos.approve'), approveUserImage);
router.patch('/:uid/images/reject', requirePermission('photos.reject'), rejectUserImage);

export default router;
