// @ts-nocheck
import { S3Client } from '@aws-sdk/client-s3';

// Cloudflare R2 is the storage provider for uploaded files in this backend
export const r2Buckets = {
  support: {
    bucket: process.env.R2_SUPPORT_BUCKET || '',
    domain: process.env.R2_SUPPORT_DOMAIN || '',
  },
  admin: {
    bucket: process.env.R2_ADMIN_BUCKET || '',
    domain: process.env.R2_ADMIN_DOMAIN || '',
  },
  verification: {
    bucket: process.env.R2_VERIFICATION_BUCKET || '',
    domain: '',
  },
} as const;

let _r2Client: S3Client | null = null;

export function getR2Client(): S3Client | null {
  if (_r2Client) return _r2Client;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.warn('[R2] Missing R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY).');
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

