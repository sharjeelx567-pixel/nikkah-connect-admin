// @ts-nocheck
import { Request, Response } from 'express';
import { db, admin } from '../config/firebase';
import { successResponse, errorResponse, getPaginationParams, createAuditLog, getClientIp, serverTimestamp } from '../utils/helpers';
import { getMessaging } from 'firebase-admin/messaging';
import { APP_NAME } from '../config/branding';

// ─── Photo Approval — THE MOST CRITICAL FEATURE ─────────────────────────────
// When admin approves a photo, Firestore photoStatus changes to 'approved'.
// The Flutter app listens to this field via a real-time stream and instantly
// shows the real photo without any page refresh required.

// ─── Helper: resolve the best displayable image for a pending user ───────────
// Flutter writes to TWO different fields depending on which screen uploads:
//   1. my_profile_screen.dart  → pendingProfileImage (string)
//   2. edit_profile_screen.dart → pendingGalleryImages (string[])
// Both paths set photoStatus = 'pending', so the admin query finds both,
// but we must read whichever field actually contains the image.
function resolvePendingImage(data: any): string {
  return (
    data.pendingProfileImage ||                              // my_profile_screen upload
    (Array.isArray(data.pendingGalleryImages) && data.pendingGalleryImages.length > 0
      ? data.pendingGalleryImages[0]                        // edit_profile_screen upload
      : null) ||
    data.profileImage ||                                    // already-approved fallback
    ''
  );
}

// ─── Helper: resolve all pending images (for gallery-aware approval) ─────────
function resolvePendingGallery(data: any): string[] {
  const gallery: string[] = Array.isArray(data.pendingGalleryImages)
    ? data.pendingGalleryImages.filter(Boolean)
    : [];
  // Also include pendingProfileImage in the list if it is separate from gallery
  if (data.pendingProfileImage && !gallery.includes(data.pendingProfileImage)) {
    gallery.unshift(data.pendingProfileImage);
  }
  return gallery;
}

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

    const photos = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        uid: doc.id,
        displayName: data.displayName,
        email: data.email,
        // FIX: resolve from BOTH pendingProfileImage and pendingGalleryImages
        profileImage: resolvePendingImage(data),
        // Also expose all pending gallery images so admin can browse them
        pendingGalleryImages: resolvePendingGallery(data),
        // Flutter writes currentCity, not city (see user_model.dart)
        city: data.city || data.currentCity || data.permanentCity || '',
        gender: data.gender,
        photoStatus: data.photoStatus,
        updatedAt: data.updatedAt,
      };
    });

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
    const data = userDoc.data() || {};

    // FIX: Read pendingProfileImage OR fall back to first item in pendingGalleryImages
    const pendingImage: string =
      data.pendingProfileImage ||
      (Array.isArray(data.pendingGalleryImages) && data.pendingGalleryImages.length > 0
        ? data.pendingGalleryImages[0]
        : null) ||
      data.profileImage ||
      '';

    // FIX: Promote pendingGalleryImages → galleryImages on approval
    const pendingGallery: string[] = Array.isArray(data.pendingGalleryImages)
      ? data.pendingGalleryImages.filter(Boolean)
      : [];
    const existingGallery: string[] = Array.isArray(data.galleryImages)
      ? data.galleryImages.filter(Boolean)
      : [];
    // Merge without duplicates
    const mergedGallery = [...existingGallery, ...pendingGallery.filter(url => !existingGallery.includes(url))];

    // This single Firestore update triggers real-time update in Flutter app
    await db.collection('users').doc(uid).update({
      profileImage: pendingImage || data.profileImage || '',
      pendingProfileImage: null,
      // FIX: promote gallery images and clear pending gallery
      galleryImages: mergedGallery,
      pendingGalleryImages: [],
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
      details: { promotedGalleryCount: pendingGallery.length },
      timestamp: serverTimestamp() as any,
      ip: getClientIp(req) as string,
    });

    const fcmToken = data.fcmToken;
    if (fcmToken) {
      try {
        await getMessaging().send({
          token: fcmToken,
          notification: {
            title: 'Photo Approved ✅',
            body: `Your profile photo has been verified and is now live on ${APP_NAME}!`,
          }
        });
      } catch (err) {
        console.error('[Photos] Failed to send approval push notification:', err);
      }
    }

    // Add to Firestore notifications subcollection so it shows in the app UI
    await db.collection('users').doc(uid).collection('notifications').add({
      title: 'Photo Approved ✅',
      body: `Your profile photo has been verified and is now live on ${APP_NAME}!`,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
      isRead: false,
      type: 'photo_approved'
    });

    console.log(`[Photos] Photo approved for user: ${uid} by admin: ${req.admin!.email}. Gallery promoted: ${pendingGallery.length} images.`);
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
      // FIX: also clear pending gallery images on rejection
      pendingGalleryImages: [],
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
      // FIX: also clear pending gallery images when requesting re-upload
      pendingGalleryImages: [],
    });

    const fcmToken = userDoc.data()?.fcmToken;
    if (fcmToken) {
      try {
        await getMessaging().send({
          token: fcmToken,
          notification: {
            title: 'Photo Re-upload Requested 📸',
            body: `Admin requested a new photo: ${reason}`,
          }
        });
      } catch (err) {
        console.error('[Photos] Failed to send reupload push notification:', err);
      }
    }

    // Add to Firestore notifications subcollection so it shows in the app UI
    await db.collection('users').doc(uid).collection('notifications').add({
      title: 'Photo Re-upload Requested 📸',
      body: `Admin requested a new photo: ${reason}`,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
      isRead: false,
      type: 'photo_reupload'
    });

    await createAuditLog({
      adminId: req.admin!.uid,
      adminEmail: req.admin!.email,
      action: 'REQUEST_PHOTO_REUPLOAD',
      targetId: uid,
      targetType: 'photo',
      details: { reason },
      timestamp: serverTimestamp() as any,
      ip: getClientIp(req) as string,
    });

    res.json(successResponse(null, 'Re-upload requested. User profile image cleared.'));
  } catch (error: any) {
    console.error('[Photos] Error requesting re-upload:', error);
    res.status(500).json(errorResponse(error.message || 'Failed to request re-upload', error));
  }
}

