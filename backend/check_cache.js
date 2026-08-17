const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkCache() {
  const femaleUid = "p0S8vjFrE1XhYynrSyNxjBV0KKt2";
  const cacheRef = db.collection('discover_feed_cache').doc(femaleUid).collection('profiles');
  const snapshot = await cacheRef.get();
  
  if (snapshot.empty) {
    console.log('CACHE IS EMPTY for the Female account.');
    return;
  }

  console.log(`--- PROFILES IN CACHE FOR FEMALE ACCOUNT (${snapshot.docs.length}) ---`);
  snapshot.forEach(doc => {
    console.log(`Profile ID: ${doc.id}, Name: ${doc.data().displayName}, Gender: ${doc.data().gender}`);
  });
}

checkCache().catch(console.error).finally(() => process.exit(0));
