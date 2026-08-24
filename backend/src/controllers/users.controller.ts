// @ts-nocheck
import { getAuth } from 'firebase-admin/auth';
import { Request, Response } from 'express';
import { db, admin } from '../config/firebase';
import { successResponse, errorResponse, getPaginationParams, createAuditLog, getClientIp, serverTimestamp } from '../utils/helpers';
import { NikkahUser } from '../types';

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

    let users = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
    })) as NikkahUser[];

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
    res.json(successResponse({ uid: doc.id, ...doc.data() }));
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

    // Also disable in Firebase Auth
    try {
      await getAuth().updateUser(uid, { disabled: true });
    } catch { /* User might not have Firebase Auth account */ }

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
      premiumExpiresAt: expiresAt,
    });

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
      premiumExpiresAt: null,
    });
    res.json(successResponse(null, 'Premium revoked'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to revoke premium', error));
  }
}

