'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/api';
import { Send, History, Clock, Users, Bell } from 'lucide-react';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('all');
  const [targetUid, setTargetUid] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [message, setMessage] = useState('');

  // Fetch Notification history logs
  const { data, isLoading } = useQuery<{ data: { data: any[] } }>({
    queryKey: ['notification-history'],
    queryFn: async () => {
      const response = await api.get('/notifications/history');
      return response.data;
    },
  });

  const history = data?.data?.data || [];

  // Send Notification Mutation
  const sendMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.post('/notifications/send', payload);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notification-history'] });
      setTitle('');
      setBody('');
      setTargetUid('');
      setScheduledAt('');
      setMessage(data.message || 'Notification processed successfully!');
      setTimeout(() => setMessage(''), 4000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;

    const payload: any = { title, body, audience };
    if (audience === 'specific') payload.targetUid = targetUid;
    if (scheduledAt) payload.scheduledAt = scheduledAt;

    sendMutation.mutate(payload);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Compose Notification panel */}
        <div className="lg:col-span-2 glass p-6 border border-primary/10 rounded-3xl shadow-neon-primary premium-card">
          <div className="pb-4 border-b border-bg-border flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-display text-text-primary">Send Push Notification</h3>
              <p className="text-xs text-text-secondary mt-0.5">Send real-time alerts or target segmentations</p>
            </div>
            <span className="p-1.5 bg-primary/10 text-primary rounded-xl">
              <Bell className="w-5 h-5" />
            </span>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-xs">
            {message && (
              <div className="p-3 bg-success/10 text-success border border-success/15 rounded-xl font-semibold">
                {message}
              </div>
            )}

            <div>
              <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">Target Audience</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'all', label: 'All Users' },
                  { value: 'premium', label: 'Premium' },
                  { value: 'verified', label: 'Verified' },
                  { value: 'specific', label: 'Specific User' },
                ].map((aud) => (
                  <button
                    key={aud.value}
                    type="button"
                    onClick={() => setAudience(aud.value)}
                    className={`py-2 px-3 rounded-xl border font-semibold text-center cursor-pointer transition-all ${
                      audience === aud.value
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-slate-50 border-bg-border text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {aud.label}
                  </button>
                ))}
              </div>
            </div>

            {audience === 'specific' && (
              <div>
                <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">Target User ID (UID)</label>
                <input
                  type="text"
                  required
                  value={targetUid}
                  onChange={(e) => setTargetUid(e.target.value)}
                  placeholder="e.g. fd78asfhjasfy8a..."
                  className="w-full p-2.5 bg-bg-surface border border-bg-border rounded-xl focus:outline-none focus:border-primary text-xs"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">Notification Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Match Found!"
                className="w-full p-2.5 bg-bg-surface border border-bg-border rounded-xl focus:outline-none focus:border-primary text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">Message Body</label>
              <textarea
                rows={3}
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Someone just liked your profile. Check it out now."
                className="w-full p-2.5 bg-bg-surface border border-bg-border rounded-xl focus:outline-none focus:border-primary text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">Schedule Delivery (Optional)</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full p-2.5 bg-bg-surface border border-bg-border rounded-xl focus:outline-none focus:border-primary text-xs text-text-secondary"
              />
            </div>

            <button
              type="submit"
              disabled={sendMutation.isPending}
              className="w-full py-3 bg-gradient-to-r from-primary to-primary-light text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-luxury cursor-pointer disabled:opacity-50"
            >
              {sendMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" /> Send Notification
                </>
              )}
            </button>
          </form>
        </div>

        {/* History log panel */}
        <div className="glass p-6 border border-primary/10 rounded-3xl shadow-neon-primary premium-card flex flex-col h-[500px]">
          <div className="pb-4 border-b border-bg-border flex items-center gap-2">
            <History className="w-5 h-5 text-text-secondary" />
            <div>
              <h3 className="text-base font-bold font-display text-text-primary">Delivery History</h3>
              <p className="text-xs text-text-secondary mt-0.5">Logs of recent platform alerts</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1 text-xs">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 bg-bg-surface rounded-xl shimmer" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <p className="text-text-secondary text-center py-10">No history available.</p>
            ) : (
              history.map((log) => (
                <div key={log.id} className="p-3 bg-bg-surface/40 border border-bg-border rounded-xl">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-text-primary truncate max-w-[70%]">{log.title}</span>
                    <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded-[4px] text-[8px] font-bold uppercase">
                      {log.audience}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-secondary mt-1">{log.body}</p>
                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-bg-border/60 text-[9px] text-text-secondary">
                    <span>Targets: {log.totalTargets || 0}</span>
                    <span>{new Date(log.sentAt).toLocaleDateString()}</span>
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
