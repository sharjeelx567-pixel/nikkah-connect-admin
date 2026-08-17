'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/api';
import { Report } from '../../../types';
import { ShieldCheck, Eye, Trash2, XCircle, AlertTriangle } from 'lucide-react';

export default function ReportsPage() {
  const queryClient = useQueryClient();

  // Fetch reports list
  const { data, isLoading } = useQuery<{ data: { data: Report[] } }>({
    queryKey: ['reports-list'],
    queryFn: async () => {
      const response = await api.get('/reports');
      return response.data;
    },
  });

  const reports = data?.data?.data || [];

  // Resolve Mutation
  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/reports/${id}/resolve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats-badges'] });
    },
  });

  // Dismiss Mutation
  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/reports/${id}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats-badges'] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 bg-white/5 rounded-3xl border border-primary/10 shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-text-secondary mt-1">
            Investigate flagged behaviors, user complaints, and profile harassment reports.
          </p>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 glass border border-primary/10 rounded-3xl text-center shadow-neon-primary">
          <div className="w-16 h-16 bg-success/15 rounded-full flex items-center justify-center text-success mb-4 shadow-neon-primary">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold font-display text-text-primary">Reports Queue Empty</h3>
          <p className="text-sm text-text-secondary mt-1">
            Zero pending reports. The platform is running smoothly.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {reports.map((report) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={report.id}
                className="glass p-6 rounded-3xl border border-primary/10 shadow-neon-primary premium-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-error/10 text-error flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-text-primary">Report ID: #{report.id?.slice(0, 8)}</h4>
                    <p className="text-xs text-text-secondary mt-1">
                      Reporter UID: <span className="font-semibold text-text-primary">{report.reporterId?.slice(0, 10)}...</span>
                    </p>
                    <p className="text-xs text-text-secondary">
                      Reported Profile UID: <span className="font-semibold text-text-primary">{report.reportedUserId?.slice(0, 10)}...</span>
                    </p>
                    <div className="mt-3 p-3 bg-bg-surface/50 border border-bg-border rounded-2xl text-xs text-text-primary">
                      <span className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Reason Description</span>
                      "{report.reason}" {report.description && `— ${report.description}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto self-end md:self-center">
                  {report.status?.toLowerCase() === 'open' ? (
                    <>
                      <button
                        onClick={() => resolveMutation.mutate(report.id)}
                        className="flex-1 md:flex-initial py-2 px-4 bg-success hover:bg-success-dark text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      >
                        <ShieldCheck className="w-4 h-4" /> Resolve
                      </button>
                      <button
                        onClick={() => dismissMutation.mutate(report.id)}
                        className="flex-1 md:flex-initial py-2 px-4 bg-bg-surface hover:bg-bg-border/60 text-text-primary rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-bg-border"
                      >
                        <XCircle className="w-4 h-4" /> Dismiss
                      </button>
                    </>
                  ) : (
                    <span className="px-3 py-1 bg-bg-surface text-text-secondary border border-bg-border rounded-xl text-xs font-semibold uppercase tracking-wider">
                      Status: {report.status}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

