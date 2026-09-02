"use client";

import React from "react";
import { AuditLog } from "../../types";
import { ShieldCheck, UserMinus, Image as ImageIcon, Settings, HelpCircle, CheckCircle } from "lucide-react";

export default function ActivityFeed({ logs }: { logs?: AuditLog[] }) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case "BAN_USER":
      case "SUSPEND_USER":
        return { icon: UserMinus, color: "text-rose-600 bg-rose-50 border-rose-100" };
      case "APPROVE_PHOTO":
      case "REJECT_PHOTO":
        return { icon: ImageIcon, color: "text-indigo-600 bg-indigo-50 border-indigo-100" };
      case "APPROVE_VERIFICATION":
      case "REJECT_VERIFICATION":
        return { icon: ShieldCheck, color: "text-emerald-600 bg-emerald-50 border-emerald-100" };
      case "UPDATE_SETTINGS":
        return { icon: Settings, color: "text-amber-600 bg-amber-50 border-amber-100" };
      default:
        return { icon: HelpCircle, color: "text-slate-500 bg-slate-50 border-slate-200" };
    }
  };

  const formatTime = (raw?: any) => {
    if (!raw) return "";
    // Firestore Timestamps serialize over the API as {_seconds, _nanoseconds},
    // not an ISO string — `new Date(raw)` on that shape silently produces
    // "Invalid Date".
    const ms = typeof raw === "object" && "_seconds" in raw ? raw._seconds * 1000 : raw;
    const date = new Date(ms);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const getActionLabel = (log: AuditLog) => {
    const email = log.adminEmail || "Admin";
    switch (log.action) {
      case "BAN_USER":
        return `${email} banned user account`;
      case "SUSPEND_USER":
        return `${email} suspended user account`;
      case "APPROVE_PHOTO":
        return `${email} approved user profile photo`;
      case "REJECT_PHOTO":
        return `${email} rejected user photo`;
      case "APPROVE_VERIFICATION":
        return `${email} verified user identity document`;
      case "UPDATE_SETTINGS":
        return `${email} updated app configuration parameters`;
      default:
        return `${email} performed: ${log.action.replace("_", " ")}`;
    }
  };

  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 text-xs">
        <CheckCircle className="w-8 h-8 text-slate-300 mb-2" />
        No administrative activities logged recently.
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-6">
        {logs.map((log, logIdx) => {
          const config = getActionIcon(log.action);
          const Icon = config.icon;

          return (
            <li key={log.id || logIdx}>
              <div className="relative pb-6">
                {logIdx !== logs.length - 1 ? (
                  <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-100" aria-hidden="true" />
                ) : null}
                <div className="relative flex space-x-3">
                  <div>
                    <span className={`h-8 w-8 rounded-xl flex items-center justify-center border ${config.color}`}>
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 pt-1 flex justify-between space-x-4">
                    <div>
                      <p className="text-xs text-slate-800 font-semibold leading-relaxed">
                        {getActionLabel(log)}
                      </p>
                      {log.details && (log.details.reason || log.details.days) && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Reason: {log.details.reason || "N/A"} {log.details.days ? `(${log.details.days} days)` : ""}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-[10px] whitespace-nowrap text-slate-400 font-medium pt-0.5">
                      {formatTime(log.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
