const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function check() {
  const doc = await db.collection('users').doc('JJLD6KoQCxYhrfcI7djznpGHPQj2').get();
  const data = doc.data();
  console.log(`User: ${data.displayName}`);
  console.log(`  profileImage: '${data.profileImage}'`);
  console.log(`  galleryImages:`, data.galleryImages);
}
check();
