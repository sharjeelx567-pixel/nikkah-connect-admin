require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const db = getFirestore();

async function createInitialAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@nikkahconnect.com';
  const password = process.env.ADMIN_PASSWORD || 'Password123!';
  const displayName = process.env.ADMIN_NAME || 'Super Admin';
  const role = 'super_admin';

  console.log(`Setting up initial super admin: ${email}`);

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
    console.log('User already exists in Firebase Auth. Updating password...');
    await auth.updateUser(userRecord.uid, { password });
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.log('Creating new user in Firebase Auth...');
      userRecord = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: true
      });
    } else {
      console.error('Error fetching user:', error);
      process.exit(1);
    }
  }

  console.log(`Firebase Auth UID: ${userRecord.uid}`);

  console.log('Setting up Firestore admin document...');
  const adminRef = db.collection('admins').doc(userRecord.uid);
  
  await adminRef.set({
    uid: userRecord.uid,
    email: email,
    displayName: displayName,
    role: role,
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
    lastLoginAt: null
  }, { merge: true });

  await auth.setCustomUserClaims(userRecord.uid, { admin: true, role: role });

  console.log('=============================================');
  console.log('✅ Initial Super Admin created successfully!');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log('=============================================');
  console.log('You can now log into the Next.js Admin Panel using these credentials.');
  process.exit(0);
}

createInitialAdmin().catch(console.error);
