'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Shield, FileText, Image as ImageIcon, Plus, Edit2, Trash2, Save } from 'lucide-react';
import { db } from '../../../config/firebase';
import { collection, doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface Banner {
  id: string;
  imageUrl: string;
  linkUrl: string;
}

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState('faq');
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [terms, setTerms] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Fetch FAQs
    const unsubscribeFaqs = onSnapshot(doc(db, 'app_content', 'faqs'), (doc) => {
      if (doc.exists()) {
        setFaqs(doc.data().items || []);
      }
    });

    // Fetch Banners
    const unsubscribeBanners = onSnapshot(doc(db, 'app_content', 'banners'), (doc) => {
      if (doc.exists()) {
        setBanners(doc.data().items || []);
      }
    });

    // Fetch Policies
    const unsubscribePolicies = onSnapshot(doc(db, 'app_content', 'policies'), (doc) => {
      if (doc.exists()) {
        setPrivacyPolicy(doc.data().privacyPolicy || '');
        setTerms(doc.data().terms || '');
      }
    });

    return () => {
      unsubscribeFaqs();
      unsubscribeBanners();
      unsubscribePolicies();
    };
  }, []);

  const saveFaqs = async (newFaqs: FaqItem[]) => {
    try {
      await setDoc(doc(db, 'app_content', 'faqs'), { items: newFaqs });
    } catch (error) {
      console.error("Error saving FAQs", error);
      alert("Failed to save FAQs");
    }
  };

  const saveBanners = async (newBanners: Banner[]) => {
    try {
      await setDoc(doc(db, 'app_content', 'banners'), { items: newBanners });
    } catch (error) {
      console.error("Error saving Banners", error);
      alert("Failed to save Banners");
    }
  };

  const savePolicies = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'app_content', 'policies'), { privacyPolicy, terms });
      alert("Policies saved successfully.");
    } catch (error) {
      console.error("Error saving Policies", error);
      alert("Failed to save Policies");
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Fix 11: Content Management Info */}
      <div className="p-4 bg-primary/5 border border-primary/15 rounded-2xl text-[11px] text-text-secondary space-y-1">
        <p className="font-bold text-text-primary text-xs">ℹ️ Live Content Updates</p>
        <p>This section is <strong>fully functional</strong>. Changes made here to FAQs, Banners, and Policies are instantly saved to Firestore and updated live in the Flutter app without requiring an app update.</p>
      </div>

      {/* Tabs configuration list */}
      <div className="flex gap-2 p-2 glass border border-primary/10 rounded-2xl w-max shadow-sm flex-wrap">
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
        
        {/* FAQs Tab */}
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
                  if (q && a) {
                    const newFaqs = [...faqs, { id: String(Date.now()), question: q, answer: a }];
                    saveFaqs(newFaqs);
                  }
                }}
                className="py-2 px-4 bg-primary text-white rounded-xl text-xs font-semibold flex items-center gap-1 hover:bg-primary-dark cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add FAQ
              </button>
            </div>

            <div className="space-y-4">
              {faqs.length === 0 ? (
                <p className="text-xs text-text-secondary">No FAQs available.</p>
              ) : (
                faqs.map((faq) => (
                  <div key={faq.id} className="p-4 bg-bg-surface/40 border border-bg-border rounded-2xl text-xs flex justify-between items-start gap-4">
                    <div className="space-y-1 flex-1">
                      <h4 className="font-bold text-text-primary">Q: {faq.question}</h4>
                      <p className="text-text-secondary">A: {faq.answer}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const newAns = prompt('Edit FAQ answer:', faq.answer);
                          if (newAns) {
                            const newFaqs = faqs.map(f => f.id === faq.id ? { ...f, answer: newAns } : f);
                            saveFaqs(newFaqs);
                          }
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg border border-bg-border text-text-secondary hover:text-primary cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this FAQ?')) {
                            saveFaqs(faqs.filter(f => f.id !== faq.id));
                          }
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg border border-bg-border text-text-secondary hover:text-error cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Banners Tab */}
        {activeTab === 'banners' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-bg-border">
              <div>
                <h3 className="text-base font-bold font-display text-text-primary">Marketing Banners</h3>
                <p className="text-xs text-text-secondary mt-0.5">Control image slides visible in the home screen carousel</p>
              </div>
              <button
                onClick={() => {
                  const url = prompt('Enter banner image URL:');
                  const link = prompt('Enter deep link URL (optional):', '');
                  if (url) {
                    const newBanners = [...banners, { id: String(Date.now()), imageUrl: url, linkUrl: link || '' }];
                    saveBanners(newBanners);
                  }
                }}
                className="py-2 px-4 bg-primary text-white rounded-xl text-xs font-semibold flex items-center gap-1 hover:bg-primary-dark cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Banner
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {banners.length === 0 ? (
                <p className="text-xs text-text-secondary">No banners available.</p>
              ) : (
                banners.map(banner => (
                  <div key={banner.id} className="relative group rounded-2xl overflow-hidden border border-bg-border">
                    <img src={banner.imageUrl} alt="Banner" className="w-full h-40 object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this banner?')) {
                            saveBanners(banners.filter(b => b.id !== banner.id));
                          }
                        }}
                        className="px-4 py-2 bg-error text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" /> Delete Banner
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Policies Tab */}
        {activeTab === 'policies' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-bg-border">
              <div>
                <h3 className="text-base font-bold font-display text-text-primary">Legal & Policies</h3>
                <p className="text-xs text-text-secondary mt-0.5">Update Privacy Policy and Terms of Service</p>
              </div>
              <button
                onClick={savePolicies}
                disabled={isSaving}
                className="py-2 px-4 bg-primary text-white rounded-xl text-xs font-semibold flex items-center gap-1 hover:bg-primary-dark cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Policies'}
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Privacy Policy Markdown</label>
                <textarea
                  rows={8}
                  value={privacyPolicy}
                  onChange={(e) => setPrivacyPolicy(e.target.value)}
                  className="w-full p-4 bg-bg-surface border border-bg-border rounded-2xl text-xs focus:outline-none focus:border-primary font-mono text-text-primary custom-scrollbar"
                  placeholder="# Privacy Policy..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Terms of Service Markdown</label>
                <textarea
                  rows={8}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full p-4 bg-bg-surface border border-bg-border rounded-2xl text-xs focus:outline-none focus:border-primary font-mono text-text-primary custom-scrollbar"
                  placeholder="# Terms of Service..."
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
