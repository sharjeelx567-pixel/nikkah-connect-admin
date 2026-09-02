"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../../services/api";
import { Admin, AdminRole } from "../../../types";
import {
  ShieldCheck,
  Plus,
  UserPlus,
  Trash2,
  Key,
  Power,
  PowerOff,
  Sparkles,
  Shield,
  X,
  Users,
  CheckCircle,
  AlertCircle
} from "lucide-react";

export default function AdminsPage() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);

  // New admin form state
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<AdminRole>("moderator");

  // Fetch Admins List
  const { data: adminsData, isLoading } = useQuery<{ data: Admin[] }>({
    queryKey: ["admins-list"],
    queryFn: async () => {
      const response = await api.get("/admins");
      return response.data;
    },
  });

  const admins = adminsData?.data || [];

  // Create Admin Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      await api.post("/admins", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins-list"] });
      setIsAdding(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
    },
  });

  // Toggle Active Status Mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await api.patch(`/admins/${id}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins-list"] });
    },
  });

  // Update Role Mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AdminRole }) => {
      await api.patch(`/admins/${id}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins-list"] });
      setSelectedAdmin(null);
    },
    onError: (error: any) => {
      alert(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          `Failed to update role (${error?.response?.status || "network error"}).`
      );
    },
  });

  // Delete Admin Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admins/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins-list"] });
    },
  });

  const handleResetPassword = async (email: string) => {
    try {
      await api.post("/auth/reset-password", { email });
      alert(`Password reset instructions dispatched to ${email}`);
    } catch (err: any) {
      alert("Failed to send reset email: " + (err.response?.data?.message || err.message));
    }
  };

  const getRoleBadge = (role: AdminRole) => {
    switch (role) {
      case "super_admin":
        return (
          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-600" /> Super Admin
          </span>
        );
      case "moderator":
        return (
          <span className="px-2.5 py-1 bg-pink-50 text-pink-700 border border-pink-200 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1">
            Moderator
          </span>
        );
      case "admin":
        return (
          <span className="px-2.5 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1">
            Admin
          </span>
        );
      case "support_staff":
        return (
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1">
            Support Staff
          </span>
        );
      case "verification_staff":
        return (
          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1">
            Verification Staff
          </span>
        );
      case "content_moderator":
        return (
          <span className="px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1">
            Content Moderator
          </span>
        );
      case "analyst":
        return (
          <span className="px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1">
            Analyst
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold uppercase">
            {role}
          </span>
        );
    }
  };

  // Must match the backend's ALLOWED_ADMIN_ROLES exactly (admins.controller.ts) —
  // any string here that isn't in that list gets rejected with 400 and the
  // role silently fails to change.
  const roles: AdminRole[] = [
    "super_admin",
    "admin",
    "moderator",
    "verification_staff",
    "support_staff",
    "content_moderator",
    "analyst",
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Administrator Permissions & Access Control
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage authorized console staff accounts and assigned roles.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer self-stretch sm:self-auto justify-center"
        >
          <UserPlus className="w-4 h-4" />
          Add Administrator
        </button>
      </div>

      {/* 2. Admins Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Staff Member</th>
                <th className="px-6 py-4">Role Permission</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Login</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-5 bg-slate-50/30 h-16" />
                  </tr>
                ))
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No administrators found.
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.uid} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {admin.displayName?.charAt(0) || "A"}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">
                            {admin.displayName || "Admin User"}
                          </h4>
                          <span className="text-[11px] text-slate-400 block">{admin.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getRoleBadge(admin.role)}
                        <button
                          onClick={() => setSelectedAdmin(admin)}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                        >
                          Change
                        </button>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {admin.isActive ? (
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-600" /> Disabled
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-slate-400 text-[11px]">
                      {(() => {
                        // Firestore Timestamps serialize over the API as
                        // {_seconds, _nanoseconds}, not an ISO string — feed
                        // that shape straight into `new Date()` and you get
                        // "Invalid Date" instead of a real value.
                        const raw = admin.lastLoginAt as any;
                        if (!raw) return "Never";
                        const ms = raw._seconds ? raw._seconds * 1000 : raw;
                        const date = new Date(ms);
                        return isNaN(date.getTime()) ? "Never" : date.toLocaleDateString();
                      })()}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              id: admin.uid,
                              isActive: !admin.isActive,
                            })
                          }
                          className="p-1.5 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 transition-colors cursor-pointer"
                          title={admin.isActive ? "Deactivate" : "Activate"}
                        >
                          {admin.isActive ? (
                            <PowerOff className="w-3.5 h-3.5 text-rose-600" />
                          ) : (
                            <Power className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                        </button>

                        <button
                          onClick={() => handleResetPassword(admin.email)}
                          className="p-1.5 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 transition-colors cursor-pointer"
                          title="Reset Password Email"
                        >
                          <Key className="w-3.5 h-3.5 text-amber-600" />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm("Are you sure you want to permanently delete this administrator?")) {
                              deleteMutation.mutate(admin.uid);
                            }
                          }}
                          className="p-1.5 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete Admin"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Add Admin Dialog */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  Create Staff Administrator
                </h3>
                <button
                  onClick={() => setIsAdding(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate({
                    email: newEmail,
                    password: newPassword,
                    displayName: newName,
                    role: newRole,
                  });
                }}
                className="space-y-3.5"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Temporary Password
                  </label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Staff Permission Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as AdminRole)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {r.replace(/_/g, " ").toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2.5 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Edit Role Dialog */}
      <AnimatePresence>
        {selectedAdmin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl space-y-4"
            >
              <h3 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
                Edit Role: {selectedAdmin.displayName}
              </h3>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">Assign Role</label>
                <select
                  defaultValue={selectedAdmin.role}
                  id="editRoleSelect"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r.replace(/_/g, " ").toUpperCase()}
                    </option>
                  ))}
                </select>

                <div className="flex gap-2.5 pt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedAdmin(null)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const sel = document.getElementById("editRoleSelect") as HTMLSelectElement;
                      if (sel)
                        updateRoleMutation.mutate({
                          id: selectedAdmin.uid,
                          role: sel.value as AdminRole,
                        });
                    }}
                    disabled={updateRoleMutation.isPending}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    Save Role
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

