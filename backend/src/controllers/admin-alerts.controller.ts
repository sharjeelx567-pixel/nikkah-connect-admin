// @ts-nocheck
import { Request, Response } from 'express';
import { db } from '../config/firebase';

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('admin_notifications')
      .where('isRead', '==', false)
      .get();
      
    res.json({ count: snapshot.size });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};

export const getAlerts = async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('admin_notifications')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
      
    const data = snapshot.docs.map(doc => {
      const docData = doc.data();
      return {
        id: doc.id,
        ...docData,
        timestamp: docData.timestamp ? docData.timestamp.toDate().toISOString() : new Date().toISOString()
      };
    });
    
    res.json({ data });
  } catch (error) {
    console.error('Error fetching admin alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.collection('admin_notifications').doc(id).update({ isRead: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking as read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
};

const ALLOWED_ALERT_TYPES = ['photo_upload', 'verification', 'general'];
const MAX_TEXT_LENGTH = 300;

export const createAlert = async (req: Request, res: Response) => {
  try {
    const { title, body, type } = req.body;

    if (typeof title !== 'string' || typeof body !== 'string') {
      res.status(400).json({ success: false, error: 'title and body must be strings' });
      return;
    }
    if (title.length > MAX_TEXT_LENGTH || body.length > MAX_TEXT_LENGTH) {
      res.status(400).json({ success: false, error: `title/body must be under ${MAX_TEXT_LENGTH} characters` });
      return;
    }
    const safeType = ALLOWED_ALERT_TYPES.includes(type) ? type : 'general';

    // targetUid is always the verified caller's own uid (set by
    // verifyFirebaseAppUser) — never trust a client-supplied uid here, or
    // any caller could forge alerts that appear to be about another user.
    await db.collection('admin_notifications').add({
      title: title.trim() || 'Alert',
      body: body.trim(),
      type: safeType,
      targetUid: req.appUserUid || '',
      isRead: false,
      timestamp: new Date() // Admin SDK uses standard dates natively
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
};

