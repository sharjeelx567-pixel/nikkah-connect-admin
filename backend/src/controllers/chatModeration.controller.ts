// @ts-nocheck
import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { successResponse, errorResponse, createAuditLog, getClientIp } from '../utils/helpers';

// The admin frontend used to read flagged_chats / moderation_blocked_words
// directly via client-side onSnapshot listeners. That only ever worked for
// collections with `allow read: if true` — the admin console never
// establishes a real Firebase Auth session (it uses its own JWT, checked
// against the `admins` collection server-side), so `request.auth` is always
// null for direct client Firestore access. flagged_chats holds real user
// names/emails and message content, so making it public-read in
// firestore.rules isn't an option — route it through the existing
// authenticated backend instead, same pattern as getChaperoneFlags.

export async function getFlaggedChats(req: Request, res: Response): Promise<void> {
  try {
    const snapshot = await db.collection('flagged_chats').get();
    const chats = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(successResponse(chats));
  } catch (error) {
    console.error('[ChatModeration] getFlaggedChats error:', error);
    res.status(500).json(errorResponse('Failed to fetch flagged chats', error));
  }
}

export async function resolveFlaggedChat(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    await db.collection('flagged_chats').doc(id).delete();

    await createAuditLog({
      adminId: req.admin!.uid,
      adminEmail: req.admin!.email,
      action: 'RESOLVE_FLAGGED_CHAT',
      targetId: id,
      targetType: 'report',
      details: {},
      timestamp: new Date(),
      ip: getClientIp(req),
    });

    res.json(successResponse(null, 'Flagged chat resolved'));
  } catch (error) {
    console.error('[ChatModeration] resolveFlaggedChat error:', error);
    res.status(500).json(errorResponse('Failed to resolve flagged chat', error));
  }
}

export async function getBlockedWords(req: Request, res: Response): Promise<void> {
  try {
    const snapshot = await db.collection('moderation_blocked_words').get();
    const words = snapshot.docs.map((doc) => ({ id: doc.id, word: doc.data().word }));
    res.json(successResponse(words));
  } catch (error) {
    console.error('[ChatModeration] getBlockedWords error:', error);
    res.status(500).json(errorResponse('Failed to fetch blocked words', error));
  }
}

export async function addBlockedWord(req: Request, res: Response): Promise<void> {
  try {
    const { word } = req.body as { word?: string };
    if (!word || !word.trim()) {
      res.status(400).json(errorResponse('word is required'));
      return;
    }
    const wordId = word.trim().toLowerCase();
    await db.collection('moderation_blocked_words').doc(wordId).set({ word: wordId });

    await createAuditLog({
      adminId: req.admin!.uid,
      adminEmail: req.admin!.email,
      action: 'ADD_BLOCKED_WORD',
      targetId: wordId,
      targetType: 'report',
      details: { word: wordId },
      timestamp: new Date(),
      ip: getClientIp(req),
    });

    res.json(successResponse({ id: wordId, word: wordId }));
  } catch (error) {
    console.error('[ChatModeration] addBlockedWord error:', error);
    res.status(500).json(errorResponse('Failed to add blocked word', error));
  }
}

export async function removeBlockedWord(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    await db.collection('moderation_blocked_words').doc(id).delete();

    await createAuditLog({
      adminId: req.admin!.uid,
      adminEmail: req.admin!.email,
      action: 'REMOVE_BLOCKED_WORD',
      targetId: id,
      targetType: 'report',
      details: {},
      timestamp: new Date(),
      ip: getClientIp(req),
    });

    res.json(successResponse(null, 'Blocked word removed'));
  } catch (error) {
    console.error('[ChatModeration] removeBlockedWord error:', error);
    res.status(500).json(errorResponse('Failed to remove blocked word', error));
  }
}
