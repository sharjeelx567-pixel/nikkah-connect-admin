'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/api';
import { NikkahUser } from '../../../types';
import { Search, Ban, CheckCircle, ShieldAlert, Award, Calendar, MoreVertical, X, Sparkles, UserX, UserCheck } from 'lucide-react';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<NikkahUser | null>(null);
  
  // Ban/Suspend prompt controls
  const [banReason, setBanReason] = useState('');
  const [suspendDays, setSuspendDays] = useState('7');
  const [isBanning, setIsBanning] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);

  // Fetch Users List
  const { data, isLoading } = useQuery<{ data: { data: NikkahUser[], pagination: { total: number, totalPages: number } } }>({
    queryKey: ['users-list', search, filter, page],
    queryFn: async () => {
      const response = await api.get('/users', {
        params: { search, filter, page, limit: 10 },
      });
      return response.data;
    },
  });

  const users = data?.data?.data || [];
  const pagination = data?.data?.pagination;

  // Actions Mutations
  const banMutation = useMutation({
    mutationFn: async ({ uid, reason }: { uid: string; reason: string }) => {
      await api.post(`/users/${uid}/ban`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setIsBanning(false);
      setBanReason('');
      setSelectedUser(null);
    },
  });

  const unbanMutation = useMutation({
    mutationFn: async (uid: string) => {
      await api.post(`/users/${uid}/unban`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setSelectedUser(null);
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ uid, reason, days }: { uid: string; reason: string; days: number }) => {
      await api.post(`/users/${uid}/suspend`, { reason, days });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setIsSuspending(false);
      setBanReason('');
      setSelectedUser(null);
    },
  });

  const premiumMutation = useMutation({
    mutationFn: async ({ uid, days }: { uid: string; days: number }) => {
      await api.post(`/users/${uid}/premium`, { expiresInDays: days });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setSelectedUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (uid: string) => {
      await api.delete(`/users/${uid}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setSelectedUser(null);
    },
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset page to 1
  };

  const handleFilterChange = (val: string) => {
    setFilter(val);
    setPage(1); // Reset page to 1
  };

  const getStatusBadge = (user: NikkahUser) => {
    if (user.isBanned) return <span className="px-2.5 py-1 bg-error/10 text-error rounded-full text-[10px] font-bold">Banned</span>;
    if (user.isSuspended) return <span className="px-2.5 py-1 bg-warning/10 text-amber-600 rounded-full text-[10px] font-bold">Suspended</span>;
    return <span className="px-2.5 py-1 bg-success/10 text-success rounded-full text-[10px] font-bold">Active</span>;
  };

  return (
    <div className="space-y-6">
      {/* Filtering and search bars */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center glass p-4 border border-primary/10 rounded-3xl shadow-neon-primary">
        <div className="flex flex-wrap gap-2">
          {['all', 'premium', 'banned', 'suspended', 'pending_photo', 'pending_verification'].map((tab) => (
            <button
              key={tab}
              onClick={() => handleFilterChange(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                filter === tab
                  ? 'bg-primary text-white shadow-luxury'
                  : 'bg-bg-surface text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 inset-y-0 my-auto w-4.5 h-4.5 text-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Search by name, email, city..."
            className="w-full pl-10 pr-4 py-2.5 bg-bg-surface border border-bg-border rounded-2xl text-xs text-text-primary focus:outline-none focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Users table */}
      {isLoading ? (
        <div className="h-96 bg-white/5 border border-primary/10 rounded-3xl shimmer" />
      ) : users.length === 0 ? (
        <div className="text-center py-20 glass border border-primary/10 rounded-3xl shadow-neon-primary">
          <p className="text-sm text-text-secondary">No matching members found.</p>
        </div>
      ) : (
        <div className="glass border border-primary/10 rounded-3xl shadow-neon-primary overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-bg-surface border-b border-bg-border text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                <th className="p-4 pl-6">Profile</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Verification</th>
                <th className="p-4">Premium</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border/60 text-xs">
              {users.map((user) => (
                <tr key={user.uid} className="hover:bg-bg-surface/35 transition-colors">
                  <td className="p-4 pl-6 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-primary">
                      {user.profileImage ? (
                        <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        user.displayName?.charAt(0) || 'U'
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-text-primary">{user.displayName || 'Unnamed User'}</h4>
                      <p className="text-[10px] text-text-secondary">{user.gender} • {user.city}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-text-primary">{user.email || 'N/A'}</p>
                    <p className="text-[10px] text-text-secondary">{user.phoneNumber || 'No phone number'}</p>
                  </td>
                  <td className="p-4">
                    {user.isVerified ? (
                      <span className="inline-flex items-center gap-1 text-success font-semibold text-[10px]">
                        <CheckCircle className="w-3.5 h-3.5" /> Verified
                      </span>
                    ) : user.verificationStatus === 'pending' ? (
                      <span className="px-2 py-0.5 bg-secondary/10 text-secondary rounded text-[9px] font-bold">Review Needed</span>
                    ) : (
                      <span className="text-text-secondary text-[10px]">Not verified</span>
                    )}
                  </td>
                  <td className="p-4">
                    {user.isPremium ? (
                      <span className="inline-flex items-center gap-1 text-accent-dark font-semibold text-[10px]">
                        <Sparkles className="w-3.5 h-3.5 text-accent-dark fill-accent-dark" /> Premium
                      </span>
                    ) : (
                      <span className="text-text-secondary text-[10px]">Free tier</span>
                    )}
                  </td>
                  <td className="p-4">{getStatusBadge(user)}</td>
                  <td className="p-4 pr-6 text-right">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="py-1.5 px-3 hover:bg-bg-surface border border-bg-border rounded-xl text-[10px] font-semibold text-text-primary transition-all cursor-pointer"
                    >
                      View Console
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="p-4 border-t border-bg-border bg-bg-surface/10 flex items-center justify-between">
              <span className="text-[10px] text-text-secondary font-medium">
                Showing Page {page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 bg-white/5 border border-primary/10 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 text-text-primary hover:bg-white/10"
                >
                  Previous
                </button>
                <button
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 bg-white/5 border border-primary/10 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 text-text-primary hover:bg-white/10"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Slideout drawer panel */}
      <AnimatePresence>
        {selectedUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedUser(null);
                setIsBanning(false);
                setIsSuspending(false);
              }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 170 }}
              className="fixed top-0 right-0 h-screen w-[480px] bg-bg-surface z-50 shadow-2xl border-l border-primary/10 flex flex-col justify-between"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-bg-border flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold font-display text-text-primary">Member Console</h3>
                  <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">UID: {selectedUser.uid.slice(0, 12)}...</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setIsBanning(false);
                    setIsSuspending(false);
                  }}
                  className="p-1.5 hover:bg-bg-surface rounded-xl text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Details Scroll content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex items-center gap-4 p-4 bg-bg-surface/50 border border-bg-border rounded-2xl">
                  <div className="w-14 h-14 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center font-bold text-lg text-primary">
                    {selectedUser.profileImage ? (
                      <img src={selectedUser.profileImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      selectedUser.displayName?.charAt(0) || 'U'
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-text-primary text-base">{selectedUser.displayName}</h4>
                    <p className="text-xs text-text-secondary">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 border border-bg-border rounded-xl">
                    <span className="text-[10px] text-text-secondary uppercase font-semibold">Verification badge</span>
                    <p className="mt-1 font-semibold flex items-center gap-1">
                      {selectedUser.isVerified ? 'VERIFIED' : 'NOT VERIFIED'}
                    </p>
                  </div>
                  <div className="p-3 border border-bg-border rounded-xl">
                    <span className="text-[10px] text-text-secondary uppercase font-semibold">Premium Account</span>
                    <p className="mt-1 font-semibold">
                      {selectedUser.isPremium ? 'PREMIUM (ACTIVE)' : 'FREE SUBSCRIPTION'}
                    </p>
                  </div>
                </div>

                {/* Operations Actions forms */}
                <div className="space-y-4 pt-4 border-t border-bg-border">
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Administrative Actions</h4>

                  {/* Immediate Action Buttons */}
                  {!isBanning && !isSuspending ? (
                    <div className="grid grid-cols-2 gap-2">
                      {selectedUser.isBanned ? (
                        <button
                          onClick={() => unbanMutation.mutate(selectedUser.uid)}
                          className="py-2.5 px-3 bg-success/10 hover:bg-success/15 border border-success/10 text-success rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <UserCheck className="w-4 h-4" /> Lift Ban
                        </button>
                      ) : (
                        <button
                          onClick={() => setIsBanning(true)}
                          className="py-2.5 px-3 bg-error/10 hover:bg-error/15 border border-error/10 text-error rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Ban className="w-4 h-4" /> Ban Profile
                        </button>
                      )}
                      <button
                        onClick={() => setIsSuspending(true)}
                        disabled={selectedUser.isBanned}
                        className="py-2.5 px-3 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/10 text-amber-600 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <Calendar className="w-4 h-4" /> Suspend
                      </button>
                      <button
                        onClick={() => premiumMutation.mutate({ uid: selectedUser.uid, days: 30 })}
                        disabled={selectedUser.isPremium || selectedUser.isBanned}
                        className="py-2.5 px-3 bg-primary/10 hover:bg-primary/15 border border-primary/10 text-primary rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50 col-span-2"
                      >
                        <Award className="w-4 h-4" /> Grant 30 Days Premium
                      </button>
                    </div>
                  ) : isBanning ? (
                    <div className="p-4 border border-error/20 bg-error/5 rounded-2xl space-y-3">
                      <h5 className="text-xs font-bold text-error">Confirm Profile Ban</h5>
                      <textarea
                        rows={2}
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                        placeholder="State reason for permanent user ban..."
                        className="w-full p-2.5 bg-white/5 border border-primary/15 rounded-xl text-xs focus:outline-none focus:border-error text-text-primary placeholder:text-text-secondary"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsBanning(false)}
                          className="flex-1 py-1.5 bg-white/5 border border-primary/10 text-xs rounded-xl font-medium cursor-pointer text-text-primary hover:bg-white/10"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => banMutation.mutate({ uid: selectedUser.uid, reason: banReason })}
                          className="flex-1 py-1.5 bg-error text-white text-xs rounded-xl font-semibold cursor-pointer"
                        >
                          Confirm Ban
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border border-amber-500/20 bg-amber-500/5 rounded-2xl space-y-3">
                      <h5 className="text-xs font-bold text-amber-600">Temporary Account Suspension</h5>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-[10px] font-semibold text-text-secondary uppercase">Suspension (Days)</label>
                          <select
                            value={suspendDays}
                            onChange={(e) => setSuspendDays(e.target.value)}
                            className="w-full mt-1 p-2 bg-bg-surface border border-primary/10 rounded-xl text-xs focus:outline-none text-text-primary"
                          >
                            <option value="3">3 Days</option>
                            <option value="7">7 Days</option>
                            <option value="14">14 Days</option>
                            <option value="30">30 Days</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-semibold text-text-secondary uppercase">Reason</label>
                          <input
                            type="text"
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            placeholder="e.g. Inappropriate bio text"
                            className="w-full mt-1 p-2 bg-white/5 border border-primary/10 rounded-xl text-xs focus:outline-none text-text-primary placeholder:text-text-secondary"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => setIsSuspending(false)}
                          className="flex-1 py-1.5 bg-white/5 border border-primary/10 text-xs rounded-xl font-medium cursor-pointer text-text-primary hover:bg-white/10"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => suspendMutation.mutate({ uid: selectedUser.uid, reason: banReason, days: Number(suspendDays) })}
                          className="flex-1 py-1.5 bg-amber-500 text-white text-xs rounded-xl font-semibold cursor-pointer"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="p-6 border-t border-bg-border bg-bg-surface/20 space-y-3">
                <h4 className="text-[10px] font-bold text-error uppercase tracking-wider">Danger Zone</h4>
                <button
                  onClick={() => {
                    if (confirm('Are you absolutely sure you want to permanently delete this user? This cannot be undone.')) {
                      deleteMutation.mutate(selectedUser.uid);
                    }
                  }}
                  className="w-full py-2.5 bg-error text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-error-dark cursor-pointer"
                >
                  <UserX className="w-4 h-4" /> Delete Account Permanently
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
