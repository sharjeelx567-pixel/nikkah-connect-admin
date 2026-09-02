const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function check() {
  const users = await db.collection('users').orderBy('updatedAt', 'desc').limit(5).get();
  users.forEach(doc => {
    const data = doc.data();
    console.log(`User: ${data.displayName} (UID: ${doc.id})`);
    console.log(`  profileImage: '${data.profileImage}'`);
    console.log(`  pendingProfileImage: '${data.pendingProfileImage}'`);
    console.log(`  galleryImages:`, data.galleryImages);
    console.log(`  pendingGalleryImages:`, data.pendingGalleryImages);
    console.log(`  updatedAt:`, data.updatedAt ? data.updatedAt.toDate() : 'null');
  });
}
check();