// ─── Per-image detail & moderation ────────────────────────────────────────
// A user document stores photos as flat URL arrays (profileImage/
// pendingProfileImage/galleryImages/pendingGalleryImages) with no per-image
// id. Each entry is uniquely identified by its own URL within that single
// user's document, so all lookups/mutations below key strictly off
// `db.collection('users').doc(uid)` + exact URL match — never touching any
// other user's document or any other image's array entry.

interface UserImageEntry {
  url: string;
  isMain: boolean;
  order: number;
  status: 'pending' | 'approved';
  uploadedAt: string | null;
}

// `imageMeta` is an optional, additive array of {url, uploadedAt} written by
// the Flutter app at upload time (edit_profile_screen.dart). Older images
// uploaded before this existed simply have no entry -> uploadedAt: null.
function resolveUploadedAt(data: any, url: string): string | null {
  const meta = Array.isArray(data.imageMeta) ? data.imageMeta : [];
  const entry = meta.find((m: any) => m && m.url === url);
  const ts = entry?.uploadedAt;
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
  if (typeof ts === 'string') return ts;
  return null;
}

// Builds the ordered, de-duplicated list of every image a user has ever
// uploaded (main + gallery, approved + pending). Order and "which one is
// main" mirror the exact same logic already used for the profile-completion
// score on the Flutter side (profile_completion_service.dart), so the count
// shown here always matches what the app itself considers "uploaded".
function buildUserImageList(data: any): UserImageEntry[] {
  const seen = new Set<string>();
  const list: UserImageEntry[] = [];
  let order = 1;

  const mainUrl: string | null = data.pendingProfileImage || data.profileImage || null;
  if (mainUrl) {
    const mainStatus: 'pending' | 'approved' = data.pendingProfileImage ? 'pending' : 'approved';
    seen.add(mainUrl);
    list.push({ url: mainUrl, isMain: true, order: order++, status: mainStatus, uploadedAt: resolveUploadedAt(data, mainUrl) });
  }

  const approvedGallery: string[] = Array.isArray(data.galleryImages) ? data.galleryImages.filter(Boolean) : [];
  for (const url of approvedGallery) {
    if (seen.has(url)) continue;
    seen.add(url);
    list.push({ url, isMain: false, order: order++, status: 'approved', uploadedAt: resolveUploadedAt(data, url) });
  }

  const pendingGallery: string[] = Array.isArray(data.pendingGalleryImages) ? data.pendingGalleryImages.filter(Boolean) : [];
  for (const url of pendingGallery) {
    if (seen.has(url)) continue;
    seen.add(url);
    list.push({ url, isMain: false, order: order++, status: 'pending', uploadedAt: resolveUploadedAt(data, url) });
  }

  return list;
}

