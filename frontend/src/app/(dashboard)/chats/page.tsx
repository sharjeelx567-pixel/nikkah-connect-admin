'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, ShieldAlert, Check, X, AlertOctagon, UserX, Plus, Trash2 } from 'lucide-react';
import { db } from '../../../config/firebase';
import { collection, onSnapshot, query, orderBy, limit, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';

interface FlaggedChat {
  id: string;
  userA: { uid: string; name: string; email: string };
  userB: { uid: string; name: string; email: string };
  flaggedMessage: string;
  flagReason: string;
  status: 'pending' | 'resolved';
  timestamp: any;
}

interface BlockedWord {
  id: string;
  word: string;
  addedAt: any;
}

export default function ChatsPage() {
  const [chats, setChats] = useState<FlaggedChat[]>([]);
  const [blockedWords, setBlockedWords] = useState<BlockedWord[]>([]);
  const [newWord, setNewWord] = useState('');
  const [selectedChat, setSelectedChat] = useState<FlaggedChat | null>(null);

  // Fetch flagged chats
  useEffect(() => {
    const q = query(collection(db, 'flagged_chats'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: FlaggedChat[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status !== 'resolved') {
          fetched.push({ id: doc.id, ...data } as FlaggedChat);
        }
      });
      setChats(fetched);
    });
    return () => unsubscribe();
  }, []);

  // Fetch blocked words
  useEffect(() => {
    const q = query(collection(db, 'blocked_words'), orderBy('addedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: BlockedWord[] = [];
      snapshot.forEach(doc => {
        fetched.push({ id: doc.id, ...doc.data() } as BlockedWord);
      });
      setBlockedWords(fetched);
    });
    return () => unsubscribe();
  }, []);

  const handleResolve = async (id: string) => {
    try {
      await updateDoc(doc(db, 'flagged_chats', id), { status: 'resolved' });
      setSelectedChat(null);
    } catch (error) {
      console.error("Error resolving chat", error);
    }
  };

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    
    try {
      await addDoc(collection(db, 'blocked_words'), {
        word: newWord.trim().toLowerCase(),
        addedAt: serverTimestamp()
      });
      setNewWord('');
    } catch (error) {
      console.error("Error adding word", error);
    }
  };

  const handleRemoveWord = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'blocked_words', id));
    } catch (error) {
      console.error("Error removing word", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-text-secondary mt-1">
            Review chat rooms flagged for policy violations and manage auto-moderation keywords.
          </p>
        </div>
      </div>

      {/* Fix 9: How chat moderation works */}
      <div className="p-4 bg-primary/5 border border-primary/15 rounded-2xl text-[11px] text-text-secondary space-y-1">
        <p className="font-bold text-text-primary text-xs">ℹ️ How Auto-Moderation Works</p>
        <p>1. <strong>Add a blocked word</strong> in the &quot;Auto-Moderation Dictionary&quot; panel on the right (e.g. WhatsApp, number, scam).</p>
        <p>2. When any user <strong>types that word</strong> in a chat, it is automatically <strong>flagged and appears here</strong> for your review.</p>
        <p>3. You can then <strong>Resolve</strong> it (dismiss) or take action on the user from the Users page.</p>
        <p className="text-primary font-semibold">💡 You can add multiple words at once. All matching is case-insensitive.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Flagged Chats List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-base font-bold font-display text-text-primary">Flagged Conversations</h3>
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 glass border border-primary/10 rounded-3xl text-center shadow-neon-primary">
              <div className="w-16 h-16 bg-success/15 rounded-full flex items-center justify-center text-success mb-4 shadow-neon-primary">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold font-display text-text-primary">Chat Logs Clear</h3>
              <p className="text-sm text-text-secondary mt-1">
                There are no pending flagged chats.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {chats.map((chat) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={chat.id}
                    className="glass p-6 border border-primary/10 rounded-3xl shadow-neon-primary premium-card transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center font-bold flex-shrink-0 mt-0.5 animate-pulse">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-text-primary">Room: {chat.userA?.name || 'User A'} & {chat.userB?.name || 'User B'}</h4>
                        <p className="text-xs text-text-secondary mt-1">
                          Flag Trigger: <span className="font-semibold text-error bg-error/5 px-2 py-0.5 rounded border border-error/5">{chat.flagReason}</span>
                        </p>
                        <div className="mt-3 p-3 bg-bg-surface/50 border border-primary/10 rounded-2xl text-xs text-text-primary">
                          <span className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Flagged Text Message</span>
                          "{chat.flaggedMessage}"
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto self-end md:self-center">
                      <button
                        onClick={() => setSelectedChat(chat)}
                        className="flex-1 md:flex-initial py-2 px-4 bg-bg-surface hover:bg-slate-100 text-text-primary rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-primary/10"
                      >
                        View Info
                      </button>
                      <button
                        onClick={() => handleResolve(chat.id)}
                        className="flex-1 md:flex-initial py-2 px-4 bg-success hover:bg-success-dark text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      >
                        <Check className="w-4 h-4" /> Resolve
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Blocked Words Management */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-base font-bold font-display text-text-primary">Auto-Moderation Dictionary</h3>
          <div className="glass p-6 border border-primary/10 rounded-3xl shadow-neon-primary premium-card flex flex-col h-[500px]">
            <form onSubmit={handleAddWord} className="mb-4">
              <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2">Add Blocked Word</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  placeholder="e.g. scam, whatsapp..."
                  className="flex-1 px-3 py-2 bg-white/5 border border-bg-border rounded-xl focus:outline-none focus:border-primary text-xs text-text-primary"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-primary text-white rounded-xl font-bold cursor-pointer hover:bg-primary-dark transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {blockedWords.length === 0 ? (
                <p className="text-center text-xs text-text-secondary py-4">No blocked words configured.</p>
              ) : (
                blockedWords.map(word => (
                  <div key={word.id} className="flex justify-between items-center p-2.5 bg-bg-surface/50 border border-bg-border rounded-xl">
                    <span className="text-xs font-semibold text-text-primary">{word.word}</span>
                    <button
                      onClick={() => handleRemoveWord(word.id)}
                      className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

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
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-bg-surface rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-primary/10 p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold font-display text-text-primary flex items-center gap-2">
                  <AlertOctagon className="w-5 h-5 text-error" /> Flagged Chat Details
                </h3>
                <button
                  onClick={() => setSelectedChat(null)}
                  className="p-1.5 hover:bg-bg-surface border border-bg-border rounded-xl cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-error/5 border border-error/20 rounded-2xl">
                  <p className="text-text-secondary mb-1 uppercase tracking-wider font-semibold text-[10px]">Message that triggered the flag</p>
                  <p className="text-sm font-semibold text-text-primary">"{selectedChat.flaggedMessage}"</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-bg-surface border border-bg-border rounded-xl">
                    <span className="text-[10px] text-text-secondary uppercase">Participant A</span>
                    <p className="font-bold text-text-primary mt-1">{selectedChat.userA?.name || 'User A'}</p>
                    <p className="text-[10px] text-text-secondary">{selectedChat.userA?.email || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-bg-surface border border-bg-border rounded-xl">
                    <span className="text-[10px] text-text-secondary uppercase">Participant B</span>
                    <p className="font-bold text-text-primary mt-1">{selectedChat.userB?.name || 'User B'}</p>
                    <p className="text-[10px] text-text-secondary">{selectedChat.userB?.email || 'N/A'}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setSelectedChat(null)}
                  className="flex-1 py-3 bg-bg-surface border border-bg-border text-text-primary rounded-xl font-bold text-xs cursor-pointer hover:bg-white/10"
                >
                  Close
                </button>
                <button
                  onClick={() => handleResolve(selectedChat.id)}
                  className="flex-1 py-3 bg-success hover:bg-success-dark text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
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
