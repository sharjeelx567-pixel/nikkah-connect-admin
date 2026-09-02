// @ts-nocheck
import { S3Client } from '@aws-sdk/client-s3';

const DEFAULT_R2_ACCOUNT_ID = '19799f8d4440d7bfde10a40545bc775b';
const DEFAULT_R2_ACCESS_KEY_ID = '6c11aa6239116b030e558b82a27a1921';
const DEFAULT_R2_SECRET_ACCESS_KEY = '22b21b3bd21d7e39dc33ad3a5628d84b786db07ac5b2a0e5bb120ccc3394cac9';

// Cloudflare R2 is the storage provider for uploaded files in this backend
export const r2Buckets = {
  support: {
    bucket: process.env.R2_SUPPORT_BUCKET || 'nikkah-support-media',
    domain: process.env.R2_SUPPORT_DOMAIN || 'https://pub-a029a56aa21e415c90dd77feff57ae66.r2.dev',
  },
  admin: {
    bucket: process.env.R2_ADMIN_BUCKET || 'nikkah-admin-media',
    domain: process.env.R2_ADMIN_DOMAIN || 'https://pub-d2bc804549864377ba48d6d120d2ed5f.r2.dev',
  },
  verification: {
    bucket: process.env.R2_VERIFICATION_BUCKET || 'nikkah-verification-media',
    domain: '',
  },
} as const;

let _r2Client: S3Client | null = null;

export function getR2Client(): S3Client | null {
  if (_r2Client) return _r2Client;
  const accountId = process.env.R2_ACCOUNT_ID || DEFAULT_R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || DEFAULT_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || DEFAULT_R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.warn('[R2] Missing R2 credentials.');
    return null;
  }

  try {
    _r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId.trim()}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
      },
    });
    return _r2Client;
  } catch (err) {
    console.error('[R2] Failed to initialize S3Client:', err);
    return null;
  }
}

export const r2Client = new Proxy({} as S3Client, {
  get(target, prop) {
    const client = getR2Client();
    if (!client) {
      throw new Error('R2 client not configured. Please set R2 environment variables in Vercel.');
    }
    const val = (client as any)[prop];
    if (typeof val === 'function') {
      return val.bind(client);
    }
    return val;
  }
});


