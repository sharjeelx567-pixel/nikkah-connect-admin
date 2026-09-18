// Emulator-only integration test for the admin "Delete Account" feature.
// Run via: firebase emulators:exec (see the command in the PR/task notes) —
// never against production. Verifies:
//   1. The cascade actually removes the target's data across every
//      collection the admin deleteUser controller touches, plus Auth.
//   2. Bystander data (a second user who shares a chat/match/family_accounts
//      doc with the target) survives untouched.
//   3. The route rejects an unauthenticated caller (401) and a request
//      missing the { confirm: "DELETE" } body (400), and neither deletes
//      anything.
//
// This talks to the real Express app object (no network listen needed for
// most of it, but we do listen on an ephemeral port so the test exercises
// the actual HTTP + middleware stack, not just the controller function).

process.env.NODE_ENV = 'test';
// Must load real JWT_SECRET/JWT_REFRESH_SECRET from .env before the static
// `import ... from '../src/utils/jwt'` below — jwt.ts now throws at
// module-load time if either is missing (see the JWT hardcoded-fallback
// remediation), and src/index.ts's own dotenv load happens too late for
// this file's own top-level import of jwt.ts.
import 'dotenv/config';

import { db, admin } from '../src/config/firebase';
import { signAccessToken } from '../src/utils/jwt';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
    console.log(`  PASS - ${msg}`);
  } else {
    failed++;
    failures.push(msg);
    console.log(`  FAIL - ${msg}`);
  }
}

async function docExists(path: string): Promise<boolean> {
  const doc = await db.doc(path).get();
  return doc.exists;
}

