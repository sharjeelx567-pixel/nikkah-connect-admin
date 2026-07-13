import { initializeApp, cert, App } from 'firebase-admin/app';
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
    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 'serviceAccountKey.json';
    const resolvedPath = path.isAbsolute(keyPath) 
      ? keyPath 
      : path.resolve(__dirname, '../../', keyPath);

    console.log(`[Firebase] Looking for service account key at: ${resolvedPath}`);

    let serviceAccount;

    // 1. Try to load from Environment Variable (Vercel Production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log('[Firebase] Loaded Service Account from FIREBASE_SERVICE_ACCOUNT environment variable.');
      } catch (err) {
        console.error('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON string.', err);
      }
    } 
    // 2. Try to load from File (Local Development)
    else if (fs.existsSync(resolvedPath)) {
      serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
      console.log('[Firebase] Loaded Service Account from local file.');
    }

    if (serviceAccount) {
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
      console.log('[Firebase] Initialized with Service Account successfully.');
    } else {
      console.warn('[Firebase] Service account not found in env or file. Attempting to fall back to application default credentials.');
      firebaseApp = initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'nikkah-48a59',
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
      console.log('[Firebase] Initialized with default project credentials.');
    }

    db = getFirestore(firebaseApp);
    storage = getStorage(firebaseApp);
  } catch (error) {
    console.error('[Firebase] Init error: Failed to connect to Firebase. Admin features will be unavailable.', error);
    throw error;
  }
}

export { db, storage, admin, firebaseApp };
