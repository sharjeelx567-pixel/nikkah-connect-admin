const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function check() {
  const snapshot = await db.collection('admin_notifications').get();
  console.log(`Docs found: ${snapshot.size}`);
  snapshot.forEach(doc => console.log(doc.id, doc.data()));
  process.exit(0);
}

check().catch(console.error);
