import { db, admin } from "../config/firebase";
import { FieldValue } from "firebase-admin/firestore";
import { AuditLog, ApiResponse } from "../types";
import { Request } from "express";

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
  const page = Math.max(1, parseInt(String(query.page || "1"), 10));
  const limit = Math.max(1, Math.min(100, parseInt(String(query.limit || "10"), 10)));
  return { page, limit };
}

export async function createAuditLog(log: Omit<AuditLog, "id">): Promise<void> {
  try {
    let cleanIp = log.ip || "127.0.0.1 (Localhost)";
    if (cleanIp === "::1" || cleanIp === "::ffff:127.0.0.1") {
      cleanIp = "127.0.0.1 (Localhost)";
    }
    await db.collection("admin_audit_logs").add({
      ...log,
      ip: cleanIp.replace(/^::ffff:/, ""),
    });
  } catch (err) {
    console.error("[Audit] Failed to create audit log:", err);
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers["cf-connecting-ip"] || req.headers["x-real-ip"] || req.headers["x-forwarded-for"];
  if (forwarded) {
    const rawIp = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : forwarded[0];
    if (rawIp === "::1" || rawIp === "127.0.0.1" || rawIp === "::ffff:127.0.0.1") {
      return "127.0.0.1 (Localhost)";
    }
    return rawIp.replace(/^::ffff:/, "");
  }
  const ip = req.ip || req.socket?.remoteAddress || "127.0.0.1";
  if (ip === "::1" || ip === "127.0.0.1" || ip === "::ffff:127.0.0.1") {
    return "127.0.0.1 (Localhost)";
  }
  return String(ip).replace(/^::ffff:/, "");
}

export function serverTimestamp(): FieldValue {
  return FieldValue.serverTimestamp();
}
