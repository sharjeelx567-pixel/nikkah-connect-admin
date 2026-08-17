import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { successResponse, errorResponse, serverTimestamp } from '../utils/helpers';
import { FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// ─── Shared Notification Helper ────────────────────────────────────────────
export async function submitVerification(req: Request, res: Response): Promise<void> {
  try {
    const { userId, type, cnicFrontUrl, cnicBackUrl } = req.body;
    
    // Check if request already exists
    const existing = await db.collection('verification_requests')
      .where('userId', '==', userId)
      .where('type', '==', type)
      .limit(1)
      .get();

    const data = {
      userId,
      type,
      status: 'pending',
      cnicFrontUrl: cnicFrontUrl || null,
      cnicBackUrl: cnicBackUrl || null,
      submittedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (!existing.empty) {
      await existing.docs[0].ref.update(data);
    } else {
      await db.collection('verification_requests').add(data);
    }

    await db.collection('users').doc(userId).update({
      identityVerificationStatus: 'pending',
    });

    res.json(successResponse(null, 'Verification submitted successfully'));
  } catch (error) {
    console.error('[Verification] submitVerification error:', error);
    res.status(500).json(errorResponse('Failed to submit verification', error));
  }
}
async function sendPush(uid: string, title: string, body: string, extraData?: Record<string, string>) {
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    const fcmToken = userDoc.data()?.fcmToken;

    // Save to user notifications subcollection
    await db.collection('users').doc(uid).collection('notifications').add({
      title,
      body,
      isRead: false,
      timestamp: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      ...extraData,
    });

    if (fcmToken) {
      await getMessaging().send({
        token: fcmToken,
        notification: { title, body },
      });
    }
  } catch (err) {
    console.error('[Verification] Push notification failed:', err);
  }
}

// ─── Stats ──────────────────────────────────────────────────────────────────
export async function getVerificationStats(req: Request, res: Response): Promise<void> {
  try {
    const [pendingIdentity, pendingFull, approvedToday, rejectedToday, totalVerified] =
      await Promise.all([
        db.collection('verification_requests')
          .where('type', '==', 'identity')
          .where('status', '==', 'pending')
          .count().get(),
        db.collection('verification_requests')
          .where('type', '==', 'full')
          .where('status', 'in', ['payment_pending', 'waiting_schedule', 'scheduled', 'meeting_done'])
          .count().get(),
        db.collection('verification_requests')
          .where('status', '==', 'approved')
          .count().get(),
        db.collection('verification_requests')
          .where('status', '==', 'rejected')
          .count().get(),
        db.collection('users')
          .where('identityVerified', '==', true)
          .count().get(),
      ]);

    res.json(successResponse({
      pendingIdentity: pendingIdentity.data().count,
      pendingFull: pendingFull.data().count,
      approvedToday: approvedToday.data().count,
      rejectedToday: rejectedToday.data().count,
      totalIdentityVerified: totalVerified.data().count,
    }));
  } catch (error) {
    console.error('[Verification] getStats error:', error);
    res.status(500).json(errorResponse('Failed to fetch verification stats', error));
  }
}

// ─── Identity Queue ─────────────────────────────────────────────────────────
export async function getIdentityQueue(req: Request, res: Response): Promise<void> {
  try {
    const snapshot = await db.collection('verification_requests')
      .where('type', '==', 'identity')
      .where('status', '==', 'pending')
      .limit(100)
      .get();

    const requests = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const userDoc = await db.collection('users').doc(data.userId).get();
        const user = userDoc.data() || {};
        return {
          requestId: doc.id,
          ...data,
          userName: user.displayName || '',
          userEmail: user.email || '',
          userPhone: user.phoneNumber || '',
          userPhoto: user.profileImage || '',
          userCreatedAt: user.createdAt || null,
        };
      })
    );

    // Sort in memory to avoid Firebase Index errors
    requests.sort((a, b) => {
      const timeA = a.submittedAt?.toMillis?.() || 0;
      const timeB = b.submittedAt?.toMillis?.() || 0;
      return timeB - timeA;
    });

    res.json(successResponse(requests));
  } catch (error) {
    console.error('[Verification] getIdentityQueue error:', error);
    res.status(500).json(errorResponse('Failed to fetch identity queue', error));
  }
}

