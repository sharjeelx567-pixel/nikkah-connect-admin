const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function check() {
  const users = await db.collection('users').limit(5).get();
  users.forEach(doc => {
    const data = doc.data();
    console.log(`User: ${data.displayName}`);
    console.log(`  profileImage: '${data.profileImage}'`);
    console.log(`  pendingProfileImage: '${data.pendingProfileImage}'`);
    console.log(`  galleryImages:`, data.galleryImages);
  });
}
check();
