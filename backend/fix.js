const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

async function fix() {
    await db.collection('admins').doc('mUZ0BgiFGwOimjk440ADsUm1xRg2').delete();
    console.log('Deleted duplicate admin doc');
}
fix();
