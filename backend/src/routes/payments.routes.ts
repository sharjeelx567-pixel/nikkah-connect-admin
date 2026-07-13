import { Router } from 'express';
import { 
  getTransactions,
  refundTransaction,
  getSubscriptionMetrics
} from '../controllers/payments.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);
router.use(authorize(['super_admin', 'moderator']));

router.get('/transactions', getTransactions);
router.post('/transactions/:txId/refund', refundTransaction);
router.get('/metrics', getSubscriptionMetrics);

export default router;
