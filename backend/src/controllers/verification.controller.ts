// @ts-nocheck
import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { successResponse, errorResponse, serverTimestamp } from '../utils/helpers';
import { FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, r2Buckets } from '../config/r2';

// â”€â”€â”€ Private Document URL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// The Flutter app (upload_service.dart / R2UploadService.uploadMedia) never
// stores a plain public URL for verification documents — only an opaque R2
// object key (e.g. "users/<uid>/<timestamp>.jpg"). The admin CNIC/full
// verification queues were built assuming cnicFrontUrl/cnicBackUrl were
// directly renderable <img src> URLs, so every review card showed a broken
// image instead of the document. This mints a 5-minute signed GET on demand,
// mirroring the same private-document pattern Cloud Functions already uses
// for the app itself (getPrivateDocumentUrl, functions/src/index.ts) — same
// idea, this backend's own R2 credentials instead of going through Firebase.
export async function getDocumentUrl(req: Request, res: Response): Promise<void> {
  try {
    const { key } = req.query as { key?: string };
    if (!key) {
      res.status(400).json(errorResponse('Missing key query parameter'));
      return;
    }
    // Reject anything that isn't a plain users/<uid>/<file> key — refuses
    // traversal, absolute URLs, or a key naming a bucket other than intended.
    if (!/^users\/[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(key)) {
      res.status(400).json(errorResponse('Malformed key'));
      return;
    }
    const bucket = r2Buckets.verification.bucket;
    if (!bucket) {
      res.status(500).json(errorResponse('R2_VERIFICATION_BUCKET is not configured'));
      return;
    }
    const url = await getSignedUrl(
      r2Client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: 300 }
    );
    res.json(successResponse({ url, expiresInSeconds: 300 }));
  } catch (error) {
    console.error('[Verification] getDocumentUrl error:', error);
    res.status(500).json(errorResponse('Failed to generate document URL', error));
  }
}

// â”€â”€â”€ Shared Notification Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function getVerificationStats(req: Request, res: Response): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // approvedToday/rejectedToday previously counted ALL-TIME approved/rejected
    // verification_requests (no date filter despite the "Today" label), and
    // were entirely blind to voice verification (which lives on the `users`
    // collection, not `verification_requests`) — so approving/rejecting a
    // voice item on the Voice tab never moved any of these numbers.
    const [
      pendingIdentity, pendingFull,
      identityApprovedToday, identityRejectedToday,
      fullApprovedToday, fullRejectedToday,
      voiceApprovedTodaySnap, voiceRejectedTodaySnap,
      identityVerifiedSnap, voiceVerifiedSnap,
    ] = await Promise.all([
      db.collection('verification_requests')
        .where('type', '==', 'identity')
        .where('status', '==', 'pending')
        .count().get(),
      db.collection('verification_requests')
        .where('type', '==', 'full')
        .where('status', 'in', ['payment_pending', 'waiting_schedule', 'scheduled', 'meeting_done'])
        .count().get(),
      db.collection('verification_requests')
        .where('type', '==', 'identity')
        .where('status', '==', 'approved')
        .where('updatedAt', '>=', today)
        .count().get(),
      db.collection('verification_requests')
        .where('type', '==', 'identity')
        .where('status', '==', 'rejected')
        .where('updatedAt', '>=', today)
        .count().get(),
      db.collection('verification_requests')
        .where('type', '==', 'full')
        .where('status', '==', 'approved')
        .where('updatedAt', '>=', today)
        .count().get(),
      db.collection('verification_requests')
        .where('type', '==', 'full')
        .where('status', '==', 'rejected')
        .where('updatedAt', '>=', today)
        .count().get(),
      db.collection('users')
        .where('voiceVerificationStatus', '==', 'approved')
        .where('voiceVerifiedAt', '>=', today)
        .count().get(),
      db.collection('users')
        .where('voiceVerificationStatus', '==', 'rejected')
        .where('voiceRejectedAt', '>=', today)
        .count().get(),
      db.collection('users')
        .where('identityVerified', '==', true)
        .count().get(),
      db.collection('users')
        .where('genderVerified', '==', true)
        .count().get(),
    ]);

    res.json(successResponse({
      pendingIdentity: pendingIdentity.data().count,
      pendingFull: pendingFull.data().count,
      approvedToday: identityApprovedToday.data().count + fullApprovedToday.data().count + voiceApprovedTodaySnap.data().count,
      rejectedToday: identityRejectedToday.data().count + fullRejectedToday.data().count + voiceRejectedTodaySnap.data().count,
      totalIdentityVerified: identityVerifiedSnap.data().count,
      totalVoiceVerified: voiceVerifiedSnap.data().count,
    }));
  } catch (error) {
    console.error('[Verification] getStats error:', error);
    res.status(500).json(errorResponse('Failed to fetch verification stats', error));
  }
}

// â”€â”€â”€ Identity Queue â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Full Verification Queue â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Approve Identity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Reject Identity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Confirm Full Verification Payment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    await sendPush(userId, 'ðŸ’³ Payment Confirmed', 'Your payment of PKR 200 has been confirmed. Please submit your availability for the meeting.');
    res.json(successResponse(null, 'Payment confirmed'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to confirm payment', error));
  }
}

