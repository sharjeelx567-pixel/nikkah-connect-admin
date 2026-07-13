import { Router } from 'express';
import { getUsers, getUserById, banUser, unbanUser, suspendUser, deleteUser, grantPremium, revokePremium } from '../controllers/users.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Protect all routes
router.use(authenticate);

// Everyone can view users
router.get('/', getUsers);
router.get('/:uid', getUserById);

// Moderator and Super Admin can ban/suspend
router.post('/:uid/ban', authorize(['super_admin', 'moderator']), banUser);
router.post('/:uid/unban', authorize(['super_admin', 'moderator']), unbanUser);
router.post('/:uid/suspend', authorize(['super_admin', 'moderator']), suspendUser);

// Only Super Admin can delete users
router.delete('/:uid', authorize(['super_admin']), deleteUser);

// Super Admin and Support can manage premium status
router.post('/:uid/premium', authorize(['super_admin', 'support']), grantPremium);
router.delete('/:uid/premium', authorize(['super_admin', 'support']), revokePremium);

export default router;
