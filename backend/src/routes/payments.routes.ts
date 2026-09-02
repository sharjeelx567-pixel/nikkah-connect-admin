import { Router } from 'express';
import { getTransactions, getSubscriptionMetrics, refundTransaction } from '../controllers/payments.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/transactions', requirePermission('subscriptions.view'), getTransactions);
router.get('/subscriptions', requirePermission('subscriptions.view'), getSubscriptionMetrics);
// refundTransaction reads req.params.id — the route previously had no :id
// segment at all, so req.params.id was always undefined and every refund
// attempt would have 404'd on "Transaction not found".
router.post('/:id/refund', requirePermission('subscriptions.manage'), refundTransaction);

export default router;
