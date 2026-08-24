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

export const createAlert = async (req: Request, res: Response) => {
  try {
    const { title, body, type, targetUid } = req.body;
    await db.collection('admin_notifications').add({
      title: title || 'Alert',
      body: body || '',
      type: type || 'general',
      targetUid: targetUid || '',
      isRead: false,
      timestamp: new Date() // Admin SDK uses standard dates natively
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
};

