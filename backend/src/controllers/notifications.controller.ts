import { Request, Response } from 'express';
import { db, admin } from '../config/firebase';
import { successResponse, errorResponse, getPaginationParams, serverTimestamp } from '../utils/helpers';
import { FieldPath, WriteBatch } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

export async function sendNotification(req: Request, res: Response): Promise<void> {
  try {
    const { title, body, audience, targetUid, scheduledAt } = req.body;

    if (!title || !body || !audience) {
      res.status(400).json(errorResponse('Title, body, and audience are required.'));
      return;
    }

    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
    const isScheduled = scheduledDate && scheduledDate > new Date();

    if (isScheduled) {
      // Create a scheduled notification task in Firestore
      const docRef = await db.collection('scheduled_notifications').add({
        title,
        body,
        audience,
        targetUid: targetUid || null,
        scheduledAt: scheduledDate,
        status: 'pending',
        sentBy: req.admin!.uid,
        createdAt: serverTimestamp(),
      });

      res.json(successResponse({ id: docRef.id }, 'Notification scheduled successfully.'));
      return;
    }

    // Immediate dispatch
    let query: FirebaseFirestore.Query = db.collection('users');

    if (audience === 'premium') {
      query = query.where('isPremium', '==', true);
    } else if (audience === 'verified') {
      query = query.where('isVerified', '==', true);
    } else if (audience === 'specific') {
      if (!targetUid) {
        res.status(400).json(errorResponse('targetUid is required for specific audience'));
        return;
      }
      query = query.where(FieldPath.documentId(), '==', targetUid);
    }

    const snapshot = await query.get();
    const tokenSet = new Set<string>();
    
    const batches: WriteBatch[] = [];
    let currentBatch = db.batch();
    let count = 0;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.fcmToken) {
        tokenSet.add(data.fcmToken);
      }
      
      const notifRef = doc.ref.collection('notifications').doc();
      currentBatch.set(notifRef, {
        title,
        body,
        isRead: false,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      
      count++;
      if (count === 500) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        count = 0;
      }
    });
    
    if (count > 0) {
      batches.push(currentBatch);
    }
    
    await Promise.all(batches.map(b => b.commit()));

    const tokens = Array.from(tokenSet);
    let successCount = 0;
    let failureCount = 0;

    if (tokens.length > 0) {
      // Send multicast notification using Firebase Admin SDK
      const message = {
        notification: { title, body },
        tokens: tokens,
      };

      try {
        const response = await getMessaging().sendEachForMulticast(message);
        successCount = response.successCount;
        failureCount = response.failureCount;
      } catch (err) {
        console.error('[Notifications] Multicast send error:', err);
      }
    }

    // Save to history log
    const docRef = await db.collection('notifications_log').add({
      title,
      body,
      audience,
      targetUid: targetUid || null,
      sentAt: serverTimestamp(),
      sentBy: req.admin!.uid,
      successCount,
      failureCount,
      totalTargets: tokens.length,
    });

    res.json(successResponse({
      id: docRef.id,
      successCount,
      failureCount,
      totalTargets: tokens.length,
    }, 'Notification sent successfully.'));

  } catch (error) {
    console.error('[Notifications] Send error:', error);
    res.status(500).json(errorResponse('Failed to send notification', error));
  }
}

export async function getNotificationHistory(req: Request, res: Response): Promise<void> {
  try {
    const { page, limit } = getPaginationParams(req.query);

    const snapshot = await db.collection('notifications_log')
      .orderBy('sentAt', 'desc')
      .offset((page - 1) * limit)
      .limit(limit)
      .get();

    const countSnap = await db.collection('notifications_log').count().get();
    const total = countSnap.data().count;

    const history = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(successResponse({
      data: history,
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    }));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to fetch notification history', error));
  }
}

export async function getScheduledNotifications(req: Request, res: Response): Promise<void> {
  try {
    const snapshot = await db.collection('scheduled_notifications')
      .where('status', '==', 'pending')
      .orderBy('scheduledAt', 'asc')
      .get();

    const scheduled = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(successResponse(scheduled));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to fetch scheduled notifications', error));
  }
}

export async function deleteScheduledNotification(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    await db.collection('scheduled_notifications').doc(id).delete();
    res.json(successResponse(null, 'Scheduled notification cancelled'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to cancel notification', error));
  }
}