// GET /photos/:uid — every image this specific user has uploaded, individually.
export async function getUserPhotoDetail(req: Request, res: Response): Promise<void> {
  try {
    const { uid } = req.params as { uid: string };
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      res.status(404).json(errorResponse('User not found'));
      return;
    }
    const data = userDoc.data() || {};
    const images = buildUserImageList(data);

    res.json(successResponse({
      uid,
      displayName: data.displayName,
      email: data.email,
      gender: data.gender,
      city: data.city,
      photoStatus: data.photoStatus,
      photoRejectionReason: data.photoRejectionReason,
      totalImages: images.length,
      maxImages: 6,
      images,
    }));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to fetch user photo detail', error));
  }
}

// PATCH /photos/:uid/images/approve — approve exactly one pending image
// (main or gallery) for this user, leaving every other image untouched.
export async function approveUserImage(req: Request, res: Response): Promise<void> {
  try {
    const { uid } = req.params as { uid: string };
    const { url } = req.body as { url?: string };
    if (!url) {
      res.status(400).json(errorResponse('Image url is required'));
      return;
    }

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      res.status(404).json(errorResponse('User not found'));
      return;
    }
    const data = userDoc.data() || {};

    // Snapshot this image's position/main-ness in the user's ordered photo
    // list BEFORE mutating, so the notification can reference exactly which
    // image was decided on (imageIndex mirrors what the admin UI showed).
    const imageEntry = buildUserImageList(data).find((img) => img.url === url);

    const isMain = data.pendingProfileImage === url;
    const pendingGallery: string[] = Array.isArray(data.pendingGalleryImages) ? data.pendingGalleryImages : [];
    const isGallery = !isMain && pendingGallery.includes(url);

    if (!isMain && !isGallery) {
      res.status(400).json(errorResponse('That image is not pending approval for this user'));
      return;
    }

    const updates: Record<string, any> = {};
    if (isMain) {
      updates.profileImage = url;
      updates.pendingProfileImage = null;
    } else {
      updates.pendingGalleryImages = admin.firestore.FieldValue.arrayRemove(url);
      updates.galleryImages = admin.firestore.FieldValue.arrayUnion(url);
    }

    const pendingProfileAfter = isMain ? null : (data.pendingProfileImage || null);
    const pendingGalleryAfter = isGallery ? pendingGallery.filter((u) => u !== url) : pendingGallery;
    const remainingPending = !!pendingProfileAfter || pendingGalleryAfter.length > 0;

    updates.photoStatus = remainingPending ? 'pending' : 'approved';
    if (!remainingPending) {
      updates.photoApprovedAt = serverTimestamp();
      updates.photoApprovedBy = req.admin!.uid;
      updates.photoRejectionReason = null;
    }

    await userRef.update(updates);

    await createAuditLog({
      adminId: req.admin!.uid,
      adminEmail: req.admin!.email,
      action: 'APPROVE_IMAGE',
      targetId: uid,
      targetType: 'photo',
      details: { url, isMain },
      timestamp: serverTimestamp() as any,
      ip: getClientIp(req) as string,
    });

    // Every approve/reject decision gets its OWN notification, tied to this
    // specific image — fired unconditionally (not gated on whether the
    // user's other images are still pending), and always a fresh `.add()`
    // document so it can never overwrite a sibling image's notification.
    const notifTitle = 'Image Approved';
    const notifBody = isMain
      ? 'Your profile picture has been approved by our admin team.'
      : `Your gallery photo${imageEntry ? ` (Image #${imageEntry.order})` : ''} has been approved by our admin team.`;

    const fcmToken = data.fcmToken;
    if (fcmToken) {
      try {
        await getMessaging().send({
          token: fcmToken,
          notification: { title: notifTitle, body: notifBody },
        });
      } catch (err) {
        console.error('[Photos] Failed to send approval push notification:', err);
      }
    }
    await userRef.collection('notifications').add({
      userId: uid,
      imageId: url,
      imageIndex: imageEntry?.order ?? null,
      isMainImage: isMain,
      type: 'photo_approved',
      status: 'approved',
      title: notifTitle,
      body: notifBody,
      message: notifBody,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
      isRead: false,
    });

    console.log(`[Photos] Single image approved for user: ${uid} by admin: ${req.admin!.email}.`);
    res.json(successResponse(null, 'Image approved.'));
  } catch (error: any) {
    console.error('[Photos] Error approving single image:', error);
    res.status(500).json(errorResponse(error.message || 'Failed to approve image', error));
  }
}

