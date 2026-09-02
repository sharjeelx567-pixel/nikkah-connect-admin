const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
initializeApp({ credential: cert(require('./serviceAccountKey.json')) });
const db = getFirestore();
(async () => {
  const reqs = await db.collection('verification_requests')
    .where('userId', '==', 'OPaECyTZ0sNImZBYBAqEED48oly2').get();
  reqs.forEach((d) => console.log(JSON.stringify(d.data(), null, 1)));
})();
