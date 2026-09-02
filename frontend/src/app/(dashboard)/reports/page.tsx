"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import api from "../../../services/api";
import { Report } from "../../../types";
import UserAvatar from "../../../components/common/UserAvatar";
import {
  ShieldCheck,
  XCircle,
  AlertTriangle,
  Clock,
  Mail,
  Flag,
  CheckCircle2,
  FileText,
  MessageSquare,
  Check,
  X,
  ExternalLink
} from "lucide-react";

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Fetch reports list
  const { data, isLoading } = useQuery<{ data: { data: Report[] } }>({
    queryKey: ["reports-list", filterStatus],
    queryFn: async () => {
      const param = filterStatus !== "all" ? `?status=${filterStatus}` : "";
      const response = await api.get(`/reports${param}`);
      return response.data;
    },
    refetchInterval: 10000,
  });

  const reports = data?.data?.data || [];

  // Resolve Mutation
  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/reports/${id}/resolve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats-badges"] });
    },
  });

  // Dismiss Mutation
  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/reports/${id}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats-badges"] });
    },
  });

  const formatDate = (raw: any) => {
    if (!raw) return "";
    let d: Date;
    if (raw._seconds) {
      d = new Date(raw._seconds * 1000);
    } else if (typeof raw === "string" || typeof raw === "number") {
      d = new Date(raw);
    } else {
      return "";
    }
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status?: string) => {
    const s = (status || "open").toLowerCase();
    if (s === "resolved") {
      return (
        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold inline-flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Resolved
        </span>
      );
    }
    if (s === "dismissed") {
      return (
        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-xs font-bold inline-flex items-center gap-1">
          <XCircle className="w-3.5 h-3.5" />
          Dismissed
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold inline-flex items-center gap-1">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
        Pending Review
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 border border-slate-200/80 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
            <Flag className="w-4 h-4 text-indigo-600" />
            Candidate Reports & Moderation Center
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Investigate flagged candidate complaints, inappropriate conduct, and profile flags.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Reports</option>
            {/* Flutter writes status: 'pending' (see firebase_chat_repository.dart's
                reportUser()) — filtering by the old "open" value returned zero rows
                even though pending reports existed. */}
            <option value="pending">Pending / Open</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 bg-white rounded-2xl border border-slate-200/80 shimmer" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200/80 rounded-2xl text-center shadow-xs">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-3 border border-emerald-100">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold font-display text-slate-900">Reports Queue Clear</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            No complaints found matching the selected filter. Platform is running safely.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {reports.map((report) => {
              const isOpen =
                (report.status || "open").toLowerCase() === "open" ||
                (report.status || "open").toLowerCase() === "pending";
              const displayText = report.description || report.reason || "No details provided";

              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  key={report.id}
                  className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col gap-4"
                >
                  {/* Top Bar: Category, Date, Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-[11px] uppercase tracking-wider">
                        {report.category || "General Report"}
                      </span>
                      {report.createdAt && (
                        <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(report.createdAt || '')}
                        </span>
                      )}
                    </div>
                    <div>{getStatusBadge(report.status)}</div>
                  </div>

                  {/* Users Involved Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {/* Reporter Details */}
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        src={report.reporter?.avatar}
                        name={report.reporter?.name}
                        gender={report.reporter?.gender}
                        className="w-11 h-11 rounded-xl shadow-xs"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Reported By
                        </span>
                        <h4 className="font-bold text-xs text-slate-900 truncate">
                          {report.reporter?.name || "Anonymous Candidate"}
                        </h4>
                        {report.reporter?.email && (
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                            <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            {report.reporter.email}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Reported Profile Details */}
                    {report.reportedUser ? (
                      <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-4">
                        <UserAvatar
                          src={report.reportedUser?.avatar}
                          name={report.reportedUser?.name}
                          gender={report.reportedUser?.gender}
                          className="w-11 h-11 rounded-xl shadow-xs border border-rose-200"
                        />
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
                            Reported Candidate
                          </span>
                          <h4 className="font-bold text-xs text-slate-900 truncate">
                            {report.reportedUser?.name || "Reported User"}
                          </h4>
                          {report.reportedUser?.email && (
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                              <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              {report.reportedUser.email}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-4 text-xs text-slate-500">
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <span>Platform / General Behavior Report</span>
                      </div>
                    )}
                  </div>

                  {/* Complaint Description Box */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      Reported Complaint Content
                    </span>

                    {report.reason && report.reason !== report.description && (
                      <p className="font-bold text-slate-900 text-xs">{report.reason}</p>
                    )}

                    <div className="text-slate-800 whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-lg border border-slate-200 font-medium">
                      &ldquo;{displayText}&rdquo;
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    {report._collection === "support_tickets" ? (
                      // Only support_tickets-sourced reports have a viewable
                      // conversation today — report.id IS the ticket id here
                      // (the old condition checked report.reporterUid, a field
                      // the backend never actually returns, so this button
                      // never rendered at all).
                      <Link
                        href={`/support?ticketId=${report.id}`}
                        className="py-2 px-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        View Conversation
                      </Link>
                    ) : (
                      <div />
                    )}

                    {isOpen && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => dismissMutation.mutate(report.id!)}
                          disabled={dismissMutation.isPending}
                          className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => resolveMutation.mutate(report.id!)}
                          disabled={resolveMutation.isPending}
                          className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          Mark Resolved
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}




