'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/api';
import { NikkahUser } from '../../../types';
import { Search, Ban, CheckCircle, ShieldAlert, Award, Calendar, MoreVertical, X, Sparkles, UserX, UserCheck, Sliders, Mail, Phone } from 'lucide-react';

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

  const [users, setUsers] = useState<NikkahUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Users List using real-time Firestore stream
  React.useEffect(() => {
    import('firebase/firestore').then(({ collection, query, orderBy, onSnapshot, limit }) => {
      import('../../../config/firebase').then(({ db }) => {
        const q = query(collection(db, 'users'), limit(1000));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const fetchedUsers: NikkahUser[] = [];
          snapshot.forEach((doc) => {
            fetchedUsers.push({ uid: doc.id, ...doc.data() } as NikkahUser);
          });
          
          // Fix 8: Sort locally so we don't accidentally exclude users missing createdAt
          fetchedUsers.sort((a, b) => {
            const dateA = (a.createdAt as any)?.toDate?.()?.getTime() || (a.createdAt as any)?.seconds ? (a.createdAt as any).seconds * 1000 : 0;
            const dateB = (b.createdAt as any)?.toDate?.()?.getTime() || (b.createdAt as any)?.seconds ? (b.createdAt as any).seconds * 1000 : 0;
            return dateB - dateA;
          });
          
          setUsers(fetchedUsers);
          setIsLoading(false);
        }, (error) => {
          console.error("Error fetching users stream:", error);
          setIsLoading(false);
        });
        return () => unsubscribe();
      });
    });
  }, []);

  // Local filtering and pagination
  const filteredUsers = React.useMemo(() => {
    let result = users;

    // Search filter
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(u => 
        (u.displayName?.toLowerCase().includes(s)) ||
        (u.email?.toLowerCase().includes(s)) ||
        (u.city?.toLowerCase().includes(s))
      );
    }

    // Status filter
    if (filter !== 'all') {
      result = result.filter(u => {
        switch (filter) {
          case 'premium': return u.isPremium;
          case 'banned': return u.isBanned;
          case 'suspended': return u.isSuspended;
          case 'pending_photo': return u.photoStatus === 'pending';
          case 'pending_verification': return u.verificationStatus === 'pending';
          default: return true;
        }
      });
    }

    return result;
  }, [users, search, filter]);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const pagination = {
    total: filteredUsers.length,
    totalPages: totalPages === 0 ? 1 : totalPages
  };

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
      ) : paginatedUsers.length === 0 ? (
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
                <th className="p-4">
                  <div className="flex items-center gap-1 group relative">
                    <span>ID Verification</span>
                    {/* Fix 7: Tooltip explaining what Verified means */}
                    <span className="cursor-help text-primary/60 text-[11px]">â“˜</span>
                    <div className="absolute top-5 left-0 z-20 hidden group-hover:block w-56 p-2 bg-bg-surface border border-bg-border rounded-xl shadow-xl text-[10px] normal-case tracking-normal text-text-secondary font-normal">
                      &quot;Verified&quot; means the user submitted a government-issued CNIC or Passport photo that was approved in the Verification Center. It does NOT mean email/phone verified.
                    </div>
                  </div>
                </th>
                <th className="p-4">Premium</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border/60 text-xs">
              {paginatedUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-bg-surface/35 transition-colors">
                  <td className="p-4 pl-6 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-primary">
                      {(user.profileImage || user.pendingProfileImage) ? (
                        <img src={user.profileImage || user.pendingProfileImage} alt="" className="w-full h-full object-cover" />
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
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span className="font-medium text-slate-700 text-[11px]">{user.email || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span className="text-[11px] text-slate-500">{user.phoneNumber || 'No phone number'}</span>
                      </div>
                    </div>
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
              className="fixed top-0 right-0 h-screen w-[480px] bg-white/95 backdrop-blur-2xl z-50 shadow-[-20px_0_40px_rgba(0,0,0,0.05)] border-l border-slate-200/60 flex flex-col justify-between"
            >
              {/* Drawer Header */}
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-50 pointer-events-none" />
                <div className="relative z-10">
                  <h3 className="text-xl font-bold font-display text-slate-900 tracking-tight">Member Console</h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/80" />
                    UID: {selectedUser.uid.slice(0, 12)}...
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setIsBanning(false);
                    setIsSuspending(false);
                  }}
                  className="relative z-10 p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 border border-slate-200 transition-all cursor-pointer shadow-sm"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Details Scroll content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {/* Profile Header Card */}
                <div className="flex items-center gap-5 p-5 bg-slate-50/80 border border-slate-100 rounded-3xl shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[40px] pointer-events-none" />
                  
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary p-[1px] shadow-[0_0_20px_rgba(108,71,255,0.15)]">
                    <div className="w-full h-full bg-white rounded-[15px] overflow-hidden flex items-center justify-center font-bold text-xl text-primary">
                      {(selectedUser.profileImage || selectedUser.pendingProfileImage) ? (
                        <img src={selectedUser.profileImage || selectedUser.pendingProfileImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        selectedUser.displayName?.charAt(0) || 'U'
                      )}
                    </div>
                  </div>
                  <div className="relative z-10 w-full overflow-hidden">
                    <h4 className="font-bold text-slate-900 text-lg tracking-tight">{selectedUser.displayName}</h4>
                    <div className="flex flex-col gap-1 mt-1">
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 truncate">
                        <Mail className="w-3 h-3 flex-shrink-0" /> {selectedUser.email || 'N/A'}
                      </p>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 truncate">
                        <Phone className="w-3 h-3 flex-shrink-0" /> {selectedUser.phoneNumber || 'No phone number'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Pills */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl relative overflow-hidden group hover:border-slate-200 transition-colors shadow-sm">
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-secondary opacity-50 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Verification Badge</span>
                    <p className="mt-2 font-bold flex items-center gap-1.5 text-slate-800 text-sm">
                      {selectedUser.isVerified ? (
                        <><CheckCircle className="w-4 h-4 text-success" /> Verified</>
                      ) : (
                        <><X className="w-4 h-4 text-slate-400" /> Not Verified</>
                      )}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl relative overflow-hidden group hover:border-slate-200 transition-colors shadow-sm">
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-400 to-amber-600 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Premium Account</span>
                    <p className="mt-2 font-bold flex items-center gap-1.5 text-slate-800 text-sm">
                      {selectedUser.isPremium ? (
                        <><Sparkles className="w-4 h-4 text-amber-500" /> Active</>
                      ) : (
                        <span className="text-slate-500">Free Subscription</span>
                      )}
                    </p>
                  </div>
                </div>

                                  {/* Gallery Images (Approved) */}
                  {selectedUser.galleryImages && selectedUser.galleryImages.length > 0 && (
                    <div className="pt-6 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-3 block">Approved Gallery</span>
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {selectedUser.galleryImages.map((img: string, idx: number) => (
                          <div key={idx} className="w-20 h-24 flex-shrink-0 rounded-xl overflow-hidden border border-slate-200 shadow-sm relative group cursor-pointer">
                            <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Operations Actions forms */}
                <div className="space-y-5 pt-8 border-t border-slate-100">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5" /> Administrative Actions
                  </h4>

                  {/* Immediate Action Buttons */}
                  {!isBanning && !isSuspending ? (
                    <div className="grid grid-cols-2 gap-3">
                      {selectedUser.isBanned ? (
                        <button
                          onClick={() => unbanMutation.mutate(selectedUser.uid)}
                          className="py-3 px-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-600 rounded-2xl text-[13px] font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                        >
                          <UserCheck className="w-4.5 h-4.5" /> Lift Ban
                        </button>
                      ) : (
                        <button
                          onClick={() => setIsBanning(true)}
                          className="py-3 px-4 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-2xl text-[13px] font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Ban className="w-4.5 h-4.5" /> Ban Profile
                        </button>
                      )}
                      <button
                        onClick={() => setIsSuspending(true)}
                        disabled={selectedUser.isBanned}
                        className="py-3 px-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-600 rounded-2xl text-[13px] font-bold transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                      >
                        <Calendar className="w-4.5 h-4.5" /> Suspend
                      </button>
                      <button
                        onClick={() => premiumMutation.mutate({ uid: selectedUser.uid, days: 30 })}
                        disabled={selectedUser.isPremium || selectedUser.isBanned}
                        className="py-3.5 px-4 bg-gradient-to-r from-primary to-secondary hover:from-primary-dark hover:to-primary border border-primary/20 text-white shadow-luxury rounded-2xl text-[13px] font-bold transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 col-span-2 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:border-slate-200 disabled:shadow-none"
                      >
                        <Award className="w-4.5 h-4.5" /> Grant 30 Days Premium
                      </button>
                    </div>
                  ) : isBanning ? (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-5 border border-red-200 bg-red-50 rounded-3xl space-y-4 shadow-sm">
                      <h5 className="text-[13px] font-bold text-red-600 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4" /> Confirm Profile Ban
                      </h5>
                      <textarea
                        rows={2}
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                        placeholder="State reason for permanent user ban..."
                        className="w-full p-3.5 bg-white border border-red-200 rounded-2xl text-[13px] font-medium focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 text-slate-900 placeholder-slate-400 transition-all resize-none shadow-sm"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => setIsBanning(false)}
                          className="flex-1 py-2.5 bg-white border border-slate-200 text-[13px] rounded-xl font-bold cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => banMutation.mutate({ uid: selectedUser.uid, reason: banReason })}
                          className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 shadow-[0_0_15px_rgba(220,38,38,0.2)] text-white text-[13px] rounded-xl font-bold cursor-pointer transition-all"
                        >
                          Confirm Ban
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-5 border border-amber-200 bg-amber-50 rounded-3xl space-y-4 shadow-sm">
                      <h5 className="text-[13px] font-bold text-amber-600 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Temporary Suspension
                      </h5>
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Duration</label>
                          <select
                            value={suspendDays}
                            onChange={(e) => setSuspendDays(e.target.value)}
                            className="w-full mt-1.5 p-3 bg-white border border-amber-200 rounded-xl text-[13px] font-medium focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-slate-900 transition-all appearance-none cursor-pointer shadow-sm"
                          >
                            <option value="3">3 Days Penalty</option>
                            <option value="7">7 Days Penalty</option>
                            <option value="14">14 Days Penalty</option>
                            <option value="30">30 Days Penalty</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Reason</label>
                          <input
                            type="text"
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            placeholder="e.g. Inappropriate conduct"
                            className="w-full mt-1.5 p-3 bg-white border border-amber-200 rounded-xl text-[13px] font-medium focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-slate-900 placeholder-slate-400 transition-all shadow-sm"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => setIsSuspending(false)}
                          className="flex-1 py-2.5 bg-white border border-slate-200 text-[13px] rounded-xl font-bold cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => suspendMutation.mutate({ uid: selectedUser.uid, reason: banReason, days: Number(suspendDays) })}
                          className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.3)] text-white text-[13px] rounded-xl font-bold cursor-pointer transition-all"
                        >
                          Enforce
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="p-8 border-t border-red-100 bg-red-50/50 space-y-4">
                <h4 className="text-[11px] font-bold text-red-600 uppercase tracking-widest flex items-center gap-2">
                  <UserX className="w-3.5 h-3.5" /> Danger Zone
                </h4>
                <button
                  onClick={() => {
                    if (confirm('Are you absolutely sure you want to permanently delete this user? This cannot be undone.')) {
                      deleteMutation.mutate(selectedUser.uid);
                    }
                  }}
                  className="w-full py-3.5 bg-white border border-red-200 hover:border-red-300 hover:bg-red-50 text-red-600 font-bold text-[13px] rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  Delete Account Permanently
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}




