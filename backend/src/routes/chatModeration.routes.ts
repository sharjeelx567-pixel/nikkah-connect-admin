import { Router } from 'express';
import {
  getFlaggedChats,
  resolveFlaggedChat,
  getBlockedWords,
  addBlockedWord,
  removeBlockedWord,
} from '../controllers/chatModeration.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/flagged', requirePermission('chat_moderation.view'), getFlaggedChats);
router.delete('/flagged/:id', requirePermission('chat_moderation.manage'), resolveFlaggedChat);

router.get('/blocked-words', requirePermission('chat_moderation.view'), getBlockedWords);
router.post('/blocked-words', requirePermission('chat_moderation.manage'), addBlockedWord);
router.delete('/blocked-words/:id', requirePermission('chat_moderation.manage'), removeBlockedWord);

export default router;