async function main() {
  console.log('[setup] importing Express app (initializeFirebase + seedDefaultAdmin fire on import)...');
  const app = (await import('../src/index')).default;
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const base = `http://127.0.0.1:${port}/api`;

  const stamp = Date.now();
  const targetUid = `del_target_${stamp}`;
  const bystanderUid = `del_bystander_${stamp}`;
  const untouchedUid = `del_untouched_${stamp}`;
  const secondTargetUid = `del_target2_${stamp}`; // for the negative "no confirm" test
  const adminUid = `del_test_admin_${stamp}`;

  const sortedPair = (a: string, b: string) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  const matchId = sortedPair(targetUid, bystanderUid);
  const untouchedChatId = sortedPair(bystanderUid, untouchedUid);

  console.log('\n[seed] creating Firebase Auth users...');
  for (const uid of [targetUid, bystanderUid, untouchedUid, secondTargetUid]) {
    await admin.auth().createUser({ uid, email: `${uid}@test.local`, password: 'Passw0rd!123' });
  }

  console.log('[seed] writing Firestore fixtures...');
  await db.collection('admins').doc(adminUid).set({
    email: 'admin-test@nikkahconnect.com',
    role: 'super_admin',
    isActive: true,
  });

  await db.collection('users').doc(targetUid).set({
    displayName: 'Delete Target', email: `${targetUid}@test.local`, gender: 'Male', profileCompleted: true,
  });
  await db.collection('users').doc(secondTargetUid).set({
    displayName: 'Delete Target 2', email: `${secondTargetUid}@test.local`,
  });
  await db.collection('users').doc(bystanderUid).set({
    displayName: 'Bystander', email: `${bystanderUid}@test.local`, gender: 'Female',
  });
  await db.collection('users').doc(untouchedUid).set({
    displayName: 'Untouched Third Party', email: `${untouchedUid}@test.local`,
  });

  await db.collection('users').doc(targetUid).collection('notifications').doc('n1').set({
    title: 'Test notif', body: 'x', isRead: false,
  });

  await db.collection('private_preferences').doc(targetUid).set({ dealBreakers: {} });

  await db.collection('connection_requests').doc(`${targetUid}_${bystanderUid}`).set({
    senderId: targetUid, receiverId: bystanderUid, status: 'pending',
  });

  await db.collection('matches').doc(matchId).set({
    id: matchId,
    userA: targetUid < bystanderUid ? targetUid : bystanderUid,
    userB: targetUid < bystanderUid ? bystanderUid : targetUid,
  });

  await db.collection('chats').doc(matchId).set({
    id: matchId, participants: [targetUid, bystanderUid], lastMessage: 'hi',
  });
  await db.collection('chats').doc(matchId).collection('messages').doc('m1').set({
    senderId: targetUid, text: 'hello', type: 'text',
  });
  await db.collection('chats').doc(matchId).collection('messages').doc('m2').set({
    senderId: bystanderUid, text: 'hey', type: 'text',
  });

  await db.collection('blocks').add({ blockerId: targetUid, blockedId: bystanderUid });

  // family_accounts: one where the TARGET is the owner (whole doc should be
  // deleted), one where the target is only the linked candidate (doc should
  // survive for the bystander-owner, candidateId cleared).
  const familyOwnedByTargetRef = db.collection('family_accounts').doc(`fam_owner_${stamp}`);
  await familyOwnedByTargetRef.set({ ownerId: targetUid, candidateId: bystanderUid });
  const familyOwnedByBystanderRef = db.collection('family_accounts').doc(`fam_candidate_${stamp}`);
  await familyOwnedByBystanderRef.set({ ownerId: bystanderUid, candidateId: targetUid });

  // A chat/match completely unrelated to the deletion target, to prove the
  // cascade doesn't touch other users' data at all.
  await db.collection('chats').doc(untouchedChatId).set({
    id: untouchedChatId, participants: [bystanderUid, untouchedUid], lastMessage: 'unrelated',
  });
  await db.collection('chats').doc(untouchedChatId).collection('messages').doc('u1').set({
    senderId: untouchedUid, text: 'untouched message', type: 'text',
  });

  const adminToken = signAccessToken({ uid: adminUid, email: 'admin-test@nikkahconnect.com', role: 'super_admin' });

  console.log('\n=== TEST 1: unauthenticated request is rejected, nothing deleted ===');
  {
    const res = await fetch(`${base}/users/${secondTargetUid}`, { method: 'DELETE' });
    assert(res.status === 401, `unauthenticated DELETE returns 401 (got ${res.status})`);
    assert(await docExists(`users/${secondTargetUid}`), 'second target user document still exists after unauthenticated attempt');
  }

  console.log('\n=== TEST 2: authenticated but missing confirm:"DELETE" is rejected, nothing deleted ===');
  {
    const res = await fetch(`${base}/users/${secondTargetUid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert(res.status === 400, `missing-confirm DELETE returns 400 (got ${res.status})`);
    assert(await docExists(`users/${secondTargetUid}`), 'second target user document still exists after missing-confirm attempt');
  }

  console.log('\n=== TEST 3: full authorized deletion with confirm:"DELETE" ===');
  {
    const res = await fetch(`${base}/users/${targetUid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'DELETE' }),
    });
    const body: any = await res.json();
    assert(res.status === 200 && body.success === true, `authorized delete returns 200 success (got ${res.status}, success=${body.success})`);

    // Target's own data
    assert(!(await docExists(`users/${targetUid}`)), 'users/{target} document deleted');
    assert(!(await docExists(`users/${targetUid}/notifications/n1`)), 'target notifications subcollection deleted');
    assert(!(await docExists(`private_preferences/${targetUid}`)), 'private_preferences/{target} deleted');
    assert(!(await docExists(`connection_requests/${targetUid}_${bystanderUid}`)), 'connection_requests doc deleted');
    assert(!(await docExists(`matches/${matchId}`)), 'matches doc deleted');
    assert(!(await docExists(`chats/${matchId}`)), 'shared chat doc deleted');
    assert(!(await docExists(`chats/${matchId}/messages/m1`)), 'chat message m1 deleted');
    assert(!(await docExists(`chats/${matchId}/messages/m2`)), 'chat message m2 deleted');
    const blocksSnap = await db.collection('blocks').where('blockerId', '==', targetUid).get();
    assert(blocksSnap.empty, 'blocks doc (target as blocker) deleted');
    assert(!(await docExists(familyOwnedByTargetRef.path)), 'family_accounts doc owned by target deleted entirely');

    // family_accounts where target was only the CANDIDATE: doc survives, field cleared
    const famCandDoc = await familyOwnedByBystanderRef.get();
    assert(famCandDoc.exists, 'family_accounts doc owned by bystander survives');
    assert(famCandDoc.exists && famCandDoc.data()?.candidateId === undefined, 'candidateId cleared on surviving family_accounts doc');

    // Firebase Auth record gone
    let authGone = false;
    try {
      await admin.auth().getUser(targetUid);
    } catch (e: any) {
      authGone = e?.code === 'auth/user-not-found';
    }
    assert(authGone, 'Firebase Auth user record deleted');

    // Audit log written
    const auditSnap = await db.collection('admin_audit_logs')
      .where('action', '==', 'DELETE_USER')
      .where('targetId', '==', targetUid)
      .get();
    assert(!auditSnap.empty, 'admin_audit_logs has a DELETE_USER entry for the target');

    console.log('\n  --- BYSTANDER SAFETY ---');
    assert(await docExists(`users/${bystanderUid}`), 'bystander user document survives');
    const bystanderData = (await db.doc(`users/${bystanderUid}`).get()).data();
    assert(bystanderData?.displayName === 'Bystander', 'bystander document fields unchanged');
    assert(await docExists(`users/${untouchedUid}`), 'unrelated third-party user document survives');
    assert(await docExists(`chats/${untouchedChatId}`), 'unrelated chat between bystander and third party survives');
    assert(await docExists(`chats/${untouchedChatId}/messages/u1`), 'unrelated chat message survives');
  }

  server.close();

  console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    console.log('Failures:');
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exitCode = 1;
});