// PATCH /photos/:uid/images/reject — reject exactly one pending image
// (main or gallery) for this user, leaving every other image untouched.
export async function rejectUserImage(req: Request, res: Response): Promise<void> {
  try {
    const { uid } = req.params as { uid: string };
    const { url, reason = 'Photo does not meet community guidelines' } = req.body as { url?: string; reason?: string };
    if (!url) {
      res.status(400).json(errorResponse('Image url is required'));
      return;
    }

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      res.status(404).json(errorResponse('User not found'));
      return;
    }
    const data = userDoc.data() || {};

    // Snapshot this image's position/main-ness before mutating, same as
    // approveUserImage, so the notification names the exact image decided on.
    const imageEntry = buildUserImageList(data).find((img) => img.url === url);

    const isMain = data.pendingProfileImage === url;
    const pendingGallery: string[] = Array.isArray(data.pendingGalleryImages) ? data.pendingGalleryImages : [];
    const isGallery = !isMain && pendingGallery.includes(url);

    if (!isMain && !isGallery) {
      res.status(400).json(errorResponse('That image is not pending approval for this user'));
      return;
    }

    const updates: Record<string, any> = {};
    if (isMain) {
      updates.pendingProfileImage = null;
    } else {
      updates.pendingGalleryImages = admin.firestore.FieldValue.arrayRemove(url);
    }

    const pendingProfileAfter = isMain ? null : (data.pendingProfileImage || null);
    const pendingGalleryAfter = isGallery ? pendingGallery.filter((u) => u !== url) : pendingGallery;
    const remainingPending = !!pendingProfileAfter || pendingGalleryAfter.length > 0;

    updates.photoStatus = remainingPending ? 'pending' : 'rejected';
    updates.photoRejectionReason = reason;
    updates.photoRejectedAt = serverTimestamp();
    updates.photoRejectedBy = req.admin!.uid;

    await userRef.update(updates);

    await createAuditLog({
      adminId: req.admin!.uid,
      adminEmail: req.admin!.email,
      action: 'REJECT_IMAGE',
      targetId: uid,
      targetType: 'photo',
      details: { url, reason, isMain },
      timestamp: serverTimestamp() as any,
      ip: getClientIp(req) as string,
    });

    // Own notification per image, same as approve — never gated on the rest
    // of this user's pending images, always a new document.
    const notifTitle = 'Image Rejected';
    const notifBody = isMain
      ? `Your profile picture was rejected. Please upload another image. Reason: ${reason}`
      : `Your gallery photo${imageEntry ? ` (Image #${imageEntry.order})` : ''} was rejected. Please upload another image. Reason: ${reason}`;

    const fcmToken = data.fcmToken;
    if (fcmToken) {
      try {
        await getMessaging().send({
          token: fcmToken,
          notification: { title: notifTitle, body: notifBody },
        });
      } catch (err) {
        console.error('[Photos] Failed to send rejection push notification:', err);
      }
    }
    await userRef.collection('notifications').add({
      userId: uid,
      imageId: url,
      imageIndex: imageEntry?.order ?? null,
      isMainImage: isMain,
      type: 'photo_rejected',
      status: 'rejected',
      title: notifTitle,
      body: notifBody,
      message: notifBody,
      reason,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
      isRead: false,
    });

    res.json(successResponse(null, 'Image rejected. User will be notified.'));
  } catch (error: any) {
    console.error('[Photos] Error rejecting single image:', error);
    res.status(500).json(errorResponse(error.message || 'Failed to reject image', error));
  }
}

