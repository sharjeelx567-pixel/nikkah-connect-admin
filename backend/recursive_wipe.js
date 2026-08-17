const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

const serviceAccount = require('./serviceAccountKey.json');
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const auth = getAuth();

async function deleteAllAuthUsers() {
  let nextPageToken = undefined;
  do {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    const uids = listUsersResult.users.map((userRecord) => userRecord.uid);
    if (uids.length > 0) {
      await auth.deleteUsers(uids);
      console.log(`Deleted ${uids.length} users from Firebase Auth.`);
    }
    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);
}

async function recursiveWipe() {
  try {
    console.log('Fetching all root collections...');
    const collections = await db.listCollections();
    
    console.log(`Found ${collections.length} root collections.`);
    
    for (const collection of collections) {
      console.log(`Recursively deleting collection: ${collection.id}...`);
      await db.recursiveDelete(collection);
    }

    console.log('Deleting all Authentication users...');
    await deleteAllAuthUsers();

    console.log('ENTIRE DATABASE WIPED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('Error during wipe:', err);
    process.exit(1);
  }
}

recursiveWipe();
