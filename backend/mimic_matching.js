const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function mimicMatching() {
  const uid = "p0S8vjFrE1XhYynrSyNxjBV0KKt2"; // Female
  const maleUid = "FRiJr2e59XfdUhNw9fxnhfTM96w2";

  console.log('1. Getting female user data');
  const myDoc = await db.collection('users').doc(uid).get();
  const myData = myDoc.data();
  const myGenderNorm = myData.gender.trim().toLowerCase();

  console.log('2. Getting excluded UIDs');
  const excludedUids = new Set([uid]);
  
  const blocksSnap1 = await db.collection('blocks').where('blockerId', '==', uid).get();
  blocksSnap1.forEach(d => excludedUids.add(d.data().blockedId));
  
  const blocksSnap2 = await db.collection('blocks').where('blockedId', '==', uid).get();
  blocksSnap2.forEach(d => excludedUids.add(d.data().blockerId));

  const reportsSnap1 = await db.collection('reports').where('reporterId', '==', uid).get();
  reportsSnap1.forEach(d => excludedUids.add(d.data().reportedUserId));

  const reportsSnap2 = await db.collection('reports').where('reportedUserId', '==', uid).get();
  reportsSnap2.forEach(d => excludedUids.add(d.data().reporterId));

  const intSnap1 = await db.collection('user_interests').where('senderId', '==', uid).get();
  intSnap1.forEach(d => excludedUids.add(d.data().receiverId));

  const intSnap2 = await db.collection('user_interests').where('receiverId', '==', uid).get();
  intSnap2.forEach(d => excludedUids.add(d.data().senderId));

  const connSnap1 = await db.collection('connection_requests').where('senderId', '==', uid).get();
  connSnap1.forEach(d => excludedUids.add(d.data().receiverId));

  const connSnap2 = await db.collection('connection_requests').where('receiverId', '==', uid).get();
  connSnap2.forEach(d => excludedUids.add(d.data().senderId));

  const matchSnap1 = await db.collection('matches').where('userA', '==', uid).get();
  matchSnap1.forEach(d => excludedUids.add(d.data().userB));

  const matchSnap2 = await db.collection('matches').where('userB', '==', uid).get();
  matchSnap2.forEach(d => excludedUids.add(d.data().userA));

  const passSnap = await db.collection('user_passes').where('userId', '==', uid).get();
  passSnap.forEach(d => excludedUids.add(d.data().passedUserId));

  console.log(`Excluded UIDs:`, Array.from(excludedUids));

  console.log('3. Getting targetQuery users');
  const usersSnap = await db.collection('users').where('profileCompleted', '==', true).limit(100).get();
  console.log(`targetQuery returned ${usersSnap.docs.length} users`);

  for (const doc of usersSnap.docs) {
    const tUid = doc.id;
    if (tUid !== maleUid) continue; // Only care about the male profile for debugging

    const uData = doc.data();
    console.log(`\nEvaluating male profile ${tUid}:`);
    
    const targetGender = (uData.gender || '').trim().toLowerCase();
    if (!targetGender) {
      console.log(`  Skipped: targetGender is empty`);
      continue;
    }
    
    if (targetGender === myGenderNorm) {
      console.log(`  Skipped: same gender (${targetGender} == ${myGenderNorm})`);
      continue;
    }

    if (excludedUids.has(tUid)) {
      console.log(`  Skipped: in excluded UIDs`);
      continue;
    }

    // _isDealBreakerTriggered Logic
    const myDB = typeof myData.dealBreakers === 'object' ? myData.dealBreakers : {};
    const otherDB = typeof uData.dealBreakers === 'object' ? uData.dealBreakers : {};

    let dbTriggered = false;
    if (myDB['jointFamily'] === true && uData['familyType'] === 'Joint Family') { dbTriggered = true; console.log('  DB: Joint family'); }
    if (myDB['smoking'] === true && (uData['smokingPreference'] && uData['smokingPreference'] !== 'Never')) { dbTriggered = true; console.log('  DB: Smoking'); }
    if (myDB['drinking'] === true && uData['alcoholConsumption'] === true) { dbTriggered = true; console.log('  DB: Drinking'); }
    if (myDB['prays5Times'] === true && uData['prays5Times'] === false) { dbTriggered = true; console.log('  DB: Prays 5 times'); }

    if (otherDB['jointFamily'] === true && myData['familyType'] === 'Joint Family') { dbTriggered = true; console.log('  DB: Other Joint family'); }
    if (otherDB['smoking'] === true && (myData['smokingPreference'] && myData['smokingPreference'] !== 'Never')) { dbTriggered = true; console.log('  DB: Other Smoking'); }
    if (otherDB['drinking'] === true && myData['alcoholConsumption'] === true) { dbTriggered = true; console.log('  DB: Other Drinking'); }
    if (otherDB['prays5Times'] === true && myData['prays5Times'] === false) { dbTriggered = true; console.log('  DB: Other Prays 5 times'); }

    if (dbTriggered) {
      console.log(`  Skipped: Deal Breaker Triggered`);
      continue;
    }

    console.log(`  SUCCESS! Profile should be included.`);
  }
}

mimicMatching().catch(console.error).finally(() => process.exit(0));
