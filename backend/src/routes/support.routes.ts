import { Router } from 'express';
import {
  getTickets,
  getTicketDetails,
  uploadSupportAttachment,
  updateTicketStatus,
  assignTicket,
  sendAdminReply,
  getUnreadTicketsCount,
  upload,
} from '../controllers/support.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// NOTE: the frontend (support/page.tsx, layout.tsx) addresses tickets as a
// `/tickets` sub-resource under `/support` (e.g. GET /support/tickets,
// GET /support/tickets/:id) — these paths must match exactly, and the
// unread-count route must stay registered before `/tickets/:id` so it
// isn't swallowed by the `:id` wildcard.
router.get('/tickets/unread-count', requirePermission('support.view'), getUnreadTicketsCount);
router.get('/tickets', requirePermission('support.view'), getTickets);
router.get('/tickets/:id', requirePermission('support.view'), getTicketDetails);
router.post('/tickets/:id/reply', requirePermission('support.respond'), sendAdminReply);
router.put('/tickets/:id/status', requirePermission('support.manage'), updateTicketStatus);
router.patch('/tickets/:id/assign', requirePermission('support.manage'), assignTicket);
// Frontend (support/page.tsx) appends the file under the field name "file",
// not "attachment" — multer's field name must match exactly or busboy
// throws "Unexpected field" before the handler ever runs.
router.post('/upload', requirePermission('support.respond'), upload.single('file'), uploadSupportAttachment);

export default router;
