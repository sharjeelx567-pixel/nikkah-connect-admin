'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/api';
import { Admin, AdminRole } from '../../../types';
import { ShieldCheck, Plus, Search, MoreVertical, Edit2, Trash2, Power, PowerOff, Key } from 'lucide-react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import app from '../../../config/firebase';

export default function AdminsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(''), 4000);
  };
  
  // New Admin Form State
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<AdminRole>('admin');

  const roles: AdminRole[] = [
    'super_admin', 'admin', 'moderator', 'support_agent', 
    'verification_officer', 'content_manager', 'finance_manager'
  ];

  const { data, isLoading } = useQuery<{ data: Admin[] }>({
    queryKey: ['admins-list'],
    queryFn: async () => {
      const response = await api.get('/admins');
      return response.data;
    },
  });

  const admins = data?.data || [];

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      await api.post('/admins', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins-list'] });
      setIsAdding(false);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string, role: AdminRole }) => {
      await api.put(`/admins/${id}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins-list'] });
      setSelectedAdmin(null);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string, isActive: boolean }) => {
      await api.patch(`/admins/${id}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins-list'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admins/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins-list'] });
    },
  });

  const handleResetPassword = async (email: string) => {
    try {
      const auth = getAuth(app);
      await sendPasswordResetEmail(auth, email);
      // Fix 5: Replace alert() with proper toast notification
      showToast(`Password reset email sent to ${email}`);
    } catch (error: any) {
      showToast('Failed to send reset email: ' + error.message, 'error');
    }
  };

  const filteredAdmins = admins.filter(a => 
    a.displayName.toLowerCase().includes(search.toLowerCase()) || 
    a.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Fix 5: Toast notification */}
      {toastMsg && (
        <div className={`p-4 rounded-2xl text-xs font-semibold border ${
          toastType === 'success'
            ? 'bg-success/10 text-success border-success/20'
            : 'bg-error/10 text-error border-error/20'
        }`}>
          {toastMsg}
        </div>
      )}

      {/* Fix 5 & 6: My Account + Add Admin section */}
      <div className="glass p-4 border border-primary/10 rounded-3xl shadow-neon-primary">
        <p className="text-xs text-text-secondary mb-3">
          <strong className="text-text-primary">ℹ️ To change YOUR own password:</strong> Click the key icon <Key className="w-3 h-3 inline" /> next to your own account row below — a password reset link will be sent to your email address.
          &nbsp;To add a new admin, click <strong>+ Add Administrator</strong>.
        </p>
      </div>
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center glass p-4 border border-primary/10 rounded-3xl shadow-neon-primary">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 inset-y-0 my-auto w-4.5 h-4.5 text-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search admins..."
            className="w-full pl-10 pr-4 py-2.5 bg-bg-surface border border-bg-border rounded-2xl text-xs text-text-primary focus:outline-none focus:border-primary transition-all"
          />
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="w-full md:w-auto py-2.5 px-4 bg-primary text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 hover:bg-primary-dark transition-all cursor-pointer shadow-neon-primary"
        >
          <Plus className="w-4 h-4" /> Add Administrator
        </button>
      </div>

      <div className="glass border border-primary/10 rounded-3xl shadow-neon-primary overflow-hidden">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-bg-surface border-b border-bg-border text-[10px] font-bold text-text-secondary uppercase tracking-wider">
              <th className="p-4 pl-6">Admin Profile</th>
              <th className="p-4">Role</th>
              <th className="p-4">Status</th>
              <th className="p-4">Last Active</th>
              <th className="p-4 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bg-border/60 text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-text-secondary">Loading...</td>
              </tr>
            ) : filteredAdmins.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-text-secondary">No administrators found.</td>
              </tr>
            ) : (
              filteredAdmins.map((admin) => (
                <tr key={admin.uid} className="hover:bg-bg-surface/35 transition-colors">
                  <td className="p-4 pl-6 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {admin.displayName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-text-primary">{admin.displayName}</h4>
                      <p className="text-[10px] text-text-secondary">{admin.email}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-secondary/10 text-secondary border border-secondary/20 rounded-lg text-[10px] font-bold tracking-wider uppercase">
                      {admin.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    {admin.isActive ? (
                      <span className="px-2.5 py-1 bg-success/10 text-success rounded-full text-[10px] font-bold flex items-center gap-1 w-max">
                        <div className="w-1.5 h-1.5 bg-success rounded-full" /> Active
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-error/10 text-error rounded-full text-[10px] font-bold flex items-center gap-1 w-max">
                        <div className="w-1.5 h-1.5 bg-error rounded-full" /> Disabled
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-text-secondary text-[10px]">
                    {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedAdmin(admin)}
                        className="p-1.5 hover:bg-bg-surface border border-transparent hover:border-bg-border rounded-lg text-text-secondary transition-all cursor-pointer"
                        title="Edit Role"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleStatusMutation.mutate({ id: admin.uid, isActive: !admin.isActive })}
                        className="p-1.5 hover:bg-bg-surface border border-transparent hover:border-bg-border rounded-lg text-text-secondary transition-all cursor-pointer"
                        title={admin.isActive ? 'Disable Admin' : 'Enable Admin'}
                      >
                        {admin.isActive ? <PowerOff className="w-4 h-4 text-error" /> : <Power className="w-4 h-4 text-success" />}
                      </button>
                      <button
                        onClick={() => handleResetPassword(admin.email)}
                        className="p-1.5 hover:bg-bg-surface border border-transparent hover:border-bg-border rounded-lg text-text-secondary transition-all cursor-pointer"
                        title="Send Reset Password Email"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to permanently delete this admin?')) {
                            deleteMutation.mutate(admin.uid);
                          }
                        }}
                        className="p-1.5 hover:bg-bg-surface border border-transparent hover:border-bg-border rounded-lg text-error transition-all cursor-pointer"
                        title="Delete Admin"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Admin Dialog */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-bg-surface rounded-3xl max-w-md w-full p-6 border border-primary/10 shadow-2xl"
            >
              <h3 className="text-lg font-bold font-display text-text-primary mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" /> Create New Administrator
              </h3>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({ email: newEmail, password: newPassword, displayName: newName, role: newRole });
              }} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-bg-border rounded-xl text-xs text-text-primary focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-bg-border rounded-xl text-xs text-text-primary focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Temporary Password</label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-bg-border rounded-xl text-xs text-text-primary focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Assign Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as AdminRole)}
                    className="w-full px-3 py-2 bg-white/5 border border-bg-border rounded-xl text-xs text-text-primary focus:border-primary focus:outline-none"
                  >
                    {roles.map(r => <option key={r} value={r}>{r.replace('_', ' ').toUpperCase()}</option>)}
                  </select>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-2 bg-bg-surface hover:bg-slate-100 border border-bg-border text-text-primary rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
                  <button type="submit" disabled={createMutation.isPending} className="flex-1 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold cursor-pointer shadow-neon-primary disabled:opacity-50">Create Admin</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Role Dialog */}
      <AnimatePresence>
        {selectedAdmin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-bg-surface rounded-3xl max-w-sm w-full p-6 border border-primary/10 shadow-2xl"
            >
              <h3 className="text-lg font-bold font-display text-text-primary mb-4 flex items-center gap-2">
                Edit Role: {selectedAdmin.displayName}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Assign Role</label>
                  <select
                    defaultValue={selectedAdmin.role}
                    id="editRoleSelect"
                    className="w-full px-3 py-2 bg-white/5 border border-bg-border rounded-xl text-xs text-text-primary focus:border-primary focus:outline-none"
                  >
                    {roles.map(r => <option key={r} value={r}>{r.replace('_', ' ').toUpperCase()}</option>)}
                  </select>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setSelectedAdmin(null)} className="flex-1 py-2 bg-bg-surface hover:bg-slate-100 border border-bg-border text-text-primary rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
                  <button 
                    onClick={() => {
                      const sel = document.getElementById('editRoleSelect') as HTMLSelectElement;
                      if(sel) updateRoleMutation.mutate({ id: selectedAdmin.uid, role: sel.value as AdminRole });
                    }} 
                    disabled={updateRoleMutation.isPending} 
                    className="flex-1 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
