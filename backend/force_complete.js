const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

try {
  admin.initializeApp({
    projectId: 'nikkah-48a59'
  });
} catch(e) {}

async function forceCompleteProfiles() {
  const db = getFirestore();
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  
  const batch = db.batch();
  let count = 0;
  
  snapshot.forEach(doc => {
    batch.update(doc.ref, {
      profileCompleted: true,
      onboardingStep: 6
    });
    count++;
  });
  
  await batch.commit();
  console.log(`Successfully forced profileCompleted=true for ${count} users!`);
  process.exit(0);
}

forceCompleteProfiles().catch(console.error);