export async function getAllPhotos(req: Request, res: Response): Promise<void> {
  try {
    const { status } = req.query as { status?: string };
    const { page, limit } = getPaginationParams(req.query);

    let query: any = db.collection('users');

    if (status && status !== 'all') {
      query = query.where('photoStatus', '==', status);
    } else {
      // Only show users with photos
      query = query.where('photoStatus', 'in', ['pending', 'approved', 'rejected']);
    }

    query = query.offset((page - 1) * limit).limit(limit);
    const snapshot = await query.get();

    const photos = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        uid: doc.id,
        displayName: data.displayName,
        // FIX: for pending users, show the pending image; for approved, show profileImage
        profileImage: data.photoStatus === 'pending'
          ? resolvePendingImage(data)
          : (data.profileImage || ''),
        pendingGalleryImages: data.photoStatus === 'pending'
          ? resolvePendingGallery(data)
          : [],
        photoStatus: data.photoStatus,
        photoRejectionReason: data.photoRejectionReason,
        updatedAt: data.updatedAt,
      };
    });

    res.json(successResponse({ data: photos }));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to fetch photos', error));
  }
}




export async function bulkApprovePhotos(req: Request, res: Response): Promise<void> {
  try {
    const { uids } = req.body as { uids: string[] };

    if (!Array.isArray(uids) || uids.length === 0) {
      res.status(400).json(errorResponse('Array of user IDs (uids) is required'));
      return;
    }

    const results = await Promise.all(
      uids.map(async (uid) => {
        try {
          const userDoc = await db.collection('users').doc(uid).get();
          if (!userDoc.exists) return null;
          const data = userDoc.data() || {};

          const pendingImage: string =
            data.pendingProfileImage ||
            (Array.isArray(data.pendingGalleryImages) && data.pendingGalleryImages.length > 0
              ? data.pendingGalleryImages[0]
              : null) ||
            data.profileImage ||
            '';

          const pendingGallery: string[] = Array.isArray(data.pendingGalleryImages)
            ? data.pendingGalleryImages.filter(Boolean)
            : [];
          const existingGallery: string[] = Array.isArray(data.galleryImages)
            ? data.galleryImages.filter(Boolean)
            : [];
          const mergedGallery = [...existingGallery, ...pendingGallery.filter(url => !existingGallery.includes(url))];

          await db.collection('users').doc(uid).update({
            profileImage: pendingImage || data.profileImage || '',
            pendingProfileImage: null,
            galleryImages: mergedGallery,
            pendingGalleryImages: [],
            photoStatus: 'approved',
            photoApprovedAt: serverTimestamp(),
            photoApprovedBy: req.admin?.uid || 'admin',
            photoRejectionReason: null,
          });

          await db.collection('users').doc(uid).collection('notifications').add({
            title: 'Photo Approved ✨',
            body: `Your profile photo has been verified and is now live on ${APP_NAME}!`,
            timestamp: serverTimestamp(),
            createdAt: serverTimestamp(),
            isRead: false,
            type: 'photo_approved'
          });

          return uid;
        } catch (e) {
          console.error(`Error approving user photo ${uid}:`, e);
          return null;
        }
      })
    );

    const approvedUids = results.filter(Boolean) as string[];

    await createAuditLog({
      adminId: req.admin?.uid || 'admin',
      adminEmail: req.admin?.email || 'admin',
      action: 'BULK_APPROVE_PHOTOS',
      targetId: approvedUids.join(','),
      targetType: 'photo',
      details: { requestedCount: uids.length, approvedCount: approvedUids.length, uids: approvedUids },
      timestamp: new Date(),
      ip: getClientIp(req),
    });

    res.json(successResponse({ approvedCount: approvedUids.length }, 'Photos approved successfully'));
  } catch (error: any) {
    res.status(500).json(errorResponse('Failed to bulk approve photos', error));
  }
}

