// @ts-nocheck
import { getAuth } from 'firebase-admin/auth';
import { Request, Response } from 'express';
import { db, admin } from '../config/firebase';
import { successResponse, errorResponse, getPaginationParams, createAuditLog, getClientIp, serverTimestamp } from '../utils/helpers';
import { NikkahUser } from '../types';

/**
 * Decides whether an FCM push should be sent.
 *
 * Ordinary notices honour the user's Push Notifications toggle. Enforcement
 * notices (`critical`) ignore it: a banned or suspended user CANNOT read the
 * in-app copy — banUser disables their Firebase Auth account and revokes their
 * refresh tokens, and the notifications subcollection requires `isSelf(uid)` to
 * read — so the push is the only channel that can still reach them. Honouring
 * an opt-out there would lock someone out with no explanation at all.
 *
 * Exported for direct unit testing.
 */
export function shouldSendPush(
  prefs: { pushNotifications?: unknown } | null | undefined,
  critical: boolean
): boolean {
  if (critical) return true;
  if (!prefs) return true; // missing doc/field defaults to enabled
  return prefs.pushNotifications !== false;
}

/**
 * Writes an in-app notification and sends a push for an admin-initiated action.
 *
 * Moderation and premium actions previously changed the user document silently:
 * the affected user was never told they had been banned, suspended, or granted
 * premium. The in-app notification always lands (it is the user's inbox); the
 * FCM push honours the user's preference unless the notice is `critical` — see
 * shouldSendPush.
 *
 * Never throws — a notification failure must not roll back the moderation
 * action itself.
 */
export async function notifyUser(
  uid: string,
  title: string,
  body: string,
  type: string,
  options: { critical?: boolean; relatedId?: string } = {}
): Promise<void> {
  try {
    const notifRef = db.collection('users').doc(uid).collection('notifications').doc();
    await notifRef.set({
      id: notifRef.id,
      title,
      body,
      type,
      isRead: false,
      createdAt: serverTimestamp(),
      ...(options.relatedId && { relatedId: options.relatedId }),
    });

    const settingsDoc = await db
      .collection('users').doc(uid)
      .collection('settings').doc('preferences')
      .get();
    if (!shouldSendPush(settingsDoc.exists ? settingsDoc.data() : null, options.critical === true)) return;

    const userDoc = await db.collection('users').doc(uid).get();
    const data = userDoc.data() || {};
    const tokens: string[] = Array.isArray(data.fcmTokens) ? [...data.fcmTokens] : [];
    if (typeof data.fcmToken === 'string' && data.fcmToken && !tokens.includes(data.fcmToken)) {
      tokens.push(data.fcmToken);
    }
    if (tokens.length === 0) return;

    // The Flutter tap-handler (push_notification_service.dart) routes off
    // `data.relatedId` (and `data.senderId` for chat) — without relatedId
    // here, a support/bug-report push would arrive but tapping it could
    // never open the specific ticket, only fall through silently.
    await admin.messaging().sendEachForMulticast({
      notification: { title, body },
      data: { type, ...(options.relatedId && { relatedId: options.relatedId }) },
      tokens,
    });
  } catch (err) {
    console.error(`[notifyUser] Failed to notify ${uid}:`, err);
  }
}

