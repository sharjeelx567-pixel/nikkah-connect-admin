"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../../services/api";
import {
  ShieldAlert,
  Search,
  Filter,
  Clock,
  User,
  Activity,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Terminal
} from "lucide-react";

interface AuditEntry {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetId: string;
  targetType: string;
  details?: Record<string, any>;
  timestamp: any;
  ip?: string;
}

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<AuditEntry | null>(null);

  const { data: logsData, isLoading, refetch, isFetching } = useQuery<{ data: { data: AuditEntry[] } }>({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const res = await api.get("/audit-logs?limit=100");
      return res.data;
    },
    refetchInterval: 10000,
  });

  const logs: AuditEntry[] = Array.isArray(logsData?.data?.data)
    ? logsData.data.data
    : Array.isArray(logsData?.data)
    ? (logsData.data as any)
    : [];

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.adminEmail || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.action || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.targetId || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === "all" || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const formatIp = (rawIp?: string) => {
    if (!rawIp || rawIp === "::1" || rawIp === "127.0.0.1" || rawIp === "::ffff:127.0.0.1") {
      return "127.0.0.1 (Localhost)";
    }
    return rawIp.replace(/^::ffff:/, "");
  };

  const formatDate = (raw: any) => {
    if (!raw) return "—";
    let d: Date;
    if (raw._seconds) {
      d = new Date(raw._seconds * 1000);
    } else {
      d = new Date(raw);
    }
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getActionBadge = (action: string) => {
    const a = (action || "").toLowerCase();
    if (a.includes("approve") || a.includes("activate")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (a.includes("reject") || a.includes("suspend") || a.includes("delete") || a.includes("ban")) {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (a.includes("settings") || a.includes("update") || a.includes("edit")) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 border border-slate-200/80 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            Administrative Audit Trail & Security Logs
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable, append-only records of all staff actions, permissions, and moderation events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* 2. Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by admin email, action keyword, or target UID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="w-full sm:w-auto px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer"
        >
          <option value="all">All Action Types</option>
          <option value="user_suspended">User Suspended</option>
          <option value="user_activated">User Activated</option>
          <option value="photo_approved">Photo Approved</option>
          <option value="photo_rejected">Photo Rejected</option>
          <option value="verification_approved">Verification Approved</option>
          <option value="verification_rejected">Verification Rejected</option>
          <option value="settings_updated">Settings Updated</option>
          <option value="admin_created">Admin Created</option>
        </select>
      </div>

      {/* 3. Audit Logs Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Admin Operator</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Resource</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-right">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="py-4 px-4">
                      <div className="h-6 bg-slate-100 rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No matching audit trail events found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block truncate max-w-[200px]">
                        {log.adminEmail || log.adminId || "System"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-slate-600 font-mono text-[11px]">
                        {log.targetType ? `${log.targetType}: ` : ""}
                        <span className="text-slate-900 font-semibold">{log.targetId || "—"}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[10px] font-semibold text-slate-700">
                        {formatIp(log.ip)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        View JSON
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Details Inspector Dialog */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-600" />
                Audit Event Metadata Payload
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p>
                <strong className="text-slate-700">Action:</strong> {selectedLog.action}
              </p>
              <p>
                <strong className="text-slate-700">Admin:</strong> {selectedLog.adminEmail}
              </p>
              <p>
                <strong className="text-slate-700">Target ID:</strong> {selectedLog.targetId}
              </p>
              <p>
                <strong className="text-slate-700">Timestamp:</strong> {formatDate(selectedLog.timestamp)}
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Metadata Details
              </label>
              <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60 custom-scrollbar">
                {JSON.stringify(selectedLog.details || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

