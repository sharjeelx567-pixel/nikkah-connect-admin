import { Router } from 'express';
import { 
  getTickets, 
  getTicketDetails, 
  updateTicketStatus, 
  assignTicket,
  sendAdminReply,
  getUnreadTicketsCount
} from '../controllers/support.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Secure all support routes
router.use(authenticate);
router.use(authorize(['super_admin', 'moderator']));

// Support Ticket Management
router.get('/tickets', getTickets);
router.get('/tickets/unread-count', getUnreadTicketsCount);
router.get('/tickets/:id', getTicketDetails);
router.put('/tickets/:id/status', updateTicketStatus);
router.post('/tickets/:id/assign', assignTicket);
router.post('/tickets/:id/reply', sendAdminReply);

export default router;
