import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { successResponse, errorResponse, serverTimestamp } from '../utils/helpers';
import { AuditLog } from '../types';

export async function logAction(
  adminId: string,
  adminEmail: string,
  action: string,
  targetId: string,
  targetType: AuditLog['targetType'],
  details: Record<string, unknown> = {},
  ip: string = ''
): Promise<void> {
  try {
    const log: AuditLog = {
      adminId,
      adminEmail,
      action,
      targetId,
      targetType,
      details,
      timestamp: serverTimestamp(),
      ip,
    };
    await db.collection('audit_logs').add(log);
  } catch (error) {
    console.error('[Audit] Failed to write log:', error);
  }
}

export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const page = parseInt(req.query.page as string) || 1;
    
    // In Firestore, proper pagination requires cursors, but for a simple sprint we use limits
    // If real pagination is needed, we should pass startAfter
    
    const snapshot = await db.collection('audit_logs')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json(successResponse({
      data: logs,
      pagination: {
        page,
        limit,
        total: logs.length, // approximation
      }
    }));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to fetch audit logs', error));
  }
}
