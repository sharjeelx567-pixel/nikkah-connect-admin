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

export function initializeFirebase(): void {
  try {
    // Prevent double initialization
    if (getApps().length > 0) {
      firebaseApp = getApps()[0];
      db = getFirestore(firebaseApp);
      storage = getStorage(firebaseApp);
      console.log('[Firebase] Already initialized, reusing existing app.');
      return;
    }

    let serviceAccount;

    // 1. Try to load from Environment Variable (Vercel Production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        // Fix: Vercel sometimes escapes \n in private_key — restore them
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT.replace(/\\n/g, '\n');
        serviceAccount = JSON.parse(raw);
        // Ensure private_key newlines are correct
        if (serviceAccount.private_key) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        console.log('[Firebase] Loaded Service Account from FIREBASE_SERVICE_ACCOUNT env var.');
      } catch (err) {
        console.error('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', err);
      }
    }

    // 2. Try to load from File (Local Development)
    if (!serviceAccount) {
      const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 'serviceAccountKey.json';
      const resolvedPath = path.isAbsolute(keyPath)
        ? keyPath
        : path.resolve(process.cwd(), keyPath);

      if (fs.existsSync(resolvedPath)) {
        serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
        console.log('[Firebase] Loaded Service Account from local file.');
      }
    }

    if (serviceAccount) {
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
      console.log('[Firebase] Initialized with Service Account successfully.');
    } else {
      console.error('[Firebase] No service account found! Set FIREBASE_SERVICE_ACCOUNT env var on Vercel.');
      // Initialize with no credentials so the app at least starts
      firebaseApp = initializeApp({ projectId: 'nikkah-639d3' });
    }

    db = getFirestore(firebaseApp);
    storage = getStorage(firebaseApp);
  } catch (error) {
    console.error('[Firebase] Init error:', error);
    // DO NOT throw — prevent Vercel serverless crash on module load
  }
}

export { db, storage, admin, firebaseApp };
