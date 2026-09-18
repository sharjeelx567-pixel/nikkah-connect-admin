// @ts-nocheck
import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { successResponse, errorResponse, getPaginationParams, serverTimestamp, createAuditLog, getClientIp } from '../utils/helpers';
import { notifyUser } from './users.controller';

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

    // Fetch from 'post_reports' collection (Community/Relationship Posts —
    // reportPostContent in functions/src/index.ts). Deliberately a separate
    // collection from 'reports' above (which is user-reports only, no
    // contentType field) rather than conflating the two shapes; this
    // controller's merge-by-_collection design is exactly what makes
    // adding a third source this cheap.
    let postReportsQuery: FirebaseFirestore.Query = db.collection('post_reports');
    if (status && status !== 'all') {
      postReportsQuery = postReportsQuery.where('status', '==', status);
    }
    const postReportsSnap = await postReportsQuery.get();

    const rawItems: any[] = [];
    reportsSnap.docs.forEach(doc => {
      rawItems.push({ id: doc.id, _collection: 'reports', ...doc.data() });
    });
    ticketsSnap.docs.forEach(doc => {
      rawItems.push({ id: doc.id, _collection: 'support_tickets', ...doc.data() });
    });
    postReportsSnap.docs.forEach(doc => {
      rawItems.push({ id: doc.id, _collection: 'post_reports', ...doc.data() });
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
        // post_reports uses targetAuthorUid (the post/comment author), not
        // reportedUserId — same underlying concept, different field name.
        const reportedUid = doc.reportedUserId || doc.reportedProfileUid || doc.targetUid || doc.targetAuthorUid;

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
          category: doc._collection === 'post_reports'
            ? (doc.contentType === 'comment' ? 'Reported Comment' : 'Reported Post')
            : (doc.category || doc.type || 'General Report'),
          reason: rawReason,
          description: rawDescription,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          reporter: reporter || (doc.userEmail ? { name: doc.userDisplayName || doc.userEmail.split('@')[0], email: doc.userEmail, avatar: null } : { name: 'Anonymous User', email: '', avatar: null }),
          reportedUser: reportedUser || null,
          // Only present for post_reports — lets the admin UI link straight
          // to the reported content.
          ...(doc._collection === 'post_reports' ? { postId: doc.postId, commentId: doc.commentId || null, contentType: doc.contentType } : {}),
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
    let fromSupportTickets = false;
    let fromPostReports = false;

    if (!docSnap.exists) {
      docRef = db.collection('support_tickets').doc(id);
      docSnap = await docRef.get();
      fromSupportTickets = true;
    }

    if (!docSnap.exists) {
      docRef = db.collection('post_reports').doc(id);
      docSnap = await docRef.get();
      fromSupportTickets = false;
      fromPostReports = true;
    }

    if (docSnap.exists) {
      await docRef.update({
        status: 'resolved',
        resolvedBy: req.admin?.uid || 'admin',
        resolvedAt: serverTimestamp(),
      });

      const data = docSnap.data();

      // The existing 'reports'/'support_tickets' branches below never
      // called createAuditLog (a pre-existing gap in this controller) —
      // closed here only for the new post_reports path, not backfilled
      // onto the older ones.
      if (fromPostReports) {
        await createAuditLog({
          adminId: req.admin!.uid,
          adminEmail: req.admin!.email,
          action: 'RESOLVE_POST_REPORT',
          targetId: id,
          targetType: 'report',
          details: { contentType: data?.contentType, postId: data?.postId, commentId: data?.commentId || null },
          timestamp: serverTimestamp() as any,
          ip: getClientIp(req) as string,
        });
      }

      const userId = data?.reporterId || data?.userId;
      if (userId && !fromPostReports) {
        // Was writing straight to Firestore with no push and no
        // relatedId/reportId — the notification never left the in-app list
        // (no FCM data payload was ever sent), and even there tapping it
        // couldn't route anywhere since nothing identified which report it
        // was about. notifyUser matches the pattern support.controller.ts's
        // updateTicketStatus already uses for the identical "resolved"
        // case on the same underlying collection (support_tickets),
        // including the same 'bug_resolved' type when this doc turned out
        // to be a ticket rather than a user report.
        await notifyUser(
          userId,
          fromSupportTickets ? 'Your report has been resolved ✅' : 'Report Resolved',
          fromSupportTickets
            ? 'Your report has been reviewed and marked as resolved. Tap to view the conversation.'
            : 'Your report against this user has been reviewed and resolved by our moderation team.',
          fromSupportTickets ? 'bug_resolved' : 'report_resolved',
          { relatedId: id }
        );
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
    let fromPostReports = false;

    if (!docSnap.exists) {
      docRef = db.collection('support_tickets').doc(id);
      docSnap = await docRef.get();
    }

    if (!docSnap.exists) {
      docRef = db.collection('post_reports').doc(id);
      docSnap = await docRef.get();
      fromPostReports = true;
    }

    if (docSnap.exists) {
      const data = docSnap.data();
      await docRef.update({
        status: 'dismissed',
        resolvedBy: req.admin?.uid || 'admin',
        resolvedAt: serverTimestamp(),
      });

      if (fromPostReports) {
        await createAuditLog({
          adminId: req.admin!.uid,
          adminEmail: req.admin!.email,
          action: 'DISMISS_POST_REPORT',
          targetId: id,
          targetType: 'report',
          details: { contentType: data?.contentType, postId: data?.postId, commentId: data?.commentId || null },
          timestamp: serverTimestamp() as any,
          ip: getClientIp(req) as string,
        });
      }
    }
  
    res.json(successResponse(null, 'Report dismissed successfully'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to dismiss report', error));
  }
}
