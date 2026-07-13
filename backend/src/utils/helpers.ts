import { db, admin } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { AuditLog, ApiResponse } from '../types';
import { Request } from 'express';

export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
  };
}

export function errorResponse(error: string, details?: unknown): ApiResponse {
  return {
    success: false,
    error,
    data: details,
  };
}

export function getPaginationParams(query: Record<string, unknown> | any) {
  const page = Math.max(1, parseInt(String(query.page || '1'), 10));
  const limit = Math.max(1, Math.min(100, parseInt(String(query.limit || '10'), 10)));
  return { page, limit };
}

export async function createAuditLog(log: Omit<AuditLog, 'id'>): Promise<void> {
  try {
    await db.collection('admin_audit_logs').add(log);
  } catch (err) {
    console.error('[Audit] Failed to create audit log:', err);
  }
}

export function getClientIp(req: Request): string {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  return Array.isArray(ip) ? ip[0] : String(ip);
}

export function serverTimestamp(): FieldValue {
  return FieldValue.serverTimestamp();
}
