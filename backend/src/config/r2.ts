// @ts-nocheck
import { S3Client } from '@aws-sdk/client-s3';

// Cloudflare R2 is the sole storage provider for uploaded files in this
// backend (mirrors the R2 setup used by the Flutter app / Cloud Functions).
// Buckets are split by purpose — this backend only ever touches the
// `support` (ticket attachments) and `admin` (future admin-uploaded media,
// not wired to any endpoint yet) categories.
// Required env vars (set as Vercel environment variables):
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
//   R2_SUPPORT_BUCKET, R2_SUPPORT_DOMAIN, R2_ADMIN_BUCKET, R2_ADMIN_DOMAIN
export const r2Buckets = {
  support: {
    bucket: process.env.R2_SUPPORT_BUCKET || '',
    domain: process.env.R2_SUPPORT_DOMAIN || '',
  },
  admin: {
    bucket: process.env.R2_ADMIN_BUCKET || '',
    domain: process.env.R2_ADMIN_DOMAIN || '',
  },
  // No domain: verification documents (CNIC, etc.) are never served via a
  // public URL by design — every view goes through a signed GET minted here.
  verification: {
    bucket: process.env.R2_VERIFICATION_BUCKET || '',
    domain: '',
  },
} as const;

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: (process.env.R2_ACCESS_KEY_ID || '').trim(),
    secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY || '').trim(),
  },
});
