// Emulator-only regression tests for the Community/Relationship Posts admin
// moderation feature (posts.controller.ts, communities.controller.ts, and
// the post_reports extension to reports.controller.ts). Run via firebase
// emulators:exec — never against production.

process.env.NODE_ENV = 'test';
// Must load .env (for JWT_SECRET/JWT_REFRESH_SECRET) before this file's own
// static `import ... from '../src/utils/jwt'` below triggers jwt.ts's
// module-load-time fail-fast check — see admin_remediation.test.ts for the
// same reasoning.
import 'dotenv/config';

import { db } from '../src/config/firebase';
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
  console.log('\n[setup] importing Express app...');
  const app = (await import('../src/index')).default;
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const base = `http://127.0.0.1:${port}/api`;

  const stamp = Date.now();

  // ── seed: a posts.view-only admin, a full posts.manage moderator, and a
  //    target post + comment + post_report to moderate ──────────────────
  const viewOnlyRef = db.collection('admins').doc(`postsview_${stamp}`);
  await viewOnlyRef.set({ email: `postsview_${stamp}@test.local`, role: 'analyst', permissions: ['posts.view'], isActive: true });
  const viewOnlyToken = signAccessToken({ uid: `postsview_${stamp}`, email: 'x', role: 'analyst' as any });

  const moderatorRef = db.collection('admins').doc(`postsmod_${stamp}`);
  await moderatorRef.set({ email: `postsmod_${stamp}@test.local`, role: 'moderator', isActive: true });
  const moderatorToken = signAccessToken({ uid: `postsmod_${stamp}`, email: 'x', role: 'moderator' as any });

  const authorUid = `post_author_${stamp}`;
  await db.collection('users').doc(authorUid).set({ displayName: 'Post Author', email: 'author@test.local' });
  const reporterUid = `post_reporter_${stamp}`;
  await db.collection('users').doc(reporterUid).set({ displayName: 'Reporter', email: 'reporter@test.local' });

  const postRef = db.collection('relationship_posts').doc(`post_${stamp}`);
  await postRef.set({
    id: postRef.id, communityId: 'test_comm', authorUid, profileUid: authorUid,
    displayName: 'Author', age: 27, gender: 'Male', city: 'Lahore',
    status: 'active', likeCount: 0, commentCount: 1, reportCount: 1,
    createdAt: new Date(), updatedAt: new Date(),
  });

  const commentRef = postRef.collection('comments').doc(`comment_${stamp}`);
  await commentRef.set({
    id: commentRef.id, postId: postRef.id, authorUid: reporterUid, authorDisplayName: 'Reporter',
    text: 'inappropriate comment', status: 'active', createdAt: new Date(), updatedAt: new Date(),
  });

  const postReportRef = db.collection('post_reports').doc(`${postRef.id}_${reporterUid}`);
  await postReportRef.set({
    id: postReportRef.id, reporterId: reporterUid, contentType: 'post', postId: postRef.id,
    targetAuthorUid: authorUid, reason: 'Suspicious profile', status: 'pending', createdAt: new Date(),
  });

  console.log('\n=== TEST 1: GET /posts requires posts.view (403 without it) ===');
  {
    const noPermRef = db.collection('admins').doc(`noperm_${stamp}`);
    await noPermRef.set({ email: `noperm_${stamp}@test.local`, role: 'support_staff', isActive: true });
    const noPermToken = signAccessToken({ uid: `noperm_${stamp}`, email: 'x', role: 'support_staff' as any });

    const res = await fetch(`${base}/posts`, { headers: { Authorization: `Bearer ${noPermToken}` } });
    assert(res.status === 403, `a role without posts.view gets 403 (got ${res.status})`);

    const okRes = await fetch(`${base}/posts`, { headers: { Authorization: `Bearer ${viewOnlyToken}` } });
    assert(okRes.status === 200, `a role WITH posts.view gets 200 (got ${okRes.status})`);
  }

  console.log('\n=== TEST 2: PATCH /posts/:id/hide requires posts.manage (view-only is rejected) ===');
  {
    const res = await fetch(`${base}/posts/${postRef.id}/hide`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${viewOnlyToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'test' }),
    });
    assert(res.status === 403, `posts.view-only admin cannot hide a post (got ${res.status})`);

    const doc = await postRef.get();
    assert(doc.data()?.status === 'active', 'post status is unchanged after the rejected attempt');
  }

  console.log('\n=== TEST 3: a posts.manage admin CAN hide a post — writes status/moderatedBy/moderatedAt and an audit log ===');
  {
    const beforeAuditSnap = await db.collection('admin_audit_logs').where('targetId', '==', postRef.id).where('targetType', '==', 'post').get();
    const beforeCount = beforeAuditSnap.size;

    const res = await fetch(`${base}/posts/${postRef.id}/hide`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${moderatorToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Reported content under review' }),
    });
    assert(res.status === 200, `hide request succeeds for a posts.manage admin (got ${res.status})`);

    const doc = await postRef.get();
    assert(doc.data()?.status === 'hidden', `post status is now hidden (got ${doc.data()?.status})`);
    assert(doc.data()?.moderatedBy === `postsmod_${stamp}`, 'moderatedBy is set to the acting admin uid');
    assert(!!doc.data()?.moderatedAt, 'moderatedAt is set');
    assert(doc.data()?.moderationReason === 'Reported content under review', 'moderationReason is stored');

    const afterAuditSnap = await db.collection('admin_audit_logs').where('targetId', '==', postRef.id).where('targetType', '==', 'post').get();
    assert(afterAuditSnap.size === beforeCount + 1, `exactly one new audit log entry was created for this post (before=${beforeCount}, after=${afterAuditSnap.size})`);
  }

  console.log('\n=== TEST 4: a posts.manage admin can hide a comment — writes status and an audit log with targetType comment ===');
  {
    const res = await fetch(`${base}/posts/${postRef.id}/comments/${commentRef.id}/hide`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${moderatorToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Inappropriate language' }),
    });
    assert(res.status === 200, `hide comment request succeeds (got ${res.status})`);

    const doc = await commentRef.get();
    assert(doc.data()?.status === 'hidden', 'comment status is now hidden');

    const auditSnap = await db.collection('admin_audit_logs').where('targetId', '==', commentRef.id).where('targetType', '==', 'comment').get();
    assert(auditSnap.size >= 1, 'an audit log entry with targetType=comment was created');
  }

  console.log('\n=== TEST 5: GET /reports returns merged post_reports items tagged _collection=post_reports ===');
  {
    const res = await fetch(`${base}/reports?status=pending`, { headers: { Authorization: `Bearer ${moderatorToken}` } });
    assert(res.status === 200, `GET /reports succeeds (got ${res.status})`);
    const body: any = await res.json();
    const items: any[] = body.data?.data || [];
    const found = items.find((it) => it.id === postReportRef.id);
    assert(!!found, `the seeded post_reports item appears in the merged /reports listing (found ${items.length} items)`);
    assert(found?._collection === 'post_reports', 'the item is correctly tagged _collection=post_reports');
    assert(found?.postId === postRef.id, 'the item carries the postId for the admin UI to link to');
  }

  console.log('\n=== TEST 6: PATCH /reports/:id/resolve on a post_reports-sourced id writes status AND an audit log (the pre-existing gap this closes) ===');
  {
    const beforeAuditSnap = await db.collection('admin_audit_logs').where('targetId', '==', postReportRef.id).get();
    const beforeCount = beforeAuditSnap.size;

    const res = await fetch(`${base}/reports/${postReportRef.id}/resolve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${moderatorToken}` },
    });
    assert(res.status === 200, `resolve request succeeds (got ${res.status})`);

    const doc = await postReportRef.get();
    assert(doc.data()?.status === 'resolved', `post_reports status is now resolved (got ${doc.data()?.status})`);
    assert(doc.data()?.resolvedBy === `postsmod_${stamp}`, 'resolvedBy is set to the acting admin uid');

    const afterAuditSnap = await db.collection('admin_audit_logs').where('targetId', '==', postReportRef.id).get();
    assert(afterAuditSnap.size === beforeCount + 1, `exactly one new audit log entry was created for this report resolution (before=${beforeCount}, after=${afterAuditSnap.size})`);
  }

  console.log('\n=== TEST 7: an unhidden post is restored to active and its postCount-affecting status is reflected ===');
  {
    const res = await fetch(`${base}/posts/${postRef.id}/unhide`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${moderatorToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert(res.status === 200, `unhide request succeeds (got ${res.status})`);
    const doc = await postRef.get();
    assert(doc.data()?.status === 'active', 'post status is restored to active');
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
