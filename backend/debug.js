const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const bcrypt = require('bcryptjs');
const serviceAccount = require('./serviceAccountKey.json');

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

async function debugLogin() {
    console.log("Searching for admin...");
    const snapshot = await db.collection('admins').where('email', '==', 'admin@nikkahconnect.com').limit(1).get();
    
    if (snapshot.empty) {
        console.log("Snapshot empty!");
        return;
    }
    
    const adminDoc = snapshot.docs[0];
    const adminData = adminDoc.data();
    console.log("Found admin:", adminData.email, adminData.role, "isActive:", adminData.isActive);
    console.log("passwordHash exists?", !!adminData.passwordHash);
    
    if (!adminData.passwordHash) {
        console.log("No password hash found on doc!");
        return;
    }
    
    const passwordMatch = await bcrypt.compare("AdminPassword123!", adminData.passwordHash);
    console.log("Password match:", passwordMatch);
}
debugLogin();
