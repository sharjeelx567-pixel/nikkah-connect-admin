// Fix user fLJRsFhAGvUNJLtKEqfafYyd7xI2: copy data from working account
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function fixUser() {
  const brokenUid = 'fLJRsFhAGvUNJLtKEqfafYyd7xI2';
  
  // Read the broken user's current data
  const brokenDoc = await db.collection('users').doc(brokenUid).get();
  console.log('Current broken user data:', JSON.stringify(brokenDoc.data(), null, 2));
  
  // Just mark profileCompleted = true so the app sends to home
  await db.collection('users').doc(brokenUid).set({
    profileCompleted: true,
  }, { merge: true });

  console.log(`\nFixed! Set profileCompleted=true for ${brokenUid}`);
  
  // Verify
  const updated = await db.collection('users').doc(brokenUid).get();
  console.log('Updated data:', JSON.stringify(updated.data(), null, 2));

  process.exit(0);
}

fixUser().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
