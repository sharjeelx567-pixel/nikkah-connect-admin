"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../../services/api";
import { Send, Bell, History, Users, Calendar, CheckCircle } from "lucide-react";

interface NotificationLog {
  id: string;
  title: string;
  body: string;
  audience: string;
  sentAt: string;
  totalTargets?: number;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [targetUid, setTargetUid] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [message, setMessage] = useState("");

  const { data: historyData, isLoading } = useQuery<any>({
    queryKey: ["notification-history"],
    queryFn: async () => {
      const response = await api.get("/notifications/history");
      return response.data;
    },
  });

  const history: NotificationLog[] = Array.isArray(historyData?.data?.data)
    ? historyData.data.data
    : Array.isArray(historyData?.data)
    ? historyData.data
    : [];

  const sendMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.post("/notifications/send", payload);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notification-history"] });
      setTitle("");
      setBody("");
      setTargetUid("");
      setScheduledAt("");
      setMessage(data.message || "Notification dispatched successfully!");
      setTimeout(() => setMessage(""), 4000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;

    const payload: any = { title, body, audience };
    if (audience === "specific") payload.targetUid = targetUid;
    if (scheduledAt) payload.scheduledAt = scheduledAt;

    sendMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Notification panel (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600" />
                Compose Push Notification
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Send real-time alerts or target specific candidate segments
              </p>
            </div>
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-[10px] rounded-full uppercase tracking-wider">
              Firebase Cloud Messaging
            </span>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
            {message && (
              <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Target Audience</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { value: "all", label: "All Users" },
                  { value: "premium", label: "Premium" },
                  { value: "verified", label: "Verified" },
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                  { value: "specific", label: "Single User" },
                ].map((aud) => (
                  <button
                    key={aud.value}
                    type="button"
                    onClick={() => setAudience(aud.value)}
                    className={`py-2 px-2 rounded-xl border text-xs font-semibold text-center cursor-pointer transition-all ${
                      audience === aud.value
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    {aud.label}
                  </button>
                ))}
              </div>
            </div>

            {audience === "specific" && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Target User UID</label>
                <input
                  type="text"
                  required
                  value={targetUid}
                  onChange={(e) => setTargetUid(e.target.value)}
                  placeholder="e.g. PszvFj1BTQSCCL2hCJVXewKljvh1"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 text-xs font-medium"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Notification Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="New Match Recommendation!"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Message Body</label>
              <textarea
                rows={3}
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Someone just viewed your profile. Log in to explore compatible matches today."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 text-xs font-medium resize-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Schedule Delivery (Optional)
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-slate-700 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={sendMutation.isPending}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {sendMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" /> Dispatch Push Notification
                </>
              )}
            </button>
          </form>
        </div>

        {/* Delivery History panel (1 col) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col h-[520px]">
          <div className="pb-4 border-b border-slate-100 flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            <div>
              <h3 className="text-base font-bold font-display text-slate-900">Broadcast History</h3>
              <p className="text-xs text-slate-400 mt-0.5">Recently dispatched alert logs</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-1 text-xs custom-scrollbar">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-slate-50 rounded-xl shimmer" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <p className="text-slate-400 text-center py-16">No previous broadcast history found.</p>
            ) : (
              history.map((log) => (
                <div key={log.id} className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-900 truncate max-w-[70%]">{log.title}</span>
                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-bold uppercase">
                      {log.audience}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{log.body}</p>
                  <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-200/60 text-[10px] text-slate-400 font-medium">
                    <span>Targeted: {log.totalTargets || 0}</span>
                    <span>{log.sentAt ? (typeof log.sentAt === 'object' && (log.sentAt as any)._seconds ? new Date((log.sentAt as any)._seconds * 1000).toLocaleDateString() : new Date(log.sentAt).toLocaleDateString()) : '—'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

