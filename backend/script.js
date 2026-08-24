const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

async function check() {
    const snapshot = await db.collection('admins').where('email', '==', 'admin@nikkahconnect.com').get();
    snapshot.forEach(doc => console.log(doc.id, doc.data()));
}
check();
