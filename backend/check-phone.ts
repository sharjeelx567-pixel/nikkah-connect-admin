import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';

const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const auth = getAuth();

async function checkPhoneNumbers() {
  const snapshot = await db.collection('users').get();
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    console.log(`User ${doc.id}: email=${data.email}, phone=${data.phoneNumber}`);
    
    // Check what Firebase Auth has
    try {
      const authUser = await auth.getUser(doc.id);
      console.log(`  Auth ${doc.id}: email=${authUser.email}, phone=${authUser.phoneNumber}`);
    } catch (e) {
      console.log(`  Auth ${doc.id}: not found`);
    }
  }
}

checkPhoneNumbers().catch(console.error);
