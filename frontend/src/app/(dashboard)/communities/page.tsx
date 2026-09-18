"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../../services/api";
import {
  Users2,
  Plus,
  X,
  Pencil,
  ShieldCheck,
  ShieldOff,
  MessageSquare,
} from "lucide-react";

interface AdminCommunity {
  id: string;
  name: string;
  description: string;
  coverImageUrl: string | null;
  category: string;
  isActive: boolean;
  memberCount: number;
  postCount: number;
}

const emptyForm = { id: "", name: "", description: "", category: "general", coverImageUrl: "" };

export default function CommunitiesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  // Editing an existing community locks the id field (it's the doc id,
  // immutable once created) — null means "create" mode.
  const [editing, setEditing] = useState<AdminCommunity | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery<{ data: AdminCommunity[] }>({
    queryKey: ["communities-list"],
    queryFn: async () => {
      const response = await api.get("/communities");
      return response.data;
    },
    refetchInterval: 30000,
  });

  const communities = data?.data || [];

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      await api.post("/communities", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities-list"] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Partial<typeof form>) => {
      await api.patch(`/communities/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities-list"] });
      closeModal();
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await api.patch(`/communities/${id}`, { isActive });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["communities-list"] }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (community: AdminCommunity) => {
    setEditing(community);
    setForm({
      id: community.id,
      name: community.name,
      description: community.description || "",
      category: community.category || "general",
      coverImageUrl: community.coverImageUrl || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        name: form.name,
        description: form.description,
        category: form.category,
        coverImageUrl: form.coverImageUrl || undefined,
      });
    } else {
      createMutation.mutate(form);
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;
  const error = (createMutation.error as any) || (updateMutation.error as any);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 border border-slate-200/80 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
            <Users2 className="w-4 h-4 text-indigo-600" />
            Communities
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Create and manage the communities users can join and post Relationship Posts into.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Community
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200/80 shimmer" />
          ))}
        </div>
      ) : communities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200/80 rounded-2xl text-center shadow-xs">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-3 border border-indigo-100">
            <Users2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold font-display text-slate-900">No Communities Yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Create your first community so users can join it and post Relationship Posts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AnimatePresence>
            {communities.map((community) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                key={community.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{community.name}</h4>
                    <p className="text-[11px] text-slate-400 font-mono">{community.id}</p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${
                      community.isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {community.isActive ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
                    {community.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {community.description && (
                  <p className="text-xs text-slate-600 line-clamp-2">{community.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Users2 className="w-3.5 h-3.5" />{community.memberCount} members</span>
                  <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{community.postCount} posts</span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => openEdit(community)}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => toggleActiveMutation.mutate({ id: community.id, isActive: !community.isActive })}
                    disabled={toggleActiveMutation.isPending}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      community.isActive
                        ? "bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200"
                        : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {community.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Community Dialog */}
      <AnimatePresence>
        {modalOpen && (
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
                  <Users2 className="w-4 h-4 text-indigo-600" />
                  {editing ? "Edit Community" : "Create Community"}
                </h3>
                <button onClick={closeModal} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={submit} className="space-y-3.5">
                {!editing && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Community ID (slug)
                    </label>
                    <input
                      type="text"
                      required
                      pattern="[a-z0-9_]+"
                      title="Lowercase letters, digits, and underscores only"
                      placeholder="e.g. newly_married"
                      value={form.id}
                      onChange={(e) => setForm({ ...form, id: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Permanent once created — lowercase, digits, underscores only.</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cover Image URL (optional)</label>
                  <input
                    type="url"
                    value={form.coverImageUrl}
                    onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {error && (
                  <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                    {error?.response?.data?.message || error?.message || "Something went wrong."}
                  </p>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {saving ? "Saving..." : editing ? "Save Changes" : "Create Community"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
