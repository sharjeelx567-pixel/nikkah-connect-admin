// @ts-nocheck
import { initializeApp, cert, App, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

let db: Firestore;
let firebaseApp: App;

// Fix literal newline characters inside JSON string values (common when pasting into Vercel UI)
function fixJsonControlChars(raw: string): string {
  let result = '';
  let inString = false;
  let i = 0;
  while (i < raw.length) {
    const c = raw[i];
    if (c === '"' && (i === 0 || raw[i - 1] !== '\\')) {
      inString = !inString;
      result += c;
    } else if (inString && c === '\n') {
      result += '\\n';
    } else if (inString && c === '\r') {
      result += '\\r';
    } else if (inString && c === '\t') {
      result += '\\t';
    } else {
      result += c;
    }
    i++;
  }
  return result;
}

export function initializeFirebase(): void {
  try {
    if (getApps().length > 0) {
      firebaseApp = getApps()[0];
      db = getFirestore(firebaseApp);
      console.log('[Firebase] Reusing existing app.');
      return;
    }

    let serviceAccount: any;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        let raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
        // Check if string is base64 encoded
        if (raw.length > 20 && !raw.startsWith('{')) {
          try {
            const decoded = Buffer.from(raw, 'base64').toString('utf8');
            if (decoded.trim().startsWith('{')) {
              raw = decoded;
            }
          } catch (b64Err) {
            console.log('[Firebase] Base64 decode attempt ignored:', b64Err);
          }
        }
        const fixed = fixJsonControlChars(raw);
        serviceAccount = JSON.parse(fixed);
        console.log('[Firebase] Loaded from FIREBASE_SERVICE_ACCOUNT env var.');
      } catch (err) {
        console.error('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', err);
      }
    }

    if (!serviceAccount) {
      const keyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
      if (fs.existsSync(keyPath)) {
        try {
          serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
          console.log('[Firebase] Loaded from local serviceAccountKey.json.');
        } catch (fileErr) {
          console.error('[Firebase] Failed to parse local serviceAccountKey.json:', fileErr);
        }
      }
    }

    if (serviceAccount) {
      if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || 'nikkah-639d3'
      });
      console.log('[Firebase] Initialized successfully with credentials.');
    } else {
      console.warn('[Firebase] No credentials found! Set FIREBASE_SERVICE_ACCOUNT on Vercel.');
      firebaseApp = initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'nikkah-639d3' });
    }

    db = getFirestore(firebaseApp);
  } catch (error) {
    console.error('[Firebase] Init error (non-fatal):', error);
  }
}

export { db, admin, firebaseApp };