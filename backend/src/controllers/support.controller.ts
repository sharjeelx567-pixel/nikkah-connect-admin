import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { successResponse, errorResponse, getPaginationParams } from '../utils/helpers';
import { FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

export async function getTickets(req: Request, res: Response): Promise<void> {
  try {
    const { status, limit, lastVisible } = req.query;
    const { limit: limitNum } = getPaginationParams(req);

    let query: FirebaseFirestore.Query = db.collection('support_tickets').orderBy('updatedAt', 'desc');

    if (status) {
      query = query.where('status', '==', status as string);
    }

    if (lastVisible) {
      const lastDoc = await db.collection('support_tickets').doc(lastVisible as string).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    query = query.limit(limitNum);
    const snapshot = await query.get();

    const tickets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(successResponse({
      tickets,
      lastVisible: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null,
      hasMore: snapshot.docs.length === limitNum
    }));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to fetch support tickets', error));
  }
}

export async function getTicketDetails(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const ticketDoc = await db.collection('support_tickets').doc(id).get();

    if (!ticketDoc.exists) {
      res.status(404).json(errorResponse('Ticket not found'));
      return;
    }

    // Reset unread count for admin
    await ticketDoc.ref.update({
      unreadCountAdmin: 0
    });

    // Mark unread user messages as read
    const unreadMsgsSnap = await ticketDoc.ref.collection('messages')
      .where('senderType', '==', 'user')
      .where('isRead', '==', false)
      .get();

    if (!unreadMsgsSnap.empty) {
      const batch = db.batch();
      unreadMsgsSnap.docs.forEach(doc => {
        batch.update(doc.ref, { isRead: true });
      });
      await batch.commit();
    }

    const ticketData = ticketDoc.data();
    
    // Fetch messages
    const messagesSnap = await ticketDoc.ref.collection('messages').orderBy('timestamp', 'asc').get();
    const messages = messagesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(successResponse({
      ticket: { id: ticketDoc.id, ...ticketData },
      messages
    }));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to fetch ticket details', error));
  }
}

export async function updateTicketStatus(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!status) {
      res.status(400).json(errorResponse('Status is required'));
      return;
    }

    const ticketRef = db.collection('support_tickets').doc(id);
    await ticketRef.update({
      status,
      updatedAt: FieldValue.serverTimestamp()
    });

    // Log activity
    await db.collection('ticket_activity').add({
      ticketId: id,
      action: 'STATUS_CHANGED',
      adminId: (req as any).admin?.uid || 'system',
      details: `Status changed to ${status}`,
      timestamp: FieldValue.serverTimestamp()
    });

    res.json(successResponse(null, 'Ticket status updated successfully'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to update ticket status', error));
  }
}

export async function assignTicket(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const adminId = (req as any).admin?.uid;

    if (!adminId) {
      res.status(401).json(errorResponse('Unauthorized'));
      return;
    }

    const ticketRef = db.collection('support_tickets').doc(id);
    await ticketRef.update({
      assignedAdminId: adminId,
      status: 'Open',
      updatedAt: FieldValue.serverTimestamp()
    });

    // Log activity
    await db.collection('ticket_activity').add({
      ticketId: id,
      action: 'TICKET_ASSIGNED',
      adminId: adminId,
      details: 'Admin claimed the ticket',
      timestamp: FieldValue.serverTimestamp()
    });

    res.json(successResponse(null, 'Ticket assigned successfully'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to assign ticket', error));
  }
}

export async function sendAdminReply(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { content, type = 'text', mediaUrl = null } = req.body;

    if (!content && !mediaUrl) {
      res.status(400).json(errorResponse('Content or mediaUrl is required'));
      return;
    }

    const adminId = (req as any).admin?.uid;
    const msgRef = db.collection('support_tickets').doc(id).collection('messages').doc();

    await msgRef.set({
      senderId: adminId,
      senderType: 'admin',
      content,
      type,
      mediaUrl,
      isRead: false,
      delivered: true,
      timestamp: FieldValue.serverTimestamp()
    });

    

    res.json(successResponse({ messageId: msgRef.id }, 'Reply sent successfully'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to send reply', error));
  }
}

export async function getUnreadTicketsCount(req: Request, res: Response): Promise<void> {
  try {
    const snapshot = await db.collection('support_tickets')
      .where('unreadCountAdmin', '>', 0)
      .get();
    res.json(successResponse({ count: snapshot.size }));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to fetch unread count', error));
  }
}
