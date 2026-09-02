/**
 * One-time production migration.
 *
 * mirrorContactInfoToSensitiveData (functions/src/index.ts) only relocates
 * email/phoneNumber/legacy dealBreakers on the NEXT write to users/{uid}. This
 * backfills every EXISTING user document so the fix takes effect immediately
 * rather than waiting for each user to happen to edit their profile.
 *
 * Non-destructive: mirrors into sensitive_data/{uid} (merge) BEFORE deleting
 * from the root doc, and only deletes a field it just confirmed was mirrored.
 */
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
initializeApp({ credential: cert(require('./serviceAccountKey.json')) });
const db = getFirestore();

(async () => {
  const snap = await db.collection('users').get();
  console.log(`scanning ${snap.size} user documents...`);

  let migrated = 0;
  let batch = db.batch();
  let opsInBatch = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const hasEmail = data.email !== undefined;
    const hasPhone = data.phoneNumber !== undefined;
    const hasLegacyDealBreakers = data.dealBreakers !== undefined;
    if (!hasEmail && !hasPhone && !hasLegacyDealBreakers) continue;

    if (hasEmail || hasPhone) {
      const mirror = {};
      if (hasEmail) mirror.email = data.email;
      if (hasPhone) mirror.phoneNumber = data.phoneNumber;
      await db.collection('sensitive_data').doc(doc.id).set(mirror, { merge: true });
    }

    const strip = {};
    if (hasEmail) strip.email = FieldValue.delete();
    if (hasPhone) strip.phoneNumber = FieldValue.delete();
    if (hasLegacyDealBreakers) strip.dealBreakers = FieldValue.delete();
    batch.update(doc.ref, strip);
    opsInBatch++;
    migrated++;

    if (opsInBatch >= 400) {
      await batch.commit();
      batch = db.batch();
      opsInBatch = 0;
    }
  }
  if (opsInBatch > 0) await batch.commit();

  console.log(`migrated ${migrated}/${snap.size} user documents`);

  // Verify: no remaining email/phoneNumber/dealBreakers on any users doc.
  const after = await db.collection('users').get();
  let leftover = 0;
  after.forEach((d) => {
    const x = d.data();
    if (x.email !== undefined || x.phoneNumber !== undefined || x.dealBreakers !== undefined) leftover++;
  });
  console.log(`VERIFY: users docs still containing email/phoneNumber/dealBreakers = ${leftover}`);
})();
