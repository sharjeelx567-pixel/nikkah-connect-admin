import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { db } from '../config/firebase';
import { successResponse, errorResponse, serverTimestamp } from '../utils/helpers';
import { APP_NAME } from '../config/branding';

const BACKUP_CODE_COUNT = 10;
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/=+$/, '');
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_CHARS.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function base32Encode(buffer: Buffer): string {
  let bits = '';
  for (let i = 0; i < buffer.length; i++) {
    bits += buffer[i].toString(2).padStart(8, '0');
  }
  let base32 = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5);
    base32 += BASE32_CHARS[parseInt(chunk.padEnd(5, '0'), 2)];
  }
  return base32;
}

export function generateSecret(length = 20): string {
  return base32Encode(crypto.randomBytes(length));
}

export function generateURI({ issuer, label, secret }: { issuer: string; label: string; secret: string }): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

function getHotpToken(secretBuffer: Buffer, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter), 0);
  const hmac = crypto.createHmac('sha1', secretBuffer);
  hmac.update(counterBuffer);
  const digest = hmac.digest();
  const offset = digest[digest.length - 1] & 0xf;
  const code = ((digest[offset] & 0x7f) << 24) |
               ((digest[offset + 1] & 0xff) << 16) |
               ((digest[offset + 2] & 0xff) << 8) |
               (digest[offset + 3] & 0xff);
  return (code % 1000000).toString().padStart(6, '0');
}

/** Google-Authenticator-compatible TOTP check using standard RFC 6238 HMAC-SHA1 */
function checkTotp(token: string, secret: string, window = 1): boolean {
  if (!token || !secret) return false;
  try {
    const key = base32Decode(secret);
    const currentStep = Math.floor(Date.now() / 1000 / 30);
    for (let i = -window; i <= window; i++) {
      const expected = getHotpToken(key, currentStep + i);
      if (expected === token) return true;
    }
    return false;
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
    const otpauth = generateURI({ issuer: `${APP_NAME} Admin`, label: data.email || uid, secret });
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
