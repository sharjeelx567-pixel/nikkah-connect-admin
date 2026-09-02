// @ts-nocheck
import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { successResponse, errorResponse } from '../utils/helpers';

export async function getMatchingStats(req: Request, res: Response): Promise<void> {
  try {
    const [matchesSnap, connectionSnap, interestSnap] = await Promise.all([
      db.collection('matches').count().get(),
      db.collection('connection_requests').count().get(),
      db.collection('user_interests').count().get(),
    ]);

    res.json(successResponse({
      totalMatches: matchesSnap.data().count,
      totalConnectionRequests: connectionSnap.data().count,
      totalAnonymousSignals: interestSnap.data().count,
    }));
  } catch (error) {
    console.error('[Matching Admin] getMatchingStats error:', error);
    res.status(500).json(errorResponse('Failed to fetch matching stats', error));
  }
}

export async function getCompatibilityStats(req: Request, res: Response): Promise<void> {
  try {
    const assessmentsSnap = await db.collection('compatibility_assessments').where('isCompleted', '==', true).count().get();
    
    // For distribution, fetch the latest 500 scores. matching_scores docs
    // (see functions/src/index.ts's scoreData) only ever get `updatedAt`
    // written, never `createdAt` — orderBy('createdAt') silently excludes
    // every document missing that field, which made this query always
    // return zero rows regardless of how much real data existed.
    const scoresSnap = await db.collection('matching_scores').orderBy('updatedAt', 'desc').limit(500).get();
    
    let totalScore = 0;
    let count = 0;
    const distribution = {
      '90-100': 0,
      '80-89': 0,
      '70-79': 0,
      '60-69': 0,
      '50-59': 0,
      'Below 50': 0,
    };

    scoresSnap.forEach(doc => {
      const raw = doc.data().compatibilityScore;
      // A deal-breaker conflict is stored as compatibilityScore: null (see
      // functions/src/index.ts) specifically so it's NOT confused with a
      // genuine 0% match — counting it as 0 here would skew the average and
      // wrongly inflate the "Below 50" bucket with non-matches.
      if (raw === null || raw === undefined) return;
      const score = raw;
      totalScore += score;
      count++;

      if (score >= 90) distribution['90-100']++;
      else if (score >= 80) distribution['80-89']++;
      else if (score >= 70) distribution['70-79']++;
      else if (score >= 60) distribution['60-69']++;
      else if (score >= 50) distribution['50-59']++;
      else distribution['Below 50']++;
    });

    res.json(successResponse({
      completedAssessments: assessmentsSnap.data().count,
      averageScore: count > 0 ? (totalScore / count).toFixed(1) : 0,
      distribution
    }));
  } catch (error) {
    console.error('[Matching Admin] getCompatibilityStats error:', error);
    res.status(500).json(errorResponse('Failed to fetch compatibility stats', error));
  }
}

export async function getConnectionRequests(req: Request, res: Response): Promise<void> {
  try {
    const snapshot = await db.collection('connection_requests')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    // Flutter writes senderId/receiverId (see matching_repository_impl.dart)
    // with no display name on the doc itself — enrich both sides so the
    // admin table doesn't fall back to raw UIDs / a "Candidate B" placeholder.
    const requests = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const [senderDoc, receiverDoc] = await Promise.all([
          data.senderId ? db.collection('users').doc(data.senderId).get() : null,
          data.receiverId ? db.collection('users').doc(data.receiverId).get() : null,
        ]);
        return {
          id: doc.id,
          ...data,
          senderName: senderDoc?.data()?.displayName || '',
          recipientName: receiverDoc?.data()?.displayName || '',
          recipientId: data.receiverId || '',
        };
      })
    );

    res.json(successResponse(requests));
  } catch (error) {
    console.error('[Matching Admin] getConnectionRequests error:', error);
    res.status(500).json(errorResponse('Failed to fetch connection requests', error));
  }
}

export async function getAnonymousSignals(req: Request, res: Response): Promise<void> {
  try {
    const snapshot = await db.collection('admin_audit_logs')
      .where('action', 'in', ['anonymous_signal_sent', 'anonymous_signal_match'])
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    const signals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(successResponse(signals));
  } catch (error) {
    console.error('[Matching Admin] getAnonymousSignals error:', error);
    res.status(500).json(errorResponse('Failed to fetch anonymous signals', error));
  }
}

export async function getDormantProfiles(req: Request, res: Response): Promise<void> {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const snapshot = await db.collection('users')
      .where('lastActiveAt', '<', ninetyDaysAgo)
      .where('adminOverrideHide', '==', false)
      .limit(50)
      .get();

    const profiles = snapshot.docs.map(doc => ({
      uid: doc.id,
      displayName: doc.data().displayName,
      email: doc.data().email,
      lastActiveAt: doc.data().lastActiveAt?.toDate(),
      isPremium: doc.data().isPremium,
    }));
    
    res.json(successResponse(profiles));
  } catch (error) {
    console.error('[Matching Admin] getDormantProfiles error:', error);
    res.status(500).json(errorResponse('Failed to fetch dormant profiles', error));
  }
}