export async function getUsers(req: Request, res: Response): Promise<void> {
  try {
    const { page, limit } = getPaginationParams(req.query);
    const { search, filter, sortBy = 'createdAt', sortOrder = 'desc' } = req.query as Record<string, string>;

    let query: FirebaseFirestore.Query = db.collection('users');

    // Apply filters
    if (filter === 'premium') query = query.where('isPremium', '==', true);
    else if (filter === 'banned') query = query.where('isBanned', '==', true);
    else if (filter === 'suspended') query = query.where('isSuspended', '==', true);
    else if (filter === 'pending_photo') query = query.where('photoStatus', '==', 'pending');
    else if (filter === 'pending_verification') query = query.where('verificationStatus', '==', 'pending');

    // Sorting
    query = query.orderBy(sortBy, sortOrder as FirebaseFirestore.OrderByDirection);

    // Total count
    const countSnap = await query.count().get();
    const total = countSnap.data().count;

    // Pagination
    const snapshot = await query.offset((page - 1) * limit).limit(limit).get();

    // email/phoneNumber are relocated off users/{uid} into sensitive_data/{uid}
    // (mirrorContactInfoToSensitiveData, functions/src/index.ts) — the whole
    // point being that no OTHER end user's client can read them anymore. The
    // admin panel is a legitimate, authorized exception (Admin SDK bypasses
    // Firestore rules regardless), so it explicitly re-merges them here.
    const sensitiveDocs = await Promise.all(
      snapshot.docs.map(doc => db.collection('sensitive_data').doc(doc.id).get())
    );
    const sensitiveById = new Map(
      sensitiveDocs.map(d => [d.id, d.exists ? d.data() : null])
    );

    let users = snapshot.docs.map(doc => {
      const data = doc.data();
      const sensitive = sensitiveById.get(doc.id);
      // Flutter writes currentCity, not city (see user_model.dart) — every
      // `.city` read below was always undefined against real documents.
      return {
        uid: doc.id,
        ...data,
        email: data.email ?? sensitive?.email,
        phoneNumber: data.phoneNumber ?? sensitive?.phoneNumber,
        city: data.city || data.currentCity || data.permanentCity || '',
      };
    }) as NikkahUser[];

    // Client-side search (Firestore doesn't support full-text search natively)
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(u =>
        u.displayName?.toLowerCase().includes(searchLower) ||
        u.email?.toLowerCase().includes(searchLower) ||
        u.city?.toLowerCase().includes(searchLower)
      );
    }

    res.json(successResponse({
      data: users,
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    }));
  } catch (error) {
    console.error('[Users] getUsers error:', error);
    res.status(500).json(errorResponse('Failed to fetch users', error));
  }
}

export async function getUserById(req: Request, res: Response): Promise<void> {
  try {
    const { uid } = req.params as { uid: string };
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) {
      res.status(404).json(errorResponse('User not found'));
      return;
    }
    const data = doc.data()!;
    const sensitive = await db.collection('sensitive_data').doc(uid).get();
    res.json(successResponse({
      uid: doc.id,
      ...data,
      email: data.email ?? sensitive.data()?.email,
      phoneNumber: data.phoneNumber ?? sensitive.data()?.phoneNumber,
    }));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to fetch user', error));
  }
}

