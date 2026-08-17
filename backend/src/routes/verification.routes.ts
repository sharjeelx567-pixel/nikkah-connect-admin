import { Router } from 'express';
import {
  getVerificationStats,
  getIdentityQueue,
  getFullQueue,
  approveIdentity,
  rejectIdentity,
  confirmFullPayment,
  scheduleMeeting,
  approveFullVerification,
  rejectFullVerification,
  // Legacy compat
  getVerificationQueue,
  approveVerification,
  rejectVerification,
  requestNewVerification,
  reviewVerification,
  scheduleHumanVerification,
  approveHumanVerification,
  submitVerification,
} from '../controllers/verification.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Public route for mobile app to submit verification securely (bypass admin auth)
router.post('/submit', submitVerification);

router.use(authenticate);
router.use(authorize(['super_admin', 'moderator', 'verification_officer']));

// ── Stats ──────────────────────────────────────────────────────────────────
router.get('/stats', getVerificationStats);

// ── Identity Verification ─────────────────────────────────────────────────
router.get('/identity/queue', getIdentityQueue);
router.patch('/identity/:requestId/approve', approveIdentity);
router.patch('/identity/:requestId/reject', rejectIdentity);

// ── Full Verification ─────────────────────────────────────────────────────
router.get('/full/queue', getFullQueue);
router.patch('/full/:requestId/confirm-payment', confirmFullPayment);
router.patch('/full/:requestId/schedule', scheduleMeeting);
router.patch('/full/:requestId/approve', approveFullVerification);
router.patch('/full/:requestId/reject', rejectFullVerification);

// ── Legacy endpoints (backward compat) ────────────────────────────────────
router.get('/pending', getVerificationQueue);
router.patch('/:uid/approve', approveVerification);
router.patch('/:uid/reject', rejectVerification);
router.patch('/:uid/request-new', requestNewVerification);
router.post('/review/:userId', reviewVerification);
router.post('/human/:bookingId/schedule', scheduleHumanVerification);
router.post('/human/:userId/approve', approveHumanVerification);

export default router;
