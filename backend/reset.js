const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const bcrypt = require('bcryptjs');
const serviceAccount = require('./serviceAccountKey.json');

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

async function resetPassword() {
    const snapshot = await db.collection('admins').where('email', '==', 'admin@nikkahconnect.com').limit(1).get();
    
    if (snapshot.empty) {
        console.log("Admin not found!");
        return;
    }
    
    const adminDoc = snapshot.docs[0];
    const newPassword = "AdminPassword123!";
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    
    await adminDoc.ref.update({ passwordHash: newHash });
    console.log("Password hash successfully updated to match: " + newPassword);
}
resetPassword();
