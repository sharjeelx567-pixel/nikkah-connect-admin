import { Request, Response } from 'express';
import { db, admin } from '../config/firebase';
import { successResponse, errorResponse, getPaginationParams, serverTimestamp } from '../utils/helpers';
import { getMessaging } from 'firebase-admin/messaging';
import { FieldValue } from 'firebase-admin/firestore';

export async function getReports(req: Request, res: Response): Promise<void> {
  try {
    const { page, limit } = getPaginationParams(req.query);
    const { status } = req.query as { status?: string };

    let query: FirebaseFirestore.Query = db.collection('support_tickets');
    if (status && status !== 'all') query = query.where('status', '==', status);
    query = query.orderBy('createdAt', 'desc').offset((page - 1) * limit).limit(limit);

    const snapshot = await query.get();
    const total = (await db.collection('support_tickets').count().get()).data().count;

    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(successResponse({ data: reports, pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: page * limit < total } }));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to fetch reports', error));
  }
}

export async function resolveReport(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    
    await db.collection('support_tickets').doc(id).update({
      status: 'resolved',
      resolvedBy: req.admin!.uid,
      resolvedAt: serverTimestamp(),
    });
    
    // Notification logic
    const ticketDoc = await db.collection('support_tickets').doc(id).get();
    if (ticketDoc.exists) {
      const userId = ticketDoc.data()?.reporterId || ticketDoc.data()?.userId;
      if (userId) {
        await db.collection('users').doc(userId).collection('notifications').add({
          title: 'Report Resolved',
          body: 'Your report has been reviewed and resolved by our admin team.',
          timestamp: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
          isRead: false,
          type: 'report_resolved',
        });
        const userDoc = await db.collection('users').doc(userId).get();
        const fcmTokens = userDoc.data()?.fcmTokens || (userDoc.data()?.fcmToken ? [userDoc.data()?.fcmToken] : []);
        if (fcmTokens.length > 0) {
          try {
            await getMessaging().sendEachForMulticast({
              tokens: Array.from(new Set(fcmTokens)),
              notification: { title: 'Report Resolved', body: 'Your report has been reviewed and resolved by our admin team.' },
              android: { notification: { channelId: 'high_importance_channel' } },
              data: { type: 'report_resolved', ticketId: id }
            });
          } catch(e) { console.error('Push error:', e); }
        }
      }
    }
  
    res.json(successResponse(null, 'Report resolved'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to resolve report', error));
  }
}

export async function dismissReport(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    
    await db.collection('support_tickets').doc(id).update({ status: 'dismissed', resolvedBy: req.admin!.uid, resolvedAt: serverTimestamp() });
    
    // Notification logic
    const ticketDoc = await db.collection('support_tickets').doc(id).get();
    if (ticketDoc.exists) {
      const userId = ticketDoc.data()?.reporterId || ticketDoc.data()?.userId;
      if (userId) {
        await db.collection('users').doc(userId).collection('notifications').add({
          title: 'Report Update',
          body: 'Your report has been reviewed. No action was required at this time.',
          timestamp: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
          isRead: false,
          type: 'report_dismissed',
        });
        const userDoc = await db.collection('users').doc(userId).get();
        const fcmTokens = userDoc.data()?.fcmTokens || (userDoc.data()?.fcmToken ? [userDoc.data()?.fcmToken] : []);
        if (fcmTokens.length > 0) {
          try {
            await getMessaging().sendEachForMulticast({
              tokens: Array.from(new Set(fcmTokens)),
              notification: { title: 'Report Update', body: 'Your report has been reviewed. No action was required at this time.' },
              android: { notification: { channelId: 'high_importance_channel' } },
              data: { type: 'report_dismissed', ticketId: id }
            });
          } catch(e) { console.error('Push error:', e); }
        }
      }
    }
  
    res.json(successResponse(null, 'Report dismissed'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to dismiss report', error));
  }
}