// â”€â”€â”€ Schedule Full Verification Meeting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      'ðŸ“… Meeting Scheduled!',
      `Your Full Verification meeting has been scheduled for ${meetingDate} at ${meetingTime}.`,
      { type: 'verification_meeting', meetingDate, meetingTime, meetingLink }
    );

    res.json(successResponse(null, 'Meeting scheduled'));
  } catch (error) {
    console.error('[Verification] scheduleMeeting error:', error);
    res.status(500).json(errorResponse('Failed to schedule meeting', error));
  }
}

// â”€â”€â”€ Approve Full Verification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      'ðŸ… Congratulations! Fully Verified!',
      'Your Full Verification has been approved. You now have the Fully Verified badge on your profile!',
      { type: 'verification', verificationStatus: 'approved' }
    );

    res.json(successResponse(null, 'Full verification approved'));
  } catch (error) {
    console.error('[Verification] approveFullVerification error:', error);
    res.status(500).json(errorResponse('Failed to approve full verification', error));
  }
}

// â”€â”€â”€ Reject Full Verification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Legacy endpoint compat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


// ── Voice Verification Queue & Review ────────────────────────────────────────

export async function getVoiceVerificationQueue(_req: Request, res: Response): Promise<void> {
  try {
    const snapshot = await db.collection('users')
      .where('voiceIntroUrl', '!=', null)
      .limit(100)
      .get();

    const queue: any[] = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const status = data.voiceVerificationStatus || 'pending';
      // Include pending or recent voice submissions
      queue.push({
        uid: doc.id,
        displayName: data.displayName || 'Unknown Candidate',
        email: data.email || '',
        gender: data.gender || 'Not specified',
        city: data.city || data.permanentCity || data.currentCity || 'Pakistan',
        profession: data.profession || 'Not specified',
        profileImage: data.profileImage || null,
        voiceIntroUrl: data.voiceIntroUrl,
        voiceVerificationStatus: status,
        voiceRejectionReason: data.voiceRejectionReason || null,
        genderVerified: Boolean(data.genderVerified),
        isVerified: Boolean(data.isVerified),
        createdAt: data.createdAt || null,
        submittedAt: data.updatedAt || data.createdAt || null,
      });
    });

    // Sort pending items first
    queue.sort((a, b) => {
      if (a.voiceVerificationStatus === 'pending' && b.voiceVerificationStatus !== 'pending') return -1;
      if (a.voiceVerificationStatus !== 'pending' && b.voiceVerificationStatus === 'pending') return 1;
      return 0;
    });

    res.json(successResponse(queue));
  } catch (error) {
    console.error('[Verification] getVoiceVerificationQueue error:', error);
    res.status(500).json(errorResponse('Failed to fetch voice verification queue', error));
  }
}

export async function approveVoiceVerification(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params; // target user UID

    const userDoc = await db.collection('users').doc(id).get();
    if (!userDoc.exists) {
      res.status(404).json(errorResponse('User not found'));
      return;
    }

    const userData = userDoc.data() || {};

    await db.collection('users').doc(id).update({
      voiceVerificationStatus: 'approved',
      genderVerified: true,
      isVerified: true,
      voiceVerifiedAt: serverTimestamp(),
      voiceVerifiedBy: req.admin?.email || 'admin',
      voiceRejectionReason: FieldValue.delete(),
    });

    // Send push notification
    await sendPush(
      id,
      'Voice & Gender Verification Approved! 🎙️✅',
      'Assalamu Alaikum! Your voice introduction has been verified by our moderation team. Your Verified Badge is now active.',
      { type: 'verification_voice_approved' }
    );

    // Audit Log
    const { logAction } = require('./audit.controller');
    if (logAction && req.admin) {
      await logAction(
        req.admin.uid,
        req.admin.email,
        'voice_verification_approved',
        id,
        'user',
        { gender: userData.gender, displayName: userData.displayName },
        req.ip || ''
      );
    }

    res.json(successResponse(null, 'Voice verification approved and verification badge granted.'));
  } catch (error) {
    console.error('[Verification] approveVoiceVerification error:', error);
    res.status(500).json(errorResponse('Failed to approve voice verification', error));
  }
}

export async function rejectVoiceVerification(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const userDoc = await db.collection('users').doc(id).get();
    if (!userDoc.exists) {
      res.status(404).json(errorResponse('User not found'));
      return;
    }

    const rejectionReason = reason || 'Voice recording did not meet verification guidelines or was unclear.';

    await db.collection('users').doc(id).update({
      voiceVerificationStatus: 'rejected',
      voiceRejectionReason: rejectionReason,
      genderVerified: false,
      voiceRejectedAt: serverTimestamp(),
      voiceRejectedBy: req.admin?.email || 'admin',
    });

    // Send push notification
    await sendPush(
      id,
      'Voice Verification Update',
      `Your voice verification could not be approved. Reason: ${rejectionReason}. You may re-record in your profile settings.`,
      { type: 'verification_voice_rejected', reason: rejectionReason }
    );

    // Audit Log
    const { logAction } = require('./audit.controller');
    if (logAction && req.admin) {
      await logAction(
        req.admin.uid,
        req.admin.email,
        'voice_verification_rejected',
        id,
        'user',
        { reason: rejectionReason },
        req.ip || ''
      );
    }

    res.json(successResponse(null, 'Voice verification rejected successfully.'));
  } catch (error) {
    console.error('[Verification] rejectVoiceVerification error:', error);
    res.status(500).json(errorResponse('Failed to reject voice verification', error));
  }
}
