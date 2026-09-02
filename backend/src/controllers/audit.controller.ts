// @ts-nocheck
import { Request, Response } from "express";
import { db } from "../config/firebase";
import { successResponse, errorResponse, serverTimestamp } from "../utils/helpers";
import { AuditLog } from "../types";

export async function logAction(
  adminId: string,
  adminEmail: string,
  action: string,
  targetId: string,
  targetType: AuditLog["targetType"],
  details: Record<string, unknown> = {},
  ip: string = ""
): Promise<void> {
  try {
    let cleanIp = ip || "127.0.0.1 (Localhost)";
    if (cleanIp === "::1" || cleanIp === "127.0.0.1" || cleanIp === "::ffff:127.0.0.1") {
      cleanIp = "127.0.0.1 (Localhost)";
    }
    cleanIp = cleanIp.replace(/^::ffff:/, "");

    const log: AuditLog = {
      adminId,
      adminEmail,
      action,
      targetId,
      targetType,
      details,
      timestamp: serverTimestamp(),
      ip: cleanIp,
    };
    // Unified with createAuditLog (utils/helpers.ts) and the direct writes in
    // verification.controller.ts/payments.controller.ts, which all already
    // target "admin_audit_logs" — that collection has more established
    // readers (analytics.controller.ts's recent-activity feed,
    // matching.controller.ts) than "audit_logs" ever had, so this file's
    // reader (getAuditLogs, below) was switched to match rather than
    // migrating every other write site.
    await db.collection("admin_audit_logs").add(log);
  } catch (error) {
    console.error("[Audit] Failed to write log:", error);
  }
}

export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const page = parseInt(req.query.page as string) || 1;

    const snapshot = await db
      .collection("admin_audit_logs")
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    const logs = snapshot.docs.map((doc) => {
      const data = doc.data();
      let ip = data.ip || "127.0.0.1 (Localhost)";
      if (ip === "::1" || ip === "127.0.0.1" || ip === "::ffff:127.0.0.1") {
        ip = "127.0.0.1 (Localhost)";
      }
      return {
        id: doc.id,
        ...data,
        ip: ip.replace(/^::ffff:/, ""),
      };
    });

    res.json(
      successResponse({
        data: logs,
        pagination: {
          page,
          limit,
          total: logs.length,
        },
      })
    );
  } catch (error) {
    res.status(500).json(errorResponse("Failed to fetch audit logs", error));
  }
}
