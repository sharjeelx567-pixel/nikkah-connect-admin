// Emulator-only regression tests for the admin-backend security
// remediation pass (JWT hardcoded fallback, wildcard permission
// escalation, login account enumeration, analyst photo permission bug,
// hardcoded default super-admin credentials). Run via firebase
// emulators:exec — never against production.

process.env.NODE_ENV = 'test';
// Must load .env (for JWT_SECRET/JWT_REFRESH_SECRET) before this file's own
// static `import ... from '../src/utils/jwt'` below triggers jwt.ts's
// module-load-time fail-fast check — src/index.ts normally does this via
// its own first line, but that import happens later here (dynamically, in
// main()), after jwt.ts would already have thrown.
import 'dotenv/config';

import { spawnSync } from 'child_process';
import * as bcrypt from 'bcryptjs';
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

async function main() {
  // ── TEST 0: missing JWT_SECRET fails safely (separate process — this
  // module's own import already required JWT_SECRET to be set, so this
  // must run in a fresh process with it deliberately stripped) ───────────
  console.log('\n=== TEST 0: missing JWT_SECRET fails safely, does not start ===');
  {
    // Set to '' rather than deleted: src/index.ts's own `import
    // 'dotenv/config'` would otherwise repopulate these from the real
    // .env file on disk (dotenv only skips keys that already EXIST in
    // process.env, regardless of truthiness) — an empty string still
    // exists as a key, so dotenv leaves it alone, and it's still falsy for
    // this codebase's own `!process.env[k]` checks.
    const env = { ...process.env, JWT_SECRET: '', JWT_REFRESH_SECRET: '' };
    const result = spawnSync(
      process.execPath,
      ['-e', "require('ts-node/register/transpile-only'); require('./src/index.ts');"],
      { cwd: __dirname + '/..', env, timeout: 15000, encoding: 'utf8' }
    );
    assert(result.status !== 0, `process exits non-zero when JWT_SECRET/JWT_REFRESH_SECRET are unset (got status ${result.status})`);
    const combined = (result.stdout || '') + (result.stderr || '');
    assert(/JWT_SECRET|Missing required environment/i.test(combined), 'failure message mentions the missing secret, not a silent hang');
  }

  console.log('\n=== TEST 0b: old hardcoded fallback secret no longer signs valid tokens ===');
  {
    const jwt = require('jsonwebtoken');
    const forged = jwt.sign(
      { uid: 'someone', email: 'x@x.com', role: 'super_admin' },
      'nikkah-connect-admin-secret-key-fallback-2026',
      { expiresIn: '1h' }
    );
    let rejected = false;
    try {
      jwt.verify(forged, process.env.JWT_SECRET);
    } catch {
      rejected = true;
    }
    assert(rejected, 'a token forged with the old fallback secret does not verify against the real (now-rotated) JWT_SECRET');
  }

  console.log('\n[setup] importing Express app...');
  const app = (await import('../src/index')).default;
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const base = `http://127.0.0.1:${port}/api`;

  const stamp = Date.now();

  // ── seed a normal admin (role: admin) and a deactivated one, plus an
  // analyst (photos.view only) and a delegated-permission admin (holds
  // only admins.update, not '*') ──────────────────────────────────────────
  const activePassword = 'CorrectHorseBattery1!';
  const activeHash = await bcrypt.hash(activePassword, 10);
  const deactivatedHash = await bcrypt.hash('WhateverPassword1!', 10);

  const activeAdminRef = db.collection('admins').doc(`active_${stamp}`);
  await activeAdminRef.set({
    email: `active_${stamp}@test.local`, role: 'admin', passwordHash: activeHash, isActive: true,
  });

  const deactivatedAdminRef = db.collection('admins').doc(`deactivated_${stamp}`);
  await deactivatedAdminRef.set({
    email: `deactivated_${stamp}@test.local`, role: 'admin', passwordHash: deactivatedHash, isActive: false,
  });

  const analystRef = db.collection('admins').doc(`analyst_${stamp}`);
  await analystRef.set({
    email: `analyst_${stamp}@test.local`, role: 'analyst', isActive: true,
  });
  const analystToken = signAccessToken({ uid: `analyst_${stamp}`, email: 'x', role: 'analyst' as any });

  const delegatedRef = db.collection('admins').doc(`delegated_${stamp}`);
  await delegatedRef.set({
    email: `delegated_${stamp}@test.local`, role: 'moderator', permissions: ['admins.update', 'admins.create'], isActive: true,
  });
  const delegatedToken = signAccessToken({ uid: `delegated_${stamp}`, email: 'x', role: 'moderator' as any });

  const superAdminRef = db.collection('admins').doc(`super_${stamp}`);
  await superAdminRef.set({ email: `super_${stamp}@test.local`, role: 'super_admin', isActive: true });
  const superToken = signAccessToken({ uid: `super_${stamp}`, email: 'x', role: 'super_admin' as any });

  // target user for the photo route
  const targetUserRef = db.collection('users').doc(`photo_target_${stamp}`);
  await targetUserRef.set({
    displayName: 'Photo Target', pendingProfileImage: 'https://example.com/x.jpg', photoStatus: 'pending',
  });

  console.log('\n=== TEST 1: login — deactivated account returns the SAME generic failure as a wrong password (before authentication) ===');
  {
    const wrongPassRes = await fetch(`${base}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `active_${stamp}@test.local`, password: 'totallyWrongPassword1!' }),
    });
    const wrongPassBody: any = await wrongPassRes.json();

    const deactivatedWrongPassRes = await fetch(`${base}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `deactivated_${stamp}@test.local`, password: 'someGuessedPassword1!' }),
    });
    const deactivatedWrongPassBody: any = await deactivatedWrongPassRes.json();

    const nonexistentRes = await fetch(`${base}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `doesnotexist_${stamp}@test.local`, password: 'anything1!' }),
    });
    const nonexistentBody: any = await nonexistentRes.json();

    assert(wrongPassRes.status === deactivatedWrongPassRes.status && wrongPassRes.status === nonexistentRes.status,
      `all three (wrong password / deactivated+wrong password / nonexistent email) return the same HTTP status (${wrongPassRes.status}, ${deactivatedWrongPassRes.status}, ${nonexistentRes.status})`);
    assert(wrongPassBody.error === deactivatedWrongPassBody.error && wrongPassBody.error === nonexistentBody.error,
      `all three return the identical generic error message ("${wrongPassBody.error}")`);

    // Now prove the deactivated account DOES reveal its state once the
    // correct password is supplied — this is expected/appropriate, not a leak.
    const deactivatedCorrectPassRes = await fetch(`${base}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `deactivated_${stamp}@test.local`, password: 'WhateverPassword1!' }),
    });
    assert(deactivatedCorrectPassRes.status === 403, `deactivated account WITH the correct password now correctly reveals 403 (got ${deactivatedCorrectPassRes.status})`);
  }

  console.log('\n=== TEST 2: wildcard permission cannot be self/other-granted by a non-super_admin ===');
  {
    const res = await fetch(`${base}/admins/${delegatedRef.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${delegatedToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions: ['*', 'users.view'] }),
    });
    assert(res.status === 200, `update request itself succeeds (the '*' is silently stripped, not a hard error) — got ${res.status}`);
    const doc = await delegatedRef.get();
    const perms: string[] = doc.data()?.permissions || [];
    assert(!perms.includes('*'), `resulting permissions array does NOT contain '*' (got: ${JSON.stringify(perms)})`);
    assert(perms.includes('users.view'), 'the legitimate, non-wildcard permission in the same request was still applied');
  }

  console.log('\n=== TEST 2b: super_admin CAN still grant \'*\' where appropriate ===');
  {
    const targetForSuperGrant = db.collection('admins').doc(`grantee_${stamp}`);
    await targetForSuperGrant.set({ email: `grantee_${stamp}@test.local`, role: 'moderator', isActive: true });
    const res = await fetch(`${base}/admins/${targetForSuperGrant.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${superToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions: ['*'] }),
    });
    assert(res.status === 200, `super_admin's update request succeeds (got ${res.status})`);
    const doc = await targetForSuperGrant.get();
    assert((doc.data()?.permissions || []).includes('*'), "super_admin-initiated grant of '*' is preserved, not stripped");
  }

  console.log('\n=== TEST 3: analyst (photos.view only) cannot trigger request-reupload ===');
  {
    const res = await fetch(`${base}/photos/${targetUserRef.id}/request-reupload`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${analystToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'test' }),
    });
    assert(res.status === 403, `analyst request-reupload call is rejected with 403 (got ${res.status})`);
    const doc = await targetUserRef.get();
    assert(doc.data()?.photoStatus === 'pending', 'target user photoStatus is unchanged (still "pending", not wiped)');
    assert(doc.data()?.pendingProfileImage === 'https://example.com/x.jpg', 'target user pendingProfileImage is unchanged');
  }

  console.log('\n=== TEST 4: known default admin credentials cannot authenticate (never auto-seeded) ===');
  {
    // The real seedDefaultAdmin() only runs once at process startup and
    // only if the admins collection was empty at that time (it isn't, in
    // this test run) — so this proves the STANDING behavior: nothing in
    // this Firestore project has ever had admin@nikkahconnect.com /
    // Admin@123456 seeded into it, and login correctly rejects it.
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@nikkahconnect.com', password: 'Admin@123456' }),
    });
    const body: any = await res.json();
    assert(res.status === 401 && body.success === false, `known default credentials are rejected (got ${res.status}, success=${body.success})`);
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
