import { Router } from 'express';
import { getPendingPhotos, approvePhoto, rejectPhoto, requestReupload, getAllPhotos } from '../controllers/photos.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// Moderation staff can access photo listing and moderation actions
router.get('/pending', authorize(['super_admin', 'moderator', 'verification_officer', 'support']), getPendingPhotos);
router.get('/', authorize(['super_admin', 'moderator', 'verification_officer', 'support']), getAllPhotos);

router.patch('/:uid/approve', authorize(['super_admin', 'moderator', 'verification_officer']), approvePhoto);
router.patch('/:uid/reject', authorize(['super_admin', 'moderator', 'verification_officer']), rejectPhoto);
router.patch('/:uid/request-reupload', authorize(['super_admin', 'moderator', 'verification_officer']), requestReupload);

export default router;
