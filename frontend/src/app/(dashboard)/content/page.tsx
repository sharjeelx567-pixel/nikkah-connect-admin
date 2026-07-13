'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Shield, FileText, Image as ImageIcon, Plus, Edit2, Trash2 } from 'lucide-react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState('faq');
  const [faqs, setFaqs] = useState<FaqItem[]>([
    { id: '1', question: 'How do I complete profile verification?', answer: 'Go to your account settings in the Flutter app, select Identity verification, and upload a valid CNIC or passport scan along with a short live video verification check.' },
    { id: '2', question: 'Is my chat interaction completely private?', answer: 'Yes. Chats are fully encrypted, but they can be flagged for automated harassment detection or investigated if another user explicitly reports your messages.' },
  ]);

  return (
    <div className="space-y-6">
      {/* Tabs configuration list */}
      <div className="flex gap-2 p-2 glass border border-primary/10 rounded-2xl w-max shadow-sm">
        {[
          { id: 'faq', name: 'FAQs Onboarding', icon: HelpCircle },
          { id: 'banners', name: 'App Banners', icon: ImageIcon },
          { id: 'policies', name: 'App Policies', icon: Shield },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.name}
          </button>
        ))}
      </div>

      <div className="glass p-6 border border-primary/10 rounded-3xl shadow-neon-primary premium-card">
        {activeTab === 'faq' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-bg-border">
              <div>
                <h3 className="text-base font-bold font-display text-text-primary">Manage FAQs</h3>
                <p className="text-xs text-text-secondary mt-0.5">Edit onboarding answers shown inside the mobile app</p>
              </div>
              <button
                onClick={() => {
                  const q = prompt('Enter new FAQ question:');
                  const a = prompt('Enter new FAQ answer:');
                  if (q && a) setFaqs([...faqs, { id: String(Date.now()), question: q, answer: a }]);
                }}
                className="py-2 px-4 bg-primary text-white rounded-xl text-xs font-semibold flex items-center gap-1 hover:bg-primary-dark cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add FAQ
              </button>
            </div>

            <div className="space-y-4">
              {faqs.map((faq) => (
                <div key={faq.id} className="p-4 bg-bg-surface/40 border border-bg-border rounded-2xl text-xs flex justify-between items-start gap-4">
                  <div className="space-y-1 flex-1">
                    <h4 className="font-bold text-text-primary">Q: {faq.question}</h4>
                    <p className="text-text-secondary">A: {faq.answer}</p>
                  </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const newAns = prompt('Edit FAQ answer:', faq.answer);
                          if (newAns) setFaqs(faqs.map(f => f.id === faq.id ? { ...f, answer: newAns } : f));
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg border border-bg-border text-text-secondary hover:text-primary cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setFaqs(faqs.filter(f => f.id !== faq.id))}
                        className="p-1.5 hover:bg-slate-100 rounded-lg border border-bg-border text-text-secondary hover:text-error cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'banners' && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-bg-border">
              <h3 className="text-base font-bold font-display text-text-primary">Marketing Banners</h3>
              <p className="text-xs text-text-secondary mt-0.5">Control image slides visible in the home screen carousel</p>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              {[
                { name: 'Onboarding Slide A', url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=600' },
                { name: 'Subscription Premium Banner', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=600' }
              ].map((banner, idx) => (
                <div key={idx} className="border border-bg-border rounded-2xl overflow-hidden bg-bg-surface/50 text-xs">
                  <div className="aspect-[21/9] bg-bg-border relative">
                    <img src={banner.url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-text-primary">{banner.name}</h4>
                      <p className="text-[10px] text-text-secondary">Visible to all subscribers</p>
                    </div>
                    <button className="py-1 px-3 border border-bg-border hover:bg-slate-100 rounded-xl font-semibold cursor-pointer text-text-primary">
                      Replace Image
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'policies' && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-bg-border">
              <h3 className="text-base font-bold font-display text-text-primary">Policies & Legal documents</h3>
              <p className="text-xs text-text-secondary mt-0.5">Manage GDPR, Privacy guidelines, and Member Terms</p>
            </div>

            <div className="space-y-4">
              {['Terms of Service', 'Privacy Policy', 'Community Safety Guidelines'].map((doc, idx) => (
                <div key={idx} className="p-4 border border-bg-border rounded-2xl flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-text-secondary" />
                    <span className="font-semibold text-text-primary">{doc}</span>
                  </div>
                  <button className="py-1.5 px-3 bg-bg-surface hover:bg-bg-border/60 rounded-xl font-semibold cursor-pointer">
                    Edit Document
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
