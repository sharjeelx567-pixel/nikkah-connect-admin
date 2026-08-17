import { Request, Response } from 'express';
import { admin as firebaseAdmin, db } from '../config/firebase';
import { successResponse, errorResponse, serverTimestamp } from '../utils/helpers';
import { Admin, AdminRole } from '../types';
import { logAction } from './audit.controller';

export async function createAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, displayName, role } = req.body;
    
    if (!email || !password || !displayName || !role) {
      res.status(400).json(errorResponse('Missing required fields'));
      return;
    }

    // Create Firebase Auth User
    const userRecord = await firebaseAdmin.auth().createUser({
      email,
      password,
      displayName,
    });

    // Create Firestore Document
    const newAdmin: Admin = {
      uid: userRecord.uid,
      email: userRecord.email!,
      displayName: userRecord.displayName!,
      role: role as AdminRole,
      isActive: true,
      createdAt: serverTimestamp() as any,
    };

    await db.collection('admins').doc(userRecord.uid).set(newAdmin);

    // Audit Log
    await logAction(req.admin!.uid, req.admin!.email, 'create_admin', userRecord.uid, 'user', { role }, req.ip || '');

    res.status(201).json(successResponse(newAdmin, 'Admin created successfully'));
  } catch (error) {
    console.error('[Admins] Create error:', error);
    res.status(500).json(errorResponse('Failed to create admin', error));
  }
}

export async function listAdmins(req: Request, res: Response): Promise<void> {
  try {
    const snapshot = await db.collection('admins').orderBy('createdAt', 'desc').get();
    const admins = snapshot.docs.map(doc => doc.data() as Admin);
    res.json(successResponse(admins));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to fetch admins', error));
  }
}

export async function updateAdminRole(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      res.status(400).json(errorResponse('Role is required'));
      return;
    }

    if (id === req.admin!.uid) {
      res.status(403).json(errorResponse('You cannot change your own role'));
      return;
    }

    await db.collection('admins').doc(id).update({ role });
    
    // Audit Log
    await logAction(req.admin!.uid, req.admin!.email, 'update_admin_role', id, 'user', { role }, req.ip || '');

    res.json(successResponse(null, 'Admin role updated'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to update admin', error));
  }
}

export async function toggleAdminStatus(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (id === req.admin!.uid) {
      res.status(403).json(errorResponse('You cannot deactivate your own account'));
      return;
    }

    await db.collection('admins').doc(id).update({ isActive });

    if (!isActive) {
      // Revoke refresh tokens so they are logged out immediately
      await firebaseAdmin.auth().revokeRefreshTokens(id);
    }
    
    await logAction(req.admin!.uid, req.admin!.email, isActive ? 'activate_admin' : 'deactivate_admin', id, 'user', {}, req.ip || '');

    res.json(successResponse(null, `Admin ${isActive ? 'activated' : 'deactivated'}`));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to toggle admin status', error));
  }
}

export async function deleteAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    if (id === req.admin!.uid) {
      res.status(403).json(errorResponse('You cannot delete your own account'));
      return;
    }

    // Delete from Firebase Auth
    await firebaseAdmin.auth().deleteUser(id);
    
    // Delete from Firestore
    await db.collection('admins').doc(id).delete();
    
    await logAction(req.admin!.uid, req.admin!.email, 'delete_admin', id, 'user', {}, req.ip || '');

    res.json(successResponse(null, 'Admin deleted successfully'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to delete admin', error));
  }
}