export async function banUser(req: Request, res: Response): Promise<void> {
  try {
    const { uid } = req.params as { uid: string };
    const { reason } = req.body;

    await db.collection('users').doc(uid).update({
      isBanned: true,
      banReason: reason || 'Violated community guidelines',
      bannedAt: serverTimestamp(),
      bannedBy: req.admin!.uid,
    });

    await createAuditLog({
      adminId: req.admin!.uid,
      adminEmail: req.admin!.email,
      action: 'BAN_USER',
      targetId: uid,
      targetType: 'user',
      details: { reason },
      timestamp: new Date(),
      ip: getClientIp(req),
    });

    // Also disable in Firebase Auth and force any already-open session to
    // re-authenticate on its next token refresh (disabling alone only blocks
    // brand-new sign-ins, not a session that's already holding a valid token).
    try {
      await getAuth().updateUser(uid, { disabled: true });
      await getAuth().revokeRefreshTokens(uid);
    } catch { /* User might not have Firebase Auth account */ }

    await notifyUser(
      uid,
      'Account Banned',
      `Your account has been banned. Reason: ${reason || 'Violated community guidelines'}`,
      'account_banned',
      { critical: true }
    );

    res.json(successResponse(null, 'User banned successfully'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to ban user', error));
  }
}

export async function unbanUser(req: Request, res: Response): Promise<void> {
  try {
    const { uid } = req.params as { uid: string };
    await db.collection('users').doc(uid).update({
      isBanned: false,
      banReason: null,
      bannedAt: null,
      bannedBy: null,
    });
    try {
      await getAuth().updateUser(uid, { disabled: false });
    } catch { /* ignore */ }

    await createAuditLog({
      adminId: req.admin!.uid,
      adminEmail: req.admin!.email,
      action: 'UNBAN_USER',
      targetId: uid,
      targetType: 'user',
      details: {},
      timestamp: new Date(),
      ip: getClientIp(req),
    });

    await notifyUser(
      uid,
      'Account Restored',
      'Your account has been reinstated. Welcome back.',
      'account_unbanned',
      { critical: true }
    );

    res.json(successResponse(null, 'User unbanned successfully'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to unban user', error));
  }
}

export async function suspendUser(req: Request, res: Response): Promise<void> {
  try {
    const { uid } = req.params as { uid: string };
    const { reason, days = 7 } = req.body;
    const suspendedUntil = new Date();
    suspendedUntil.setDate(suspendedUntil.getDate() + Number(days));

    await db.collection('users').doc(uid).update({
      isSuspended: true,
      banReason: reason,
      suspendedUntil: suspendedUntil,
    });

    try {
      await getAuth().revokeRefreshTokens(uid);
    } catch { /* User might not have Firebase Auth account */ }

    await createAuditLog({
      adminId: req.admin!.uid,
      adminEmail: req.admin!.email,
      action: 'SUSPEND_USER',
      targetId: uid,
      targetType: 'user',
      details: { reason, days, suspendedUntil: suspendedUntil.toISOString() },
      timestamp: new Date(),
      ip: getClientIp(req),
    });

    await notifyUser(
      uid,
      'Account Suspended',
      `Your account has been suspended for ${days} days. Reason: ${reason || 'Violation of community rules'}`,
      'account_suspended',
      { critical: true }
    );

    res.json(successResponse(null, `User suspended for ${days} days`));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to suspend user', error));
  }
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const { uid } = req.params as { uid: string };
    await db.collection('users').doc(uid).delete();
    try {
      await getAuth().deleteUser(uid);
    } catch { /* ignore */ }
    await createAuditLog({
      adminId: req.admin!.uid,
      adminEmail: req.admin!.email,
      action: 'DELETE_USER',
      targetId: uid,
      targetType: 'user',
      details: {},
      timestamp: new Date(),
      ip: getClientIp(req),
    });
    res.json(successResponse(null, 'User deleted successfully'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to delete user', error));
  }
}

export async function grantPremium(req: Request, res: Response): Promise<void> {
  try {
    const { uid } = req.params as { uid: string };
    const { expiresInDays = 30 } = req.body;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(expiresInDays));

    await db.collection('users').doc(uid).update({
      isPremium: true,
      premiumGrantedBy: req.admin!.uid,
      premiumGrantedAt: serverTimestamp(),
      // Canonical field read by the Flutter app, getDiscoveryFeed and
      // checkSubscriptionCron. This previously wrote `premiumExpiresAt`, which
      // nothing else in the codebase reads — so an admin-granted subscription
      // never showed an expiry and was never picked up by the expiry cron.
      premiumExpiryDate: expiresAt,
      premiumGracePeriodExpiry: null,
    });

    await createAuditLog({
      adminId: req.admin!.uid,
      adminEmail: req.admin!.email,
      action: 'GRANT_PREMIUM',
      targetId: uid,
      targetType: 'user',
      details: { expiresInDays },
      timestamp: new Date(),
      ip: getClientIp(req),
    });

    await notifyUser(
      uid,
      'Premium Activated',
      `You have been granted ${expiresInDays} days of Premium access. Enjoy!`,
      'premium_granted'
    );

    res.json(successResponse(null, `Premium granted for ${expiresInDays} days`));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to grant premium', error));
  }
}

export async function revokePremium(req: Request, res: Response): Promise<void> {
  try {
    const { uid } = req.params as { uid: string };
    await db.collection('users').doc(uid).update({
      isPremium: false,
      premiumExpiryDate: null,
      premiumGracePeriodExpiry: null,
    });

    await createAuditLog({
      adminId: req.admin!.uid,
      adminEmail: req.admin!.email,
      action: 'REVOKE_PREMIUM',
      targetId: uid,
      targetType: 'user',
      details: {},
      timestamp: new Date(),
      ip: getClientIp(req),
    });

    res.json(successResponse(null, 'Premium revoked'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to revoke premium', error));
  }
}

