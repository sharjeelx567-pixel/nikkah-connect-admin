// @ts-nocheck
import { initializeApp, cert, App, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

let db: Firestore;
let storage: Storage;
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
      storage = getStorage(firebaseApp);
      console.log('[Firebase] Reusing existing app.');
      return;
    }

    let serviceAccount: any;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const fixed = fixJsonControlChars(process.env.FIREBASE_SERVICE_ACCOUNT);
        serviceAccount = JSON.parse(fixed);
        console.log('[Firebase] Loaded from FIREBASE_SERVICE_ACCOUNT env var.');
      } catch (err) {
        console.error('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', err);
      }
    }

    if (!serviceAccount) {
      const keyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
      if (fs.existsSync(keyPath)) {
        serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        console.log('[Firebase] Loaded from local serviceAccountKey.json.');
      }
    }

    if (serviceAccount) {
      firebaseApp = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
      console.log('[Firebase] Initialized successfully.');
    } else {
      console.error('[Firebase] No credentials found! Set FIREBASE_SERVICE_ACCOUNT on Vercel.');
      firebaseApp = initializeApp({ projectId: 'nikkah-639d3' });
    }

    db = getFirestore(firebaseApp);
    storage = getStorage(firebaseApp);
  } catch (error) {
    console.error('[Firebase] Init error:', error);
  }
}

export { db, storage, admin, firebaseApp };