// ─── Full Verification Queue ─────────────────────────────────────────────────
export async function getFullQueue(req: Request, res: Response): Promise<void> {
  try {
    const snapshot = await db.collection('verification_requests')
      .where('type', '==', 'full')
      .where('status', 'in', ['payment_pending', 'waiting_schedule', 'scheduled', 'meeting_done'])
      .limit(100)
      .get();

    const requests = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const userDoc = await db.collection('users').doc(data.userId).get();
        const user = userDoc.data() || {};
        return {
          requestId: doc.id,
          ...data,
          userName: user.displayName || '',
          userEmail: user.email || '',
          userPhone: user.phoneNumber || '',
          userPhoto: user.profileImage || '',
        };
      })
    );

    // Sort in memory to avoid Firebase Index errors
    requests.sort((a, b) => {
      const timeA = a.submittedAt?.toMillis?.() || 0;
      const timeB = b.submittedAt?.toMillis?.() || 0;
      return timeB - timeA;
    });

    res.json(successResponse(requests));
  } catch (error) {
    console.error('[Verification] getFullQueue error:', error);
    res.status(500).json(errorResponse('Failed to fetch full verification queue', error));
  }
}

// ─── Approve Identity ────────────────────────────────────────────────────────
export async function approveIdentity(req: Request, res: Response): Promise<void> {
  try {
    const { requestId } = req.params;
    const reqDoc = await db.collection('verification_requests').doc(requestId).get();
    if (!reqDoc.exists) {
      res.status(404).json(errorResponse('Request not found'));
      return;
    }
    const userId = reqDoc.data()!.userId;

    const batch = db.batch();
    batch.update(db.collection('verification_requests').doc(requestId), {
      status: 'approved',
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.update(db.collection('users').doc(userId), {
      identityVerified: true,
      identityVerificationStatus: 'approved',
      isVerified: true,
      verificationStatus: 'approved',
    });
    batch.set(db.collection('admin_audit_logs').doc(), {
      action: 'identity_verification_approved',
      userId,
      requestId,
      adminId: (req as any).admin?.uid || 'system',
      timestamp: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    await sendPush(
      userId,
      '✅ Identity Verified!',
      'Your identity has been verified. Your profile now shows the Identity Verified badge.',
      { type: 'verification', verificationStatus: 'approved' }
    );

    res.json(successResponse(null, 'Identity verification approved'));
  } catch (error) {
    console.error('[Verification] approveIdentity error:', error);
    res.status(500).json(errorResponse('Failed to approve identity', error));
  }
}

// ─── Reject Identity ─────────────────────────────────────────────────────────
export async function rejectIdentity(req: Request, res: Response): Promise<void> {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    if (!reason) {
      res.status(400).json(errorResponse('Rejection reason is required'));
      return;
    }
    const reqDoc = await db.collection('verification_requests').doc(requestId).get();
    if (!reqDoc.exists) {
      res.status(404).json(errorResponse('Request not found'));
      return;
    }
    const userId = reqDoc.data()!.userId;

    const batch = db.batch();
    batch.update(db.collection('verification_requests').doc(requestId), {
      status: 'rejected',
      rejectionReason: reason,
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.update(db.collection('users').doc(userId), {
      identityVerified: false,
      identityVerificationStatus: 'rejected',
    });
    batch.set(db.collection('admin_audit_logs').doc(), {
      action: 'identity_verification_rejected',
      userId, requestId, reason,
      adminId: (req as any).admin?.uid || 'system',
      timestamp: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    await sendPush(
      userId,
      '❌ Identity Verification Rejected',
      `Your documents were rejected. Reason: ${reason}. Please upload again.`,
      { type: 'verification', verificationStatus: 'rejected' }
    );

    res.json(successResponse(null, 'Identity verification rejected'));
  } catch (error) {
    console.error('[Verification] rejectIdentity error:', error);
    res.status(500).json(errorResponse('Failed to reject identity', error));
  }
}

// ─── Confirm Full Verification Payment ───────────────────────────────────────
export async function confirmFullPayment(req: Request, res: Response): Promise<void> {
  try {
    const { requestId } = req.params;
    const reqDoc = await db.collection('verification_requests').doc(requestId).get();
    if (!reqDoc.exists) { res.status(404).json(errorResponse('Request not found')); return; }
    const userId = reqDoc.data()!.userId;

    await db.collection('verification_requests').doc(requestId).update({
      paymentStatus: 'confirmed',
      updatedAt: FieldValue.serverTimestamp(),
    });
    await sendPush(userId, '💳 Payment Confirmed', 'Your payment of PKR 200 has been confirmed. Please submit your availability for the meeting.');
    res.json(successResponse(null, 'Payment confirmed'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to confirm payment', error));
  }
}

// ─── Schedule Full Verification Meeting ──────────────────────────────────────
export async function scheduleMeeting(req: Request, res: Response): Promise<void> {
  try {
    const { requestId } = req.params;
    const { meetingDate, meetingTime, meetingLink, message } = req.body;

    if (!meetingDate || !meetingTime || !meetingLink) {
      res.status(400).json(errorResponse('meetingDate, meetingTime, and meetingLink are required'));
      return;
    }

    const reqDoc = await db.collection('verification_requests').doc(requestId).get();
    if (!reqDoc.exists) { res.status(404).json(errorResponse('Request not found')); return; }
    const userId = reqDoc.data()!.userId;

    await db.collection('verification_requests').doc(requestId).update({
      status: 'scheduled',
      meetingDate,
      meetingTime,
      meetingLink,
      scheduledAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await db.collection('users').doc(userId).update({
      fullVerificationStatus: 'scheduled',
    });

    await sendPush(
      userId,
      '📅 Meeting Scheduled!',
      `Your Full Verification meeting has been scheduled for ${meetingDate} at ${meetingTime}.`,
      { type: 'verification_meeting', meetingDate, meetingTime, meetingLink }
    );

    res.json(successResponse(null, 'Meeting scheduled'));
  } catch (error) {
    console.error('[Verification] scheduleMeeting error:', error);
    res.status(500).json(errorResponse('Failed to schedule meeting', error));
  }
}

// ─── Approve Full Verification ───────────────────────────────────────────────
export async function approveFullVerification(req: Request, res: Response): Promise<void> {
  try {
    const { requestId } = req.params;
    const reqDoc = await db.collection('verification_requests').doc(requestId).get();
    if (!reqDoc.exists) { res.status(404).json(errorResponse('Request not found')); return; }
    const userId = reqDoc.data()!.userId;

    const batch = db.batch();
    batch.update(db.collection('verification_requests').doc(requestId), {
      status: 'approved',
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.update(db.collection('users').doc(userId), {
      fullyVerified: true,
      fullVerificationStatus: 'approved',
    });
    batch.set(db.collection('admin_audit_logs').doc(), {
      action: 'full_verification_approved',
      userId, requestId,
      adminId: (req as any).admin?.uid || 'system',
      timestamp: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    await sendPush(
      userId,
      '🏅 Congratulations! Fully Verified!',
      'Your Full Verification has been approved. You now have the Fully Verified badge on your profile!',
      { type: 'verification', verificationStatus: 'approved' }
    );

    res.json(successResponse(null, 'Full verification approved'));
  } catch (error) {
    console.error('[Verification] approveFullVerification error:', error);
    res.status(500).json(errorResponse('Failed to approve full verification', error));
  }
}

// ─── Reject Full Verification ────────────────────────────────────────────────
export async function rejectFullVerification(req: Request, res: Response): Promise<void> {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    if (!reason) { res.status(400).json(errorResponse('Rejection reason is required')); return; }

    const reqDoc = await db.collection('verification_requests').doc(requestId).get();
    if (!reqDoc.exists) { res.status(404).json(errorResponse('Request not found')); return; }
    const userId = reqDoc.data()!.userId;

    const batch = db.batch();
    batch.update(db.collection('verification_requests').doc(requestId), {
      status: 'rejected',
      rejectionReason: reason,
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.update(db.collection('users').doc(userId), {
      fullyVerified: false,
      fullVerificationStatus: 'rejected',
    });
    await batch.commit();

    await sendPush(
      userId,
      '❌ Full Verification Rejected',
      `Your Full Verification was not approved. Reason: ${reason}`,
      { type: 'verification', verificationStatus: 'rejected' }
    );

    res.json(successResponse(null, 'Full verification rejected'));
  } catch (error) {
    console.error('[Verification] rejectFullVerification error:', error);
    res.status(500).json(errorResponse('Failed to reject full verification', error));
  }
}

// ─── Legacy endpoint compat ───────────────────────────────────────────────────
export { getIdentityQueue as getVerificationQueue };
export async function approveVerification(req: Request, res: Response): Promise<void> {
  return approveIdentity(req, res);
}
export async function rejectVerification(req: Request, res: Response): Promise<void> {
  return rejectIdentity(req, res);
}
export async function requestNewVerification(req: Request, res: Response): Promise<void> {
  res.json(successResponse(null, 'Use the new identity reject endpoint with Upload Again flow'));
}
export async function reviewVerification(req: Request, res: Response): Promise<void> {
  res.json(successResponse(null, 'Deprecated'));
}
export async function scheduleHumanVerification(req: Request, res: Response): Promise<void> {
  return scheduleMeeting(req, res);
}
export async function approveHumanVerification(req: Request, res: Response): Promise<void> {
  return approveFullVerification(req, res);
}
