import { Request, Response } from 'express';
import { db, admin } from '../config/firebase';
import { successResponse, errorResponse, getPaginationParams, createAuditLog, getClientIp, serverTimestamp } from '../utils/helpers';
import { getMessaging } from 'firebase-admin/messaging';

// ─── Photo Approval — THE MOST CRITICAL FEATURE ──────────────────────────────
// When admin approves a photo, Firestore photoStatus changes to 'approved'.
// The Flutter app listens to this field via a real-time stream and instantly
// shows the real photo without any page refresh required.

export async function getPendingPhotos(req: Request, res: Response): Promise<void> {
  try {
    const { page, limit } = getPaginationParams(req.query);

    const snapshot = await db.collection('users')
      .where('photoStatus', '==', 'pending')
      .offset((page - 1) * limit)
      .limit(limit)
      .get();

    const countSnap = await db.collection('users').where('photoStatus', '==', 'pending').count().get();
    const total = countSnap.data().count;

    const photos = snapshot.docs.map(doc => ({
      uid: doc.id,
      displayName: doc.data().displayName,
      email: doc.data().email,
      profileImage: doc.data().pendingProfileImage || doc.data().profileImage,
      city: doc.data().city,
      gender: doc.data().gender,
      photoStatus: doc.data().photoStatus,
      updatedAt: doc.data().updatedAt,
    }));

    res.json(successResponse({
      data: photos,
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    }));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to fetch pending photos', error));
  }
}

export async function approvePhoto(req: Request, res: Response): Promise<void> {
  try {
    const { uid } = req.params as { uid: string };

    const userDoc = await db.collection('users').doc(uid).get();
    const pendingImage = userDoc.data()?.pendingProfileImage;

    // This single Firestore update triggers real-time update in Flutter app
    await db.collection('users').doc(uid).update({
      profileImage: pendingImage || userDoc.data()?.profileImage,
      pendingProfileImage: null,
      photoStatus: 'approved',
      photoApprovedAt: serverTimestamp(),
      photoApprovedBy: req.admin!.uid,
      photoRejectionReason: null,
    });

    await createAuditLog({
      adminId: req.admin!.uid,
      adminEmail: req.admin!.email,
      action: 'APPROVE_PHOTO',
      targetId: uid,
      targetType: 'photo',
      details: {},
      timestamp: serverTimestamp() as any,
      ip: getClientIp(req) as string,
    });

    const fcmToken = userDoc.data()?.fcmToken;
    if (fcmToken) {
      try {
        await getMessaging().send({
          token: fcmToken,
          notification: {
            title: 'Photo Approved ✅',
            body: 'Your profile photo has been verified and is now live on NikkahConnect!',
          }
        });
      } catch (err) {
        console.error('[Photos] Failed to send approval push notification:', err);
      }
    }

    // Add to Firestore notifications subcollection so it shows in the app UI
    await db.collection('users').doc(uid).collection('notifications').add({
      title: 'Photo Approved ✅',
      body: 'Your profile photo has been verified and is now live on NikkahConnect!',
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
      isRead: false,
      type: 'photo_approved'
    });

    console.log(`[Photos] Photo approved for user: ${uid} by admin: ${req.admin!.email}`);
    res.json(successResponse(null, 'Photo approved. Flutter app updated in real-time.'));
  } catch (error: any) {
    console.error('[Photos] Error approving photo:', error);
    res.status(500).json(errorResponse(error.message || 'Failed to approve photo', error));
  }
}

export async function rejectPhoto(req: Request, res: Response): Promise<void> {
  try {
    const { uid } = req.params as { uid: string };
    const { reason = 'Photo does not meet community guidelines' } = req.body;

    const userDoc = await db.collection('users').doc(uid).get();

    await db.collection('users').doc(uid).update({
      photoStatus: 'rejected',
      pendingProfileImage: null,
      photoRejectionReason: reason,
      photoRejectedAt: serverTimestamp(),
      photoRejectedBy: req.admin!.uid,
    });

    await createAuditLog({
      adminId: req.admin!.uid,
      adminEmail: req.admin!.email,
      action: 'REJECT_PHOTO',
      targetId: uid,
      targetType: 'photo',
      details: { reason },
      timestamp: serverTimestamp() as any,
      ip: getClientIp(req) as string,
    });

    const fcmToken = userDoc.data()?.fcmToken;
    if (fcmToken) {
      try {
        await getMessaging().send({
          token: fcmToken,
          notification: {
            title: 'Photo Update Required 📸',
            body: `Your photo was not approved: ${reason}. Please upload a new one.`,
          }
        });
      } catch (err) {
        console.error('[Photos] Failed to send rejection push notification:', err);
      }
    }

    // Add to Firestore notifications subcollection so it shows in the app UI
    await db.collection('users').doc(uid).collection('notifications').add({
      title: 'Photo Update Required 📸',
      body: `Your photo was not approved: ${reason}. Please upload a new one.`,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
      isRead: false,
      type: 'photo_rejected'
    });

    res.json(successResponse(null, 'Photo rejected. User will be notified.'));
  } catch (error: any) {
    console.error('[Photos] Error rejecting photo:', error);
    res.status(500).json(errorResponse(error.message || 'Failed to reject photo', error));
  }
}

export async function requestReupload(req: Request, res: Response): Promise<void> {
  try {
    const { uid } = req.params as { uid: string };
    const { reason = 'Please upload a clearer photo' } = req.body;

    const userDoc = await db.collection('users').doc(uid).get();

    await db.collection('users').doc(uid).update({
      photoStatus: 'none',
      photoRejectionReason: reason,
      pendingProfileImage: null,
    });

    const fcmToken = userDoc.data()?.fcmToken;
    if (fcmToken) {
      try {
        await getMessaging().send({
          token: fcmToken,
          notification: {
            title: 'Photo Re-upload Requested 🔄',
            body: `Admin requested a new photo: ${reason}`,
          }
        });
      } catch (err) {
        console.error('[Photos] Failed to send reupload push notification:', err);
      }
    }

    // Add to Firestore notifications subcollection so it shows in the app UI
    await db.collection('users').doc(uid).collection('notifications').add({
      title: 'Photo Re-upload Requested 🔄',
      body: `Admin requested a new photo: ${reason}`,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
      isRead: false,
      type: 'photo_reupload'
    });

    res.json(successResponse(null, 'Re-upload requested. User profile image cleared.'));
  } catch (error: any) {
    console.error('[Photos] Error requesting re-upload:', error);
    res.status(500).json(errorResponse(error.message || 'Failed to request re-upload', error));
  }
}

export async function getAllPhotos(req: Request, res: Response): Promise<void> {
  try {
    const { status } = req.query as { status?: string };
    const { page, limit } = getPaginationParams(req.query);

    let query: FirebaseFirestore.Query = db.collection('users');

    if (status && status !== 'all') {
      query = query.where('photoStatus', '==', status);
    } else {
      // Only show users with photos
      query = query.where('photoStatus', 'in', ['pending', 'approved', 'rejected']);
    }

    query = query.offset((page - 1) * limit).limit(limit);
    const snapshot = await query.get();

    const photos = snapshot.docs.map(doc => ({
      uid: doc.id,
      displayName: doc.data().displayName,
      profileImage: doc.data().profileImage,
      photoStatus: doc.data().photoStatus,
      photoRejectionReason: doc.data().photoRejectionReason,
      updatedAt: doc.data().updatedAt,
    }));

    res.json(successResponse({ data: photos }));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to fetch photos', error));
  }
}
