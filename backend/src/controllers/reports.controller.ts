// @ts-nocheck
import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { successResponse, errorResponse, getPaginationParams, serverTimestamp } from '../utils/helpers';
import { getMessaging } from 'firebase-admin/messaging';
import { FieldValue } from 'firebase-admin/firestore';

// Helper: look up user details by ID
async function getUserInfo(userId: string | undefined | null) {
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    return null;
  }
  try {
    const userDoc = await db.collection('users').doc(userId.trim()).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      return {
        name: data?.displayName || data?.name || data?.email?.split('@')[0] || 'Unknown User',
        email: data?.email || '',
        avatar: data?.profileImage || data?.profileImageUrl || null,
        city: data?.city || data?.location || '',
        gender: data?.gender || '',
      };
    }
  } catch (_) {}
  return null;
}

export async function getReports(req: Request, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 50 } = getPaginationParams(req.query);
    const { status } = req.query as { status?: string };

    // Fetch from 'reports' collection
    let reportsQuery: FirebaseFirestore.Query = db.collection('reports');
    if (status && status !== 'all') {
      reportsQuery = reportsQuery.where('status', '==', status);
    }
    const reportsSnap = await reportsQuery.get();

    // Fetch from 'support_tickets' collection
    let ticketsQuery: FirebaseFirestore.Query = db.collection('support_tickets');
    if (status && status !== 'all') {
      ticketsQuery = ticketsQuery.where('status', '==', status);
    }
    const ticketsSnap = await ticketsQuery.get();

    const rawItems: any[] = [];
    reportsSnap.docs.forEach(doc => {
      rawItems.push({ id: doc.id, _collection: 'reports', ...doc.data() });
    });
    ticketsSnap.docs.forEach(doc => {
      rawItems.push({ id: doc.id, _collection: 'support_tickets', ...doc.data() });
    });

    // Deduplicate and sort descending by timestamp
    const itemsMap = new Map<string, any>();
    rawItems.forEach(item => {
      itemsMap.set(item.id, item);
    });
    const combined = Array.from(itemsMap.values());

    combined.sort((a, b) => {
      const timeA = a.createdAt?._seconds || a.createdAt?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
      const timeB = b.createdAt?._seconds || b.createdAt?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
      return timeB - timeA;
    });

    // Enrich with user profile data - No UIDs, no fake placeholders
    const enriched = await Promise.all(
      combined.map(async (doc) => {
        const reporterUid = doc.reporterId || doc.userId;
        const reportedUid = doc.reportedUserId || doc.reportedProfileUid || doc.targetUid;

        const [reporter, reportedUser] = await Promise.all([
          getUserInfo(reporterUid),
          getUserInfo(reportedUid),
        ]);

        const rawReason = doc.reason || doc.subject || doc.title || '';
        const rawDescription = doc.description || doc.details || doc.message || '';

        return {
          id: doc.id,
          _collection: doc._collection || 'support_tickets',
          status: (doc.status || 'open').toLowerCase(),
          category: doc.category || doc.type || 'General Report',
          reason: rawReason,
          description: rawDescription,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          reporter: reporter || (doc.userEmail ? { name: doc.userDisplayName || doc.userEmail.split('@')[0], email: doc.userEmail, avatar: null } : { name: 'Anonymous User', email: '', avatar: null }),
          reportedUser: reportedUser || null,
        };
      })
    );

    const total = enriched.length;
    const startIndex = (page - 1) * limit;
    const paginated = enriched.slice(startIndex, startIndex + limit);

    res.json(successResponse({
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasMore: startIndex + limit < total,
      },
    }));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to fetch reports', error));
  }
}

export async function resolveReport(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    
    let docRef = db.collection('reports').doc(id);
    let docSnap = await docRef.get();

    if (!docSnap.exists) {
      docRef = db.collection('support_tickets').doc(id);
      docSnap = await docRef.get();
    }

    if (docSnap.exists) {
      await docRef.update({
        status: 'resolved',
        resolvedBy: req.admin?.uid || 'admin',
        resolvedAt: serverTimestamp(),
      });

      const data = docSnap.data();
      const userId = data?.reporterId || data?.userId;
      if (userId) {
        await db.collection('users').doc(userId).collection('notifications').add({
          title: 'Report Resolved',
          body: 'Your report has been reviewed and resolved by our moderation team.',
          timestamp: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
          isRead: false,
          type: 'report_resolved',
        });
      }
    }
  
    res.json(successResponse(null, 'Report resolved successfully'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to resolve report', error));
  }
}

export async function dismissReport(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    
    let docRef = db.collection('reports').doc(id);
    let docSnap = await docRef.get();

    if (!docSnap.exists) {
      docRef = db.collection('support_tickets').doc(id);
      docSnap = await docRef.get();
    }

    if (docSnap.exists) {
      await docRef.update({
        status: 'dismissed',
        resolvedBy: req.admin?.uid || 'admin',
        resolvedAt: serverTimestamp(),
      });
    }
  
    res.json(successResponse(null, 'Report dismissed successfully'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to dismiss report', error));
  }
}
