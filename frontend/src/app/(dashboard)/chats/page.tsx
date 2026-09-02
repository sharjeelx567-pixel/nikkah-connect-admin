"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, AlertOctagon, Check, ShieldAlert, Plus, Trash2, X, Sparkles, UserCheck } from "lucide-react";
import api from "../../../services/api";

interface FlaggedChat {
  id: string;
  userA: { id: string; name: string; email: string };
  userB: { id: string; name: string; email: string };
  flaggedMessage: string;
  flagReason: string;
  timestamp: string;
}

interface BlockedWord {
  id: string;
  word: string;
}

interface ChaperoneFlag {
  id: string;
  chaperoneName: string;
  reason: string;
  messageContent: string;
  participants: { uid: string; displayName: string }[];
  createdAt?: { _seconds: number };
}

export default function ChatsPage() {
  const queryClient = useQueryClient();
  const [newWord, setNewWord] = useState("");
  const [selectedChat, setSelectedChat] = useState<FlaggedChat | null>(null);

  // Routed through the authenticated backend (not direct Firestore
  // onSnapshot listeners) — the admin console never establishes a real
  // Firebase Auth session, so request.auth is always null for direct client
  // Firestore reads, and flagged_chats holds real user names/emails/message
  // content that shouldn't be made public-read just to work around that.
  const { data: flaggedChatsData, isLoading } = useQuery<{ data: FlaggedChat[] }>({
    queryKey: ["flagged-chats"],
    queryFn: () => api.get("/chat-moderation/flagged").then((r) => r.data),
    refetchInterval: 30000,
  });
  const flaggedChats = flaggedChatsData?.data || [];

  const { data: blockedWordsData } = useQuery<{ data: BlockedWord[] }>({
    queryKey: ["blocked-words"],
    queryFn: () => api.get("/chat-moderation/blocked-words").then((r) => r.data),
    refetchInterval: 30000,
  });
  const blockedWords = blockedWordsData?.data || [];

  const resolveChatMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/chat-moderation/flagged/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["flagged-chats"] }),
  });

  const addWordMutation = useMutation({
    mutationFn: (word: string) => api.post("/chat-moderation/blocked-words", { word }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blocked-words"] }),
  });

  const removeWordMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/chat-moderation/blocked-words/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blocked-words"] }),
  });

  const handleResolve = async (id: string) => {
    try {
      await resolveChatMutation.mutateAsync(id);
      setSelectedChat(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    try {
      await addWordMutation.mutateAsync(newWord.trim());
      setNewWord("");
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveWord = async (id: string) => {
    try {
      await removeWordMutation.mutateAsync(id);
    } catch (e) {
      console.error(e);
    }
  };

  // Chaperone Flags — a guardian/chaperone monitoring a family chat room can
  // flag a specific message (see flagChaperoneMessage in functions/src/index.ts).
  // This is a separate, real safety signal from the auto-keyword system above.
  const { data: chaperoneFlagsData, isLoading: flagsLoading } = useQuery<{ data: ChaperoneFlag[] }>({
    queryKey: ["chaperone-flags"],
    queryFn: () => api.get("/family/chaperone-flags").then((r) => r.data),
    refetchInterval: 30000,
  });
  const chaperoneFlags = chaperoneFlagsData?.data || [];

  const resolveFlagMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/family/chaperone-flags/${id}/resolve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chaperone-flags"] }),
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Flagged chats list (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                Active Flagged Messages Queue
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated keyword triggers and harassment detection
              </p>
            </div>
            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold text-[10px] rounded-full uppercase tracking-wider">
              {flaggedChats.length} Action Needed
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200/80 shimmer" />
              ))}
            </div>
          ) : flaggedChats.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center shadow-xs">
              <Check className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-900 font-display">No Flagged Messages</h3>
              <p className="text-xs text-slate-400 mt-1">All chat conversations are adhering to community guidelines.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {flaggedChats.map((chat) => (
                  <motion.div
                    key={chat.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs hover:shadow-sm transition-all flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-900">
                          {chat.userA?.name || "Candidate A"} & {chat.userB?.name || "Candidate B"}
                        </h4>
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full inline-block mt-1">
                          Trigger: {chat.flagReason}
                        </span>
                        <p className="text-xs text-slate-700 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-2 font-medium">
                          &ldquo;{chat.flaggedMessage}&rdquo;
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                      <button
                        onClick={() => setSelectedChat(chat)}
                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => handleResolve(chat.id)}
                        className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Resolve
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Auto-Moderation Dictionary (1 col) */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col h-[520px]">
            <div className="pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold font-display text-slate-900">Prohibited Dictionary</h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time keyword auto-censorship</p>
            </div>

            <form onSubmit={handleAddWord} className="my-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Add Blocked Keyword
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  placeholder="e.g. scam, payment, whatsapp"
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {blockedWords.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-10">No blocked words configured.</p>
              ) : (
                blockedWords.map((word) => (
                  <div
                    key={word.id}
                    className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100"
                  >
                    <span className="text-xs font-semibold text-slate-800">{word.word}</span>
                    <button
                      onClick={() => handleRemoveWord(word.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chaperone Flags — real safety signals from family/guardian chat monitoring */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-500" />
              Chaperone-Flagged Messages
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Messages a guardian/chaperone flagged while monitoring a family chat room
            </p>
          </div>
          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-bold text-[10px] rounded-full uppercase tracking-wider">
            {chaperoneFlags.length} Pending Review
          </span>
        </div>

        {flagsLoading ? (
          <div className="space-y-3 mt-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-50 rounded-xl shimmer" />
            ))}
          </div>
        ) : chaperoneFlags.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            No chaperone flags pending review.
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {chaperoneFlags.map((flag) => (
              <div
                key={flag.id}
                className="p-4 border border-slate-200/80 rounded-xl flex flex-col md:flex-row gap-3 md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900">
                    {flag.participants.map((p) => p.displayName).join(" & ") || "Unknown participants"}
                  </p>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full inline-block mt-1">
                    Flagged by {flag.chaperoneName} — {flag.reason}
                  </span>
                  <p className="text-xs text-slate-700 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-2 font-medium">
                    &ldquo;{flag.messageContent}&rdquo;
                  </p>
                </div>
                <button
                  onClick={() => resolveFlagMutation.mutate(flag.id)}
                  disabled={resolveFlagMutation.isPending}
                  className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1 flex-shrink-0 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" /> Mark Reviewed
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <AnimatePresence>
        {selectedChat && (
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
              className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 p-6 space-y-4"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-500" /> Flagged Chat Inspection
                </h3>
                <button
                  onClick={() => setSelectedChat(null)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200/70 text-xs">
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block mb-1">
                  Message that triggered flag
                </span>
                <p className="font-semibold text-slate-900 text-sm">&ldquo;{selectedChat.flaggedMessage}&rdquo;</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Candidate A</span>
                  <p className="font-bold text-slate-900 mt-1">{selectedChat.userA?.name || "User A"}</p>
                  <p className="text-[11px] text-slate-400">{selectedChat.userA?.email || "N/A"}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Candidate B</span>
                  <p className="font-bold text-slate-900 mt-1">{selectedChat.userB?.name || "User B"}</p>
                  <p className="text-[11px] text-slate-400">{selectedChat.userB?.email || "N/A"}</p>
                </div>
              </div>

              <div className="pt-3 flex gap-2.5">
                <button
                  onClick={() => setSelectedChat(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => handleResolve(selectedChat.id)}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Mark Resolved
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
