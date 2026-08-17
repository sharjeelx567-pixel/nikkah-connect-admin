'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/api';
import {
  Check, X, Shield, ShieldCheck, Eye, ZoomIn, Calendar, Clock,
  Link2, Copy, MessageCircle, Phone, Mail, AlertTriangle, Users, User
} from 'lucide-react';

interface VerificationRequest {
  requestId: string;
  userId: string;
  type: 'identity' | 'full';
  status: string;
  submittedAt: { seconds: number } | null;
  userName: string;
  userEmail: string;
  userPhone: string;
  userPhoto: string;
  userCreatedAt: { seconds: number } | null;
  // Identity
  cnicFrontUrl?: string;
  cnicBackUrl?: string;
  // Full
  paymentStatus?: string;
  paymentAmount?: number;
  availability?: string[];
  availabilityNotes?: string;
  meetingDate?: string;
  meetingTime?: string;
  meetingLink?: string;
}

interface Stats {
  pendingIdentity: number;
  pendingFull: number;
  approvedToday: number;
  rejectedToday: number;
  totalIdentityVerified: number;
}

const formatDate = (ts: { seconds: number } | null) =>
  ts ? new Date(ts.seconds * 1000).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function VerificationPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'identity' | 'full'>('identity');
  const [selectedReq, setSelectedReq] = useState<VerificationRequest | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [schedulingReq, setSchedulingReq] = useState<VerificationRequest | null>(null);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingLink, setMeetingLink] = useState('');

  // Stats
  const { data: statsData } = useQuery<{ data: Stats }>({
    queryKey: ['verification-stats'],
    queryFn: () => api.get('/verification/stats').then(r => r.data),
    refetchInterval: 30000,
  });
  const stats = statsData?.data;

  // Identity Queue
  const { data: identityData, isLoading: identityLoading } = useQuery<{ data: VerificationRequest[] }>({
    queryKey: ['identity-queue'],
    queryFn: () => api.get('/verification/identity/queue').then(r => r.data),
    refetchInterval: 15000, // Auto-refresh every 15 seconds
  });

  // Full Queue
  const { data: fullData, isLoading: fullLoading } = useQuery<{ data: VerificationRequest[] }>({
    queryKey: ['full-queue'],
    queryFn: () => api.get('/verification/full/queue').then(r => r.data),
    refetchInterval: 15000, // Auto-refresh every 15 seconds
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['identity-queue'] });
    queryClient.invalidateQueries({ queryKey: ['full-queue'] });
    queryClient.invalidateQueries({ queryKey: ['verification-stats'] });
    setSelectedReq(null);
    setSchedulingReq(null);
    setRejectReason('');
    setIsRejecting(false);
  };

  const approveMutation = useMutation({
    mutationFn: ({ requestId, type }: { requestId: string; type: string }) =>
      api.patch(`/verification/${type}/${requestId}/approve`),
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: ({ requestId, type, reason }: { requestId: string; type: string; reason: string }) =>
      api.patch(`/verification/${type}/${requestId}/reject`, { reason }),
    onSuccess: invalidate,
  });

  const scheduleMutation = useMutation({
    mutationFn: ({ requestId, date, time, link }: { requestId: string; date: string; time: string; link: string }) =>
      api.patch(`/verification/full/${requestId}/schedule`, { meetingDate: date, meetingTime: time, meetingLink: link }),
    onSuccess: invalidate,
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: (requestId: string) => api.patch(`/verification/full/${requestId}/confirm-payment`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['full-queue'] }),
  });

  const identityQueue = identityData?.data || [];
  const fullQueue = fullData?.data || [];

  const copyWhatsApp = (req: VerificationRequest) => {
    const msg = `Hello ${req.userName},

Your Full Verification meeting has been scheduled.

📅 Date: ${req.meetingDate || meetingDate}
⏰ Time: ${req.meetingTime || meetingTime}
🔗 Meeting Link: ${req.meetingLink || meetingLink}

Please join at the scheduled time. Thank you!

— NikkahConnect Verification Team`;
    navigator.clipboard.writeText(msg);
  };

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Pending Identity', value: stats?.pendingIdentity ?? '—', color: 'text-orange-500', bg: 'bg-orange-500/10', icon: Shield },
          { label: 'Pending Full', value: stats?.pendingFull ?? '—', color: 'text-primary', bg: 'bg-primary/10', icon: ShieldCheck },
          { label: 'Approved', value: stats?.approvedToday ?? '—', color: 'text-success', bg: 'bg-success/10', icon: Check },
          { label: 'Rejected', value: stats?.rejectedToday ?? '—', color: 'text-error', bg: 'bg-error/10', icon: X },
          { label: 'Total Verified', value: stats?.totalIdentityVerified ?? '—', color: 'text-accent', bg: 'bg-accent/10', icon: Users },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="glass p-4 rounded-2xl border border-primary/10 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className={`text-lg font-bold font-display ${color}`}>{value}</p>
              <p className="text-[10px] text-text-secondary">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-2 glass border border-primary/10 rounded-2xl w-max">
        {(['identity', 'full'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === tab
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface/50'
            }`}
          >
            {tab === 'identity' ? <Shield className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            {tab === 'identity' ? 'Identity' : 'Full'} Verification
            {tab === 'identity' && identityQueue.length > 0 && (
              <span className="ml-1 bg-orange-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{identityQueue.length}</span>
            )}
            {tab === 'full' && fullQueue.length > 0 && (
              <span className="ml-1 bg-primary text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{fullQueue.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── IDENTITY TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'identity' && (
        <div>
          {identityLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white/5 rounded-3xl border border-primary/10 shimmer" />)}</div>
          ) : identityQueue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 glass border border-primary/10 rounded-3xl text-center">
              <ShieldCheck className="w-12 h-12 text-success mb-4" />
              <h3 className="text-lg font-bold font-display">Identity Queue Clear</h3>
              <p className="text-sm text-text-secondary mt-1">No pending identity verification requests.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {identityQueue.map((req) => (
                  <motion.div key={req.requestId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                    className="glass p-5 rounded-3xl border border-primary/10 shadow-neon-primary">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                      {/* User info */}
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 overflow-hidden flex-shrink-0">
                          {req.userPhoto
                            ? <img src={req.userPhoto} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><User className="w-6 h-6 text-primary" /></div>}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-text-primary">{req.userName || 'Unknown'}</h4>
                          <p className="text-xs text-text-secondary flex items-center gap-1"><Mail className="w-3 h-3" />{req.userEmail}</p>
                          <p className="text-xs text-text-secondary flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{req.userPhone || 'N/A'}</p>
                          <p className="text-[10px] text-text-tertiary mt-1">Submitted: {formatDate(req.submittedAt)}</p>
                        </div>
                      </div>
                      {/* CNIC previews */}
                      <div className="flex gap-2">
                        {[{ url: req.cnicFrontUrl, label: 'Front' }, { url: req.cnicBackUrl, label: 'Back' }].map(({ url, label }) => (
                          url ? (
                            <div key={label} className="relative group cursor-pointer" onClick={() => setZoomedImage(url)}>
                              <img src={url} alt={`CNIC ${label}`} className="w-20 h-14 object-cover rounded-xl border border-primary/20" />
                              <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                <ZoomIn className="w-5 h-5 text-white" />
                              </div>
                              <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded">{label}</span>
                            </div>
                          ) : (
                            <div key={label} className="w-20 h-14 rounded-xl border border-dashed border-bg-border flex items-center justify-center text-[10px] text-text-tertiary">{label} N/A</div>
                          )
                        ))}
                      </div>
                      {/* Actions */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => setSelectedReq(req)}
                          className="p-2 bg-bg-surface hover:bg-bg-border/60 rounded-xl border border-bg-border transition-all cursor-pointer" title="View">
                          <Eye className="w-4 h-4 text-text-secondary" />
                        </button>
                        <button onClick={() => approveMutation.mutate({ requestId: req.requestId, type: 'identity' })}
                          className="py-2 px-4 bg-success hover:bg-success-dark text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                          <Check className="w-4 h-4" /> Approve
                        </button>
                        <button onClick={() => { setSelectedReq(req); setIsRejecting(true); }}
                          className="py-2 px-4 bg-error/10 hover:bg-error/15 text-error rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-error/15">
                          <X className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* ── FULL VERIFICATION TAB ────────────────────────────────────────── */}
      {activeTab === 'full' && (
        <div>
          {fullLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white/5 rounded-3xl border border-primary/10 shimmer" />)}</div>
          ) : fullQueue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 glass border border-primary/10 rounded-3xl text-center">
              <ShieldCheck className="w-12 h-12 text-success mb-4" />
              <h3 className="text-lg font-bold font-display">Full Verification Queue Clear</h3>
              <p className="text-sm text-text-secondary mt-1">No pending full verification requests.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {fullQueue.map((req) => (
                <div key={req.requestId} className="glass p-5 rounded-3xl border border-primary/10 shadow-neon-primary space-y-4">
                  {/* User + Status row */}
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 overflow-hidden flex-shrink-0">
                        {req.userPhoto
                          ? <img src={req.userPhoto} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><User className="w-6 h-6 text-primary" /></div>}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-text-primary">{req.userName || 'Unknown'}</h4>
                        <p className="text-xs text-text-secondary">{req.userEmail}</p>
                        <p className="text-xs text-text-secondary">{req.userPhone || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Payment badge */}
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${req.paymentStatus === 'confirmed' ? 'bg-success/10 text-success' : 'bg-orange-500/10 text-orange-500'}`}>
                        💳 Payment: {req.paymentStatus === 'confirmed' ? 'Confirmed' : 'Pending'}
                      </span>
                      {/* Status badge */}
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-primary/10 text-primary">
                        {req.status.replace(/_/g, ' ')}
                      </span>
                      {req.paymentStatus !== 'confirmed' && (
                        <button onClick={() => confirmPaymentMutation.mutate(req.requestId)}
                          className="py-1.5 px-3 bg-success/10 hover:bg-success/20 text-success rounded-xl text-[10px] font-bold cursor-pointer border border-success/20">
                          ✓ Confirm Payment
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Availability Notes */}
                  {req.availabilityNotes && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">Availability</p>
                      <p className="text-xs text-text-secondary italic p-3 bg-bg-surface/50 rounded-xl border border-bg-border">"{req.availabilityNotes}"</p>
                    </div>
                  )}

                  {/* Meeting details (if already scheduled) */}
                  {req.meetingDate && (
                    <div className="p-3 bg-bg-surface/50 rounded-2xl border border-bg-border text-xs space-y-1">
                      <p><span className="text-text-secondary">Date:</span> <strong>{req.meetingDate}</strong></p>
                      <p><span className="text-text-secondary">Time:</span> <strong>{req.meetingTime}</strong></p>
                      {req.meetingLink && <p className="truncate"><span className="text-text-secondary">Link:</span> <a href={req.meetingLink} target="_blank" rel="noreferrer" className="text-primary underline">{req.meetingLink}</a></p>}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(req.status === 'waiting_schedule' || req.status === 'payment_pending') && (
                      <button onClick={() => setSchedulingReq(req)}
                        className="py-2 px-4 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                        <Calendar className="w-3.5 h-3.5" /> Schedule Meeting
                      </button>
                    )}
                    {(req.status === 'scheduled' || req.status === 'meeting_done') && (
                      <>
                        <button onClick={() => copyWhatsApp(req)}
                          className="py-2 px-4 bg-green-500/10 hover:bg-green-500/20 text-green-600 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-green-500/20">
                          <MessageCircle className="w-3.5 h-3.5" /> Copy WhatsApp Msg
                        </button>
                        <button onClick={() => approveMutation.mutate({ requestId: req.requestId, type: 'full' })}
                          className="py-2 px-4 bg-success hover:bg-success-dark text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button onClick={() => { setSelectedReq(req); setIsRejecting(true); }}
                          className="py-2 px-4 bg-error/10 hover:bg-error/15 text-error rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-error/15">
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ZOOM MODAL ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-zoom-out"
            onClick={() => setZoomedImage(null)}>
            <motion.img initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
              src={zoomedImage} alt="Document" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── REJECT MODAL ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedReq && isRejecting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-bg-surface rounded-3xl max-w-md w-full p-6 border border-error/20 shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-error" />
                <h3 className="font-bold text-text-primary">Reject Verification</h3>
              </div>
              <p className="text-xs text-text-secondary mb-4">
                User: <strong>{selectedReq.userName}</strong><br />
                Type: <strong className="uppercase">{selectedReq.type}</strong>
              </p>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Rejection Reason *</label>
              <textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why the verification was rejected..."
                className="w-full p-3 bg-bg-surface border border-bg-border rounded-xl text-xs focus:outline-none focus:border-error mb-4" />
              <div className="flex gap-3">
                <button onClick={() => { setIsRejecting(false); setSelectedReq(null); }}
                  className="flex-1 py-2 bg-bg-surface border border-bg-border text-text-secondary rounded-xl text-xs font-semibold cursor-pointer">
                  Cancel
                </button>
                <button
                  disabled={!rejectReason || rejectMutation.isPending}
                  onClick={() => rejectMutation.mutate({ requestId: selectedReq.requestId, type: selectedReq.type, reason: rejectReason })}
                  className="flex-1 py-2 bg-error hover:bg-error-dark text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer">
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SCHEDULE MEETING MODAL ───────────────────────────────────────── */}
      <AnimatePresence>
        {schedulingReq && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-bg-surface rounded-3xl max-w-lg w-full p-6 border border-primary/20 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-text-primary flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" /> Schedule Meeting
                </h3>
                <button onClick={() => setSchedulingReq(null)} className="p-1.5 hover:bg-bg-border rounded-xl cursor-pointer">
                  <X className="w-4 h-4 text-text-secondary" />
                </button>
              </div>
              <p className="text-xs text-text-secondary mb-4">
                Scheduling for: <strong>{schedulingReq.userName}</strong>
              </p>

              {/* Availability reminder */}
              {schedulingReq.availabilityNotes && (
                <div className="mb-4 p-3 bg-primary/5 border border-primary/15 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">User Availability</p>
                  <p className="text-xs text-text-secondary italic">"{schedulingReq.availabilityNotes}"</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Meeting Date *</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-text-secondary" />
                    <input type="text" placeholder="e.g. Saturday, 19 July 2025" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)}
                      className="flex-1 px-3 py-2 bg-bg-surface border border-bg-border rounded-xl text-xs focus:outline-none focus:border-primary" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Meeting Time *</label>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-text-secondary" />
                    <input type="text" placeholder="e.g. 9:30 PM" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)}
                      className="flex-1 px-3 py-2 bg-bg-surface border border-bg-border rounded-xl text-xs focus:outline-none focus:border-primary" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Meeting Link *</label>
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-text-secondary" />
                    <input type="url" placeholder="https://meet.google.com/..." value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)}
                      className="flex-1 px-3 py-2 bg-bg-surface border border-bg-border rounded-xl text-xs focus:outline-none focus:border-primary" />
                  </div>
                </div>
              </div>

              {/* WhatsApp message preview */}
              {meetingDate && meetingTime && meetingLink && (
                <div className="mt-4 p-3 bg-green-500/5 border border-green-500/20 rounded-2xl">
                  <p className="text-[10px] font-bold text-green-600 mb-2 uppercase tracking-wider">📱 WhatsApp Message Preview</p>
                  <p className="text-xs text-text-secondary whitespace-pre-line leading-relaxed">
{`Hello ${schedulingReq.userName},

Your Full Verification meeting has been scheduled.

📅 Date: ${meetingDate}
⏰ Time: ${meetingTime}
🔗 Meeting Link: ${meetingLink}

Please join at the scheduled time. Thank you!

— NikkahConnect Verification Team`}
                  </p>
                  <button onClick={() => copyWhatsApp({ ...schedulingReq, meetingDate, meetingTime, meetingLink })}
                    className="mt-2 flex items-center gap-1.5 text-green-600 text-[10px] font-bold cursor-pointer hover:underline">
                    <Copy className="w-3 h-3" /> Copy Message
                  </button>
                </div>
              )}

              <div className="flex gap-3 mt-5">
                <button onClick={() => setSchedulingReq(null)}
                  className="flex-1 py-2.5 bg-bg-surface border border-bg-border text-text-secondary rounded-xl text-xs font-semibold cursor-pointer">
                  Cancel
                </button>
                <button
                  disabled={!meetingDate || !meetingTime || !meetingLink || scheduleMutation.isPending}
                  onClick={() => scheduleMutation.mutate({ requestId: schedulingReq.requestId, date: meetingDate, time: meetingTime, link: meetingLink })}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Schedule & Notify User
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
