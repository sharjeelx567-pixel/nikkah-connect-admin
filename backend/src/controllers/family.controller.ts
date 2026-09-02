// @ts-nocheck
import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { successResponse, errorResponse, createAuditLog, getClientIp } from '../utils/helpers';
import { FieldValue } from 'firebase-admin/firestore';

// A guardian/chaperone can flag a message inside a monitored chat (see
// flagChaperoneMessage in functions/src/index.ts) — this writes real safety
// signals to `chaperone_flags`, but until now nothing in the admin panel
// ever surfaced them; staff had no way to see or act on a chaperone's report.
export async function getChaperoneFlags(req: Request, res: Response): Promise<void> {
  try {
    const snapshot = await db.collection('chaperone_flags')
      .where('status', '==', 'flagged')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const flags = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();

        const [chaperoneDoc, chatDoc, messageDoc] = await Promise.all([
          data.chaperoneId ? db.collection('users').doc(data.chaperoneId).get() : null,
          data.chatId ? db.collection('chats').doc(data.chatId).get() : null,
          data.chatId && data.messageId
            ? db.collection('chats').doc(data.chatId).collection('messages').doc(data.messageId).get()
            : null,
        ]);

        const participantIds: string[] = chatDoc?.data()?.participants || [];
        const participants = await Promise.all(
          participantIds.map(async (uid) => {
            const u = await db.collection('users').doc(uid).get();
            return { uid, displayName: u.data()?.displayName || 'Unknown' };
          })
        );

        return {
          id: doc.id,
          chatId: data.chatId,
          messageId: data.messageId,
          reason: data.reason,
          status: data.status,
          createdAt: data.createdAt,
          chaperoneName: chaperoneDoc?.data()?.displayName || 'Unknown chaperone',
          chaperoneId: data.chaperoneId,
          participants,
          messageContent: messageDoc?.data()?.content || messageDoc?.data()?.text || '(message unavailable)',
        };
      })
    );

    res.json(successResponse(flags));
  } catch (error) {
    console.error('[Family] getChaperoneFlags error:', error);
    res.status(500).json(errorResponse('Failed to fetch chaperone flags', error));
  }
}

export async function resolveChaperoneFlag(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const flagRef = db.collection('chaperone_flags').doc(id);
    const flagDoc = await flagRef.get();
    if (!flagDoc.exists) {
      res.status(404).json(errorResponse('Flag not found'));
      return;
    }

    await flagRef.update({
      status: 'reviewed',
      reviewedBy: req.admin!.uid,
      reviewedAt: FieldValue.serverTimestamp(),
    });

    await createAuditLog({
      adminId: req.admin!.uid,
      adminEmail: req.admin!.email,
      action: 'RESOLVE_CHAPERONE_FLAG',
      targetId: id,
      targetType: 'report' as any,
      details: {},
      timestamp: new Date(),
      ip: getClientIp(req),
    });

    res.json(successResponse(null, 'Flag marked as reviewed'));
  } catch (error) {
    console.error('[Family] resolveChaperoneFlag error:', error);
    res.status(500).json(errorResponse('Failed to resolve flag', error));
  }
}
