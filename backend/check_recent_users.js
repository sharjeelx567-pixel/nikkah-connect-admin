const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function check() {
  const users = await db.collection('users').orderBy('photoApprovedAt', 'desc').limit(2).get();
  users.forEach(doc => {
    const data = doc.data();
    console.log(`User: ${data.displayName} (UID: ${doc.id})`);
    console.log(`  profileImage: '${data.profileImage}'`);
    console.log(`  photoStatus: '${data.photoStatus}'`);
  });
}
check();
