const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkUsers() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  
  if (snapshot.empty) {
    console.log('No matching documents.');
    return;
  }  

  console.log('--- ALL USERS IN FIRESTORE ---');
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id}`);
    console.log(`  Name: ${data.displayName}`);
    console.log(`  Gender: ${data.gender}`);
    console.log(`  Profile Completed: ${data.profileCompleted}`);
    console.log(`  Deal Breakers: ${JSON.stringify(data.dealBreakers)}`);
    console.log(`  Sect: ${data.sect}`);
    console.log(`  Smoking: ${data.smokingPreference}`);
    console.log(`  Drinking: ${data.alcoholConsumption}`);
    console.log(`  Prays: ${data.prays5Times}`);
    console.log(`  Family Type: ${data.familyType}`);
    console.log(`  Date of Birth: ${data.dateOfBirth ? data.dateOfBirth.toDate() : 'null'}`);
    console.log('-----------------------------');
  });
}

checkUsers().catch(console.error).finally(() => process.exit(0));
