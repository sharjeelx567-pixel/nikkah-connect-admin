'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/api';
import { NikkahUser } from '../../../types';
import { Check, X, Shield, FileText, Video, Eye, ArrowUpRight, ShieldCheck, RefreshCw } from 'lucide-react';

export default function VerificationPage() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<NikkahUser | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Fetch pending verification reviews
  const { data, isLoading } = useQuery<{ data: NikkahUser[] }>({
    queryKey: ['pending-verifications'],
    queryFn: async () => {
      const response = await api.get('/verification/pending');
      return response.data;
    },
  });

  const pending = data?.data || [];

  // Approve Verification Mutation
  const approveMutation = useMutation({
    mutationFn: async (uid: string) => {
      await api.patch(`/verification/${uid}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats-badges'] });
      setSelectedUser(null);
    },
  });

  // Reject Verification Mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ uid, reason }: { uid: string; reason: string }) => {
      await api.patch(`/verification/${uid}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats-badges'] });
      setSelectedUser(null);
      setRejectReason('');
      setIsRejecting(false);
    },
  });

  // Request new submission
  const requestMutation = useMutation({
    mutationFn: async ({ uid, reason }: { uid: string; reason: string }) => {
      await api.patch(`/verification/${uid}/request-new`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats-badges'] });
      setSelectedUser(null);
      setRejectReason('');
      setIsRejecting(false);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-white/5 rounded-3xl border border-primary/10 shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-text-secondary mt-1">
            Review identity documents and live video verification files submitted by users to verify their profile badges.
          </p>
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 glass border border-primary/10 rounded-3xl text-center shadow-neon-primary">
          <div className="w-16 h-16 bg-success/15 rounded-full flex items-center justify-center text-success mb-4 shadow-neon-primary">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold font-display text-text-primary">Verification Queue Empty</h3>
          <p className="text-sm text-text-secondary mt-1">
            There are no pending identity documents or video uploads to verify.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {pending.map((user) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={user.uid}
                className="glass p-6 rounded-3xl border border-primary/10 shadow-neon-primary premium-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {user.verificationDocType === 'video' ? <Video className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-text-primary">{user.displayName || 'Unnamed User'}</h4>
                    <p className="text-xs text-text-secondary">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2.5 py-0.5 bg-bg-surface text-text-secondary border border-bg-border rounded text-[10px] font-semibold uppercase tracking-wider">
                        Doc Type: {user.verificationDocType || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="flex-1 md:flex-initial py-2 px-4 bg-bg-surface hover:bg-bg-border/60 text-text-primary rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-bg-border"
                  >
                    <Eye className="w-4 h-4" /> View Docs
                  </button>
                  <button
                    onClick={() => approveMutation.mutate(user.uid)}
                    className="flex-1 md:flex-initial py-2 px-4 bg-success hover:bg-success-dark text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Check className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setIsRejecting(true);
                    }}
                    className="flex-1 md:flex-initial py-2 px-4 bg-error/10 hover:bg-error/15 text-error rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-error/10"
                  >
                    <X className="w-4 h-4" /> Reject
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Review Modal dialog */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-bg-surface rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-primary/10 flex flex-col md:flex-row max-h-[90vh]"
            >
              {/* Left preview section */}
              <div className="md:w-3/5 bg-black flex items-center justify-center relative p-2 min-h-[300px] md:min-h-0">
                {selectedUser.verificationDocType === 'video' ? (
                  selectedUser.verificationVideoUrl ? (
                    <video src={selectedUser.verificationVideoUrl} controls className="w-full h-full max-h-[70vh] object-contain" />
                  ) : (
                    <div className="text-white text-xs">No video verification file uploaded.</div>
                  )
                ) : selectedUser.verificationDocUrl ? (
                  <img src={selectedUser.verificationDocUrl} alt="KYC Document Preview" className="w-full h-full max-h-[70vh] object-contain" />
                ) : (
                  <div className="text-white text-xs">No document image file uploaded.</div>
                )}
              </div>

              {/* Right panel instructions */}
              <div className="md:w-2/5 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold font-display text-text-primary flex items-center gap-1.5">
                      <Shield className="w-5 h-5 text-primary" /> Identity Review
                    </h3>
                    <button
                      onClick={() => {
                        setSelectedUser(null);
                        setIsRejecting(false);
                      }}
                      className="p-1.5 hover:bg-bg-surface rounded-xl text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mt-6 space-y-4 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Submitted By</span>
                      <p className="text-sm font-bold text-text-primary mt-0.5">{selectedUser.displayName}</p>
                      <p className="text-text-secondary">{selectedUser.email}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary font-display">Document class</span>
                      <p className="text-xs font-semibold text-text-primary mt-0.5 uppercase">{selectedUser.verificationDocType}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  {!isRejecting ? (
                    <>
                      <button
                        onClick={() => approveMutation.mutate(selectedUser.uid)}
                        className="w-full py-3 bg-success hover:bg-success-dark text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Check className="w-4 h-4" /> Approve Identity
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsRejecting(true)}
                          className="flex-1 py-3 bg-error/10 hover:bg-error/15 text-error rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-error/10"
                        >
                          <X className="w-4 h-4" /> Reject Identity
                        </button>
                        <button
                          onClick={() => requestMutation.mutate({ uid: selectedUser.uid, reason: 'Please upload a clearer identity scan.' })}
                          className="flex-1 py-3 bg-primary/10 hover:bg-primary/15 text-primary rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-primary/15"
                        >
                          <RefreshCw className="w-4 h-4" /> Request New
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">
                          Rejection Reason details
                        </label>
                        <textarea
                          rows={3}
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Explain why the identity verification was rejected..."
                          className="w-full p-3 bg-bg-surface border border-bg-border rounded-xl text-xs focus:outline-none focus:border-error"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsRejecting(false)}
                          className="flex-1 py-2 bg-bg-surface hover:bg-bg-border/60 text-text-secondary rounded-xl font-semibold text-xs border border-bg-border cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate({ uid: selectedUser.uid, reason: rejectReason })}
                          disabled={!rejectReason}
                          className="flex-1 py-2 bg-error hover:bg-error-dark text-white rounded-xl font-semibold text-xs disabled:opacity-50 cursor-pointer"
                        >
                          Confirm Rejection
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
