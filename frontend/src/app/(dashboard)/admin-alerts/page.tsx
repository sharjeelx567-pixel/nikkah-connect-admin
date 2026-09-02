"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, UserCircle, ExternalLink, Sparkles, Check } from "lucide-react";
import api from "../../../services/api";

interface AdminNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  targetUid?: string;
  isRead: boolean;
  timestamp: any;
}

export default function AdminAlertsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      const res = await api.get("/admin-alerts");
      setNotifications(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch alerts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/admin-alerts/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const handleAction = async (notif: AdminNotification) => {
    if (!notif.isRead) {
      await markAsRead(notif.id);
    }

    if (notif.type === "photo_upload" || notif.title.toLowerCase().includes("photo")) {
      router.push("/photos");
    } else if (notif.targetUid) {
      router.push("/users");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              Incoming System Alerts & Push Events
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live automated signals, flagged activity, and photo moderation triggers.
            </p>
          </div>

          <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-600 rounded-xl">
            {notifications.filter((n) => !n.isRead).length} Unread
          </span>
        </div>

        <div className="pt-4">
          {loading ? (
            <div className="py-16 flex justify-center">
              <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-3">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-display">All Caught Up!</h3>
              <p className="text-xs text-slate-400 mt-1">There are no pending unread alerts at this time.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 rounded-xl border transition-all flex items-start gap-4 ${
                    notif.isRead
                      ? "bg-slate-50/50 border-slate-200/60 opacity-80"
                      : "bg-indigo-50/40 border-indigo-100 shadow-xs"
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      notif.isRead
                        ? "bg-slate-100 text-slate-400"
                        : "bg-indigo-100 text-indigo-600"
                    }`}
                  >
                    {notif.type === "photo_upload" ? (
                      <UserCircle className="w-5 h-5" />
                    ) : (
                      <Bell className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4
                        className={`text-xs font-bold ${
                          notif.isRead ? "text-slate-800" : "text-indigo-900 font-bold"
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {new Date(notif.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.body}</p>

                    <div className="mt-3 flex items-center gap-2.5">
                      <button
                        onClick={() => handleAction(notif)}
                        className={`text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ${
                          notif.isRead
                            ? "bg-white hover:bg-slate-100 border border-slate-200 text-slate-700"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                        }`}
                      >
                        {notif.type === "photo_upload" ? "Review Photo" : "View Details"}
                        <ExternalLink className="w-3 h-3" />
                      </button>

                      {!notif.isRead && (
                        <button
                          onClick={() => markAsRead(notif.id)}
                          className="text-xs font-semibold py-1.5 px-3 rounded-xl flex items-center gap-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
