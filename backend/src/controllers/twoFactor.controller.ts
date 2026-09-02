import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';
import { db } from '../config/firebase';
import { successResponse, errorResponse, serverTimestamp } from '../utils/helpers';
import { APP_NAME } from '../config/branding';

const BACKUP_CODE_COUNT = 10;

// Accept one 30-second step of clock drift either side, matching what
// Google Authenticator and Authy users expect.
const EPOCH_TOLERANCE_SECONDS = 30;

/** Google-Authenticator-compatible TOTP check (otplib v13 functional API). */
function checkTotp(token: string, secret: string): boolean {
  if (!token || !secret) return false;
  try {
    return verifySync({
      strategy: 'totp',
      secret,
      token,
      epochTolerance: EPOCH_TOLERANCE_SECONDS,
    }).valid;
  } catch {
    return false;
  }
}

function generateBackupCodes(): string[] {
  return Array.from({ length: BACKUP_CODE_COUNT }, () =>
    crypto.randomBytes(5).toString('hex').toUpperCase().match(/.{1,5}/g)!.join('-')
  );
}

/**
 * Step 1 of enrolment. Generates a secret and returns it with a QR code for the
 * authenticator app. The secret is stored as `pendingTwoFactorSecret` and is NOT
 * active until `enableTwoFactor` confirms the admin can produce a valid code —
 * so a failed enrolment can never lock anyone out.
 */
export async function setupTwoFactor(req: Request, res: Response): Promise<void> {
  try {
    const uid = req.admin!.uid;
    const adminDoc = await db.collection('admins').doc(uid).get();
    if (!adminDoc.exists) {
      res.status(404).json(errorResponse('Admin not found'));
      return;
    }
    const data = adminDoc.data()!;

    if (data.twoFactorEnabled === true) {
      res.status(400).json(errorResponse('Two-factor authentication is already enabled'));
      return;
    }

    const secret = generateSecret();
    const otpauth = generateURI({ strategy: 'totp', issuer: `${APP_NAME} Admin`, label: data.email || uid, secret });
    const qrDataUrl = await QRCode.toDataURL(otpauth);

    await adminDoc.ref.update({
      pendingTwoFactorSecret: secret,
      pendingTwoFactorCreatedAt: serverTimestamp(),
    });

    res.json(successResponse({ secret, otpauth, qrDataUrl },
      'Scan the QR code, then confirm with a code to enable two-factor authentication'));
  } catch (error) {
    console.error('[2FA] setup error:', error);
    res.status(500).json(errorResponse('Failed to start two-factor setup', error));
  }
}

/**
 * Step 2 of enrolment. Verifies a live code against the pending secret, then
 * promotes it to active and issues one-time backup codes (returned once, stored
 * only as bcrypt hashes).
 */
export async function enableTwoFactor(req: Request, res: Response): Promise<void> {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      res.status(400).json(errorResponse('Verification code is required'));
      return;
    }

    const uid = req.admin!.uid;
    const adminDoc = await db.collection('admins').doc(uid).get();
    const data = adminDoc.data();
    if (!data?.pendingTwoFactorSecret) {
      res.status(400).json(errorResponse('No pending two-factor setup. Start with /2fa/setup.'));
      return;
    }

    if (!checkTotp(code.replace(/\s/g, ''), data.pendingTwoFactorSecret)) {
      res.status(401).json(errorResponse('Invalid verification code'));
      return;
    }

    const backupCodes = generateBackupCodes();
    const hashed = await Promise.all(backupCodes.map((c) => bcrypt.hash(c, 10)));

    await adminDoc.ref.update({
      twoFactorSecret: data.pendingTwoFactorSecret,
      twoFactorEnabled: true,
      twoFactorEnabledAt: serverTimestamp(),
      twoFactorBackupCodes: hashed,
      pendingTwoFactorSecret: null,
      pendingTwoFactorCreatedAt: null,
    });

    console.log(`[2FA] Enabled for admin ${data.email}`);
    res.json(successResponse({ backupCodes },
      'Two-factor authentication enabled. Store these backup codes now — they are shown only once.'));
  } catch (error) {
    console.error('[2FA] enable error:', error);
    res.status(500).json(errorResponse('Failed to enable two-factor authentication', error));
  }
}

/**
 * Disabling requires a current code, so a hijacked session cannot silently
 * strip the second factor.
 */
export async function disableTwoFactor(req: Request, res: Response): Promise<void> {
  try {
    const { code } = req.body;
    const uid = req.admin!.uid;
    const adminDoc = await db.collection('admins').doc(uid).get();
    const data = adminDoc.data();

    if (!data?.twoFactorEnabled) {
      res.status(400).json(errorResponse('Two-factor authentication is not enabled'));
      return;
    }
    if (!code || !checkTotp(String(code).replace(/\s/g, ''), data.twoFactorSecret)) {
      res.status(401).json(errorResponse('A valid current code is required to disable two-factor authentication'));
      return;
    }

    await adminDoc.ref.update({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
      twoFactorDisabledAt: serverTimestamp(),
    });

    console.log(`[2FA] Disabled for admin ${data.email}`);
    res.json(successResponse(null, 'Two-factor authentication disabled'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to disable two-factor authentication', error));
  }
}

export async function getTwoFactorStatus(req: Request, res: Response): Promise<void> {
  try {
    const adminDoc = await db.collection('admins').doc(req.admin!.uid).get();
    const data = adminDoc.data() || {};
    res.json(successResponse({
      enabled: data.twoFactorEnabled === true,
      backupCodesRemaining: Array.isArray(data.twoFactorBackupCodes) ? data.twoFactorBackupCodes.length : 0,
    }));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to read two-factor status', error));
  }
}

/**
 * Verifies a submitted TOTP code, falling back to single-use backup codes.
 * Consumed backup codes are removed. Returns true when the factor is satisfied.
 *
 * Exported for use by the login flow.
 */
export async function verifySecondFactor(
  adminId: string,
  adminData: FirebaseFirestore.DocumentData,
  submitted: string
): Promise<boolean> {
  const cleaned = String(submitted || '').replace(/\s/g, '');
  if (!cleaned) return false;

  if (adminData.twoFactorSecret && checkTotp(cleaned, adminData.twoFactorSecret)) {
    return true;
  }

  const hashes: string[] = Array.isArray(adminData.twoFactorBackupCodes)
    ? adminData.twoFactorBackupCodes
    : [];
  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(cleaned.toUpperCase(), hashes[i])) {
      const remaining = hashes.filter((_, idx) => idx !== i);
      await db.collection('admins').doc(adminId).update({ twoFactorBackupCodes: remaining });
      console.log(`[2FA] Backup code consumed for admin ${adminData.email}; ${remaining.length} left`);
      return true;
    }
  }
  return false;
}
