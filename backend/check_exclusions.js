const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

try {
  admin.initializeApp({
    projectId: 'nikkah-48a59'
  });
} catch(e) {}

async function checkInterests() {
  const db = getFirestore();
  
  const interests = await db.collection('user_interests').get();
  console.log('Interests:');
  interests.forEach(doc => console.log(doc.id, doc.data()));

  const requests = await db.collection('connection_requests').get();
  console.log('\nConnection Requests:');
  requests.forEach(doc => console.log(doc.id, doc.data()));
  
  const passes = await db.collection('user_passes').get();
  console.log('\nPasses:');
  passes.forEach(doc => console.log(doc.id, doc.data()));

  const users = await db.collection('users').get();
  console.log('\nUsers:');
  users.forEach(doc => console.log(doc.id, doc.data().displayName, doc.data().gender, doc.data().profileCompleted));

  process.exit(0);
}

checkInterests().catch(console.error);
