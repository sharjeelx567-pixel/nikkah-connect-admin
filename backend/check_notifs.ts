import { db } from './src/config/firebase';

async function checkNotifs() {
  const snapshot = await db.collection('admin_notifications').get();
  console.log(`Found ${snapshot.size} notifications.`);
  snapshot.forEach(doc => console.log(doc.id, doc.data()));
  process.exit(0);
}

checkNotifs();
