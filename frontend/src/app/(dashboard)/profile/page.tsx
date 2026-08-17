'use client';

import React, { useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { ShieldCheck, Key, User, Mail, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { auth } from '../../../config/firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

export default function ProfilePage() {
  const { admin } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('Not authenticated');

      // Re-authenticate first
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      setSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.code === 'auth/invalid-credential' 
        ? 'Incorrect current password.' 
        : err.message || 'Failed to change password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display text-text-primary tracking-tight">
          Admin Profile
        </h1>
        <p className="text-text-secondary mt-1 text-sm">
          Manage your account settings and security credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass p-6 rounded-3xl border border-bg-border relative overflow-hidden flex flex-col items-center text-center shadow-sm">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-luxury mb-4 text-white text-3xl font-black">
              {admin?.displayName?.charAt(0) || 'A'}
            </div>
            <h2 className="text-lg font-bold text-text-primary">{admin?.displayName || 'Admin User'}</h2>
            <p className="text-sm text-text-secondary">{admin?.email}</p>
            
            <div className="mt-4 flex items-center gap-2 py-1.5 px-3 bg-primary/10 text-primary border border-primary/20 rounded-xl">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-bold tracking-widest uppercase">
                {admin?.role?.replace('_', ' ') || 'Moderator'}
              </span>
            </div>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="md:col-span-2">
          <div className="glass p-6 rounded-3xl border border-bg-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary">Change Password</h3>
                <p className="text-xs text-text-secondary">Update your admin access password</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {error && (
                <div className="p-3 bg-error/10 text-error rounded-xl text-sm border border-error/20 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-success/10 text-success rounded-xl text-sm border border-success/20 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {success}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white rounded-xl border border-bg-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white rounded-xl border border-bg-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white rounded-xl border border-bg-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="py-2.5 px-6 bg-gradient-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary text-white rounded-xl font-semibold text-sm shadow-luxury hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span> : <Save className="w-4 h-4" />}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
