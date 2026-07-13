// Quick script to check user's Firestore document
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function checkUsers() {
  console.log('Fetching all users from Firestore...\n');
  const snapshot = await db.collection('users').get();
  
  if (snapshot.empty) {
    console.log('NO USERS FOUND IN FIRESTORE!');
    return;
  }

  console.log(`Found ${snapshot.size} user(s)\n`);

  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`=== User: ${doc.id} ===`);
    console.log(`  email: ${data.email || 'N/A'}`);
    console.log(`  displayName: ${data.displayName || 'N/A'}`);
    console.log(`  profileCompleted: ${data.profileCompleted}`);
    console.log(`  gender: ${data.gender || 'N/A'}`);
    console.log(`  dateOfBirth: ${data.dateOfBirth ? data.dateOfBirth.toDate() : 'N/A'}`);
    console.log(`  bio: ${data.bio || 'N/A'}`);
    console.log(`  sect: ${data.sect || 'N/A'}`);
    console.log(`  profession: ${data.profession || 'N/A'}`);
    console.log(`  dealBreakers: ${JSON.stringify(data.dealBreakers) || 'N/A'}`);
    console.log(`  phoneNumber: ${data.phoneNumber || 'N/A'}`);
    console.log('');
  });
  
  process.exit(0);
}

checkUsers().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
