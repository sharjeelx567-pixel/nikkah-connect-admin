import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { successResponse, errorResponse } from '../utils/helpers';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export async function getVerificationQueue(req: Request, res: Response): Promise<void> {
  try {
    const { status = 'pending' } = req.query;
    const snapshot = await db.collection('verification_center')
      .where('overallStatus', '==', status)
      .orderBy('submittedAt', 'desc')
      .limit(50)
      .get();

    const verifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(successResponse(verifications));
  } catch (error) {
    console.error('[Verification Admin] getVerificationQueue error:', error);
    res.status(500).json(errorResponse('Failed to fetch verification queue', error));
  }
}

export async function reviewVerification(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.params.userId as string;
    const { type, status, reason } = req.body;
    
    if (!['identityStatus', 'incomeStatus', 'propertyStatus', 'educationStatus', 'singleStatus'].includes(type)) {
      res.status(400).json(errorResponse('Invalid verification type'));
      return;
    }

    if (!['approved', 'rejected', 'requires_manual_review'].includes(status)) {
      res.status(400).json(errorResponse('Invalid status'));
      return;
    }

    const batch = db.batch();
    const verificationRef = db.collection('verification_center').doc(userId);
    const userRef = db.collection('users').doc(userId);

    batch.update(verificationRef, { [type]: status });

    if (type === 'identityStatus') {
      const isVerified = status === 'approved';
      batch.update(userRef, {
        isVerified,
        verificationStatus: status,
      });

      // Insert audit log
      batch.set(db.collection('admin_audit_logs').doc(), {
        action: `verification_${status}`,
        userId,
        type,
        reason: reason || null,
        adminId: (req as any).admin?.uid || 'system',
        timestamp: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    res.json(successResponse({ success: true }));
  } catch (error) {
    console.error('[Verification Admin] reviewVerification error:', error);
    res.status(500).json(errorResponse('Failed to review verification', error));
  }
}

export async function scheduleHumanVerification(req: Request, res: Response): Promise<void> {
  try {
    const bookingId = req.params.bookingId as string;
    const { meetingLink } = req.body;

    const bookingRef = db.collection('human_verification_bookings').doc(bookingId);
    await bookingRef.update({
      status: 'confirmed',
      meetingLink,
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.json(successResponse({ success: true }));
  } catch (error) {
    console.error('[Verification Admin] scheduleHumanVerification error:', error);
    res.status(500).json(errorResponse('Failed to schedule video call', error));
  }
}

export async function approveHumanVerification(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.params.userId as string;
    
    // VER-08: Apply 7-day boost
    const now = new Date();
    now.setDate(now.getDate() + 7);

    const batch = db.batch();
    
    batch.update(db.collection('users').doc(userId), {
      humanVerificationStatus: 'approved',
      isHumanVerified: true,
      profileBoostExpiresAt: Timestamp.fromDate(now),
    });

    batch.set(db.collection('admin_audit_logs').doc(), {
      action: `human_verification_approved`,
      userId,
      adminId: (req as any).admin?.uid || 'system',
      timestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    res.json(successResponse({ success: true, boostExpiresAt: now }));
  } catch (error) {
    console.error('[Verification Admin] approveHumanVerification error:', error);
    res.status(500).json(errorResponse('Failed to approve human verification', error));
  }
}
