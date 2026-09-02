"use client";

import React, { useState } from "react";
import { useAuthStore } from "../../../store/authStore";
import { ShieldCheck, Key, User, Mail, Save, AlertCircle, CheckCircle2, Lock } from "lucide-react";
import { auth } from "../../../config/firebase";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

export default function ProfilePage() {
  const { admin } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error("Not authenticated");

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(
        err.code === "auth/invalid-credential"
          ? "Incorrect current password."
          : err.message || "Failed to change password."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card (1 col) */}
        <div className="md:col-span-1">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col items-center text-center space-y-3">
            <div className="w-20 h-20 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-2xl shadow-xs">
              {admin?.displayName?.charAt(0) || "A"}
            </div>

            <div>
              <h2 className="text-base font-bold font-display text-slate-900">
                {admin?.displayName || "Admin User"}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">{admin?.email}</p>
            </div>

            <div className="flex items-center gap-1.5 py-1 px-3 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{admin?.role?.replace(/_/g, " ").toUpperCase() || "MODERATOR"}</span>
            </div>
          </div>
        </div>

        {/* Change Password Form (2 cols) */}
        <div className="md:col-span-2">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-display text-slate-900">Change Password</h3>
                <p className="text-xs text-slate-400">Update your console access credentials</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs border border-rose-200 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs border border-emerald-200 flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
