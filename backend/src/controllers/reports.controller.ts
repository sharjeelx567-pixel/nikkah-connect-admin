import { Request, Response } from 'express';
import { db, admin } from '../config/firebase';
import { successResponse, errorResponse, getPaginationParams, serverTimestamp } from '../utils/helpers';

export async function getReports(req: Request, res: Response): Promise<void> {
  try {
    const { page, limit } = getPaginationParams(req.query);
    const { status } = req.query as { status?: string };

    let query: FirebaseFirestore.Query = db.collection('reports');
    if (status && status !== 'all') query = query.where('status', '==', status);
    query = query.orderBy('createdAt', 'desc').offset((page - 1) * limit).limit(limit);

    const snapshot = await query.get();
    const total = (await db.collection('reports').count().get()).data().count;

    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(successResponse({ data: reports, pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: page * limit < total } }));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to fetch reports', error));
  }
}

export async function resolveReport(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    await db.collection('reports').doc(id).update({
      status: 'resolved',
      resolvedBy: req.admin!.uid,
      resolvedAt: serverTimestamp(),
    });
    res.json(successResponse(null, 'Report resolved'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to resolve report', error));
  }
}

export async function dismissReport(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    await db.collection('reports').doc(id).update({ status: 'dismissed', resolvedBy: req.admin!.uid, resolvedAt: serverTimestamp() });
    res.json(successResponse(null, 'Report dismissed'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to dismiss report', error));
  }
}
