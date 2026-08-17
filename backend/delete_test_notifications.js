const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function deleteTestNotifications() {
  console.log('Searching for test notifications...');
  
  // Get all users
  const usersSnap = await db.collection('users').get();
  let deletedCount = 0;

  for (const userDoc of usersSnap.docs) {
    const notificationsRef = userDoc.ref.collection('notifications');
    const notifSnap = await notificationsRef.get();
    
    for (const notifDoc of notifSnap.docs) {
      const data = notifDoc.data();
      const title = (data.title || '').toLowerCase();
      const body = (data.body || '').toLowerCase();
      
      if (title.includes('test') || body.includes('test')) {
        await notifDoc.ref.delete();
        console.log(`Deleted test notification for user ${userDoc.id}`);
        deletedCount++;
      }
    }
  }
  
  console.log(`Finished! Deleted ${deletedCount} test notifications.`);
}

deleteTestNotifications().then(() => process.exit(0)).catch(console.error);
