import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import { db, admin } from '../config/firebase';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { successResponse, errorResponse, serverTimestamp } from '../utils/helpers';
import { Admin } from '../types';

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json(errorResponse('Email and password are required'));
      return;
    }

    // Find admin by email
    const snapshot = await db.collection('admins').where('email', '==', email.toLowerCase()).limit(1).get();
    if (snapshot.empty) {
      res.status(401).json(errorResponse('Invalid email or password'));
      return;
    }

    const adminDoc = snapshot.docs[0];
    const adminData = adminDoc.data() as Admin;

    if (!adminData.isActive) {
      res.status(403).json(errorResponse('Your account has been deactivated'));
      return;
    }

    if (!adminData.passwordHash) {
      res.status(401).json(errorResponse('Invalid email or password'));
      return;
    }
    const passwordMatch = await bcrypt.compare(password, adminData.passwordHash);
    if (!passwordMatch) {
      res.status(401).json(errorResponse('Invalid email or password'));
      return;
    }

    // Update last login
    await adminDoc.ref.update({ lastLoginAt: serverTimestamp() });

    const payload = { uid: adminDoc.id, email: adminData.email, role: adminData.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    console.log(`[Auth] Admin login: ${email} (${adminData.role})`);

    res.json(successResponse({
      accessToken,
      refreshToken,
      admin: {
        uid: adminDoc.id,
        email: adminData.email,
        displayName: adminData.displayName,
        role: adminData.role,
      },
    }, 'Login successful'));
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json(errorResponse('An error occurred during login', error));
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json(errorResponse('Refresh token required'));
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);
    const newAccessToken = signAccessToken({ uid: decoded.uid, email: decoded.email, role: decoded.role });

    res.json(successResponse({ accessToken: newAccessToken }, 'Token refreshed'));
  } catch {
    res.status(401).json(errorResponse('Invalid or expired refresh token'));
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const adminDoc = await db.collection('admins').doc(req.admin!.uid).get();
    if (!adminDoc.exists) {
      res.status(404).json(errorResponse('Admin not found'));
      return;
    }
    const data = adminDoc.data() as Admin;
    res.json(successResponse({
      uid: adminDoc.id,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
    }));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to fetch admin profile', error));
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.json(successResponse(null, 'Logged out successfully'));
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      res.status(400).json(errorResponse('Email, password, and role are required'));
      return;
    }

    const { getAuth } = require('firebase-admin/auth');
    const { firebaseApp, db } = require('../config/firebase');
    const auth = getAuth(firebaseApp);

    console.log('firebaseApp:', !!firebaseApp, 'db:', !!db); let userRecord;
    try {
      console.log('before getUserByEmail'); userRecord = await auth.getUserByEmail(email); console.log('after getUserByEmail');
      // User exists, update password
      await auth.updateUser(userRecord.uid, { password });
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        // User does not exist, create
        userRecord = await auth.createUser({
          email,
          password,
          displayName: `Admin (${role})`,
          emailVerified: true
        });
      } else {
        throw e;
      }
    }

    // Upsert the admin document in Firestore
    const adminRef = db.collection('admins').doc(userRecord.uid);
    await adminRef.set({
      uid: userRecord.uid,
      email: email.toLowerCase(),
      displayName: userRecord.displayName || `Admin (${role})`,
      role: role,
      isActive: true,
      lastLoginAt: serverTimestamp()
    }, { merge: true });

    await auth.setCustomUserClaims(userRecord.uid, { admin: true, role: role });

    res.json(successResponse(null, 'Admin setup successful'));
  } catch (error) {
    console.error('[Auth] Register/Update error:', error);
    res.status(500).json(errorResponse('Failed to setup admin', error));
  }
}

