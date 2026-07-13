'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, ShieldAlert, Check, X, AlertOctagon, UserX } from 'lucide-react';

interface FlaggedChat {
  id: string;
  userA: { name: string; email: string };
  userB: { name: string; email: string };
  flaggedMessage: string;
  flagReason: string;
  timestamp: string;
}

export default function ChatsPage() {
  const [chats, setChats] = useState<FlaggedChat[]>([
    {
      id: 'chat-1',
      userA: { name: 'Ahmad Khan', email: 'ahmad@gmail.com' },
      userB: { name: 'Zara Malik', email: 'zara@gmail.com' },
      flaggedMessage: 'Hey, send me your WhatsApp number immediately or I will block you.',
      flagReason: 'Aggressive request for external contact info',
      timestamp: 'Today, 10:24 AM',
    },
    {
      id: 'chat-2',
      userA: { name: 'Fatima Ali', email: 'fatima@yahoo.com' },
      userB: { name: 'Usman Shah', email: 'usman@gmail.com' },
      flaggedMessage: 'You look like a fraud, I am going to report your photo.',
      flagReason: 'Inappropriate language & harassment flag',
      timestamp: 'Yesterday, 6:15 PM',
    },
  ]);

  const [selectedChat, setSelectedChat] = useState<FlaggedChat | null>(null);

  const handleResolve = (id: string) => {
    setChats(chats.filter(c => c.id !== id));
    setSelectedChat(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-text-secondary mt-1">
            Review chat rooms flagged for policy violations, scamming activities, or harassment.
          </p>
        </div>
      </div>

      {chats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 glass border border-primary/10 rounded-3xl text-center shadow-neon-primary">
          <div className="w-16 h-16 bg-success/15 rounded-full flex items-center justify-center text-success mb-4 shadow-neon-primary">
            <Check className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold font-display text-text-primary">Chat Logs Clear</h3>
          <p className="text-sm text-text-secondary mt-1">
            There are no flagged chats awaiting review.
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
                    <h4 className="font-bold text-sm text-text-primary">Flags Room: {chat.userA.name} & {chat.userB.name}</h4>
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
                    View Chat
                  </button>
                  <button
                    onClick={() => handleResolve(chat.id)}
                    className="flex-1 md:flex-initial py-2 px-4 bg-success hover:bg-success-dark text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    Dismiss
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Chat viewer dialog */}
      <AnimatePresence>
        {selectedChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-bg-surface rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-primary/10 p-6 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between pb-4 border-b border-bg-border">
                <h3 className="text-base font-bold font-display text-text-primary">Flagged Chat room</h3>
                <button
                  onClick={() => setSelectedChat(null)}
                  className="p-1 hover:bg-bg-surface rounded-lg text-text-secondary cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mock Chat Transcript display */}
              <div className="my-6 space-y-4 max-h-[300px] overflow-y-auto pr-1">
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[9px] text-text-secondary font-semibold uppercase">{selectedChat.userA.name}</span>
                  <div className="bg-bg-surface p-3 rounded-2xl rounded-tl-none text-xs text-text-primary max-w-[85%] border border-bg-border">
                    Hello, thanks for connecting with me.
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-[9px] text-text-secondary font-semibold uppercase">{selectedChat.userB.name}</span>
                  <div className="bg-primary/5 p-3 rounded-2xl rounded-tr-none text-xs text-text-primary max-w-[85%] border border-primary/10">
                    Hi Ahmad! Nice to connect with you too. How are you?
                  </div>
                </div>

                <div className="flex flex-col items-start gap-1">
                  <span className="text-[9px] text-text-secondary font-semibold uppercase">{selectedChat.userA.name}</span>
                  <div className="bg-error/5 p-3 rounded-2xl rounded-tl-none text-xs text-text-primary max-w-[85%] border border-error/10 font-medium">
                    {selectedChat.flaggedMessage}
                  </div>
                  <span className="text-[8px] font-bold text-error uppercase tracking-wider">Flagged message</span>
                </div>
              </div>

              {/* Chat moderation operations */}
              <div className="space-y-2 pt-4 border-t border-bg-border">
                <button
                  onClick={() => handleResolve(selectedChat.id)}
                  className="w-full py-2.5 bg-success text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-1 hover:bg-success-dark cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Clear Flag / Dismiss
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      alert(`Warning sent to ${selectedChat.userA.name}`);
                      handleResolve(selectedChat.id);
                    }}
                    className="flex-1 py-2.5 bg-amber-500/10 border border-amber-500/10 text-amber-600 rounded-xl font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <AlertOctagon className="w-4 h-4" /> Warn Sender
                  </button>
                  <button
                    onClick={() => {
                      alert(`User ${selectedChat.userA.name} banned`);
                      handleResolve(selectedChat.id);
                    }}
                    className="flex-1 py-2.5 bg-error text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-1 hover:bg-error-dark cursor-pointer"
                  >
                    <UserX className="w-4 h-4" /> Ban Sender
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
