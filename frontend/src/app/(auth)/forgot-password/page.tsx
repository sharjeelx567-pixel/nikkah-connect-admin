'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    // Simulate API request - actual triggers would verify admin account and call Firebase reset email
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1200);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-bg-surface overflow-hidden px-4">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-secondary p-[2px] mb-4 shadow-luxury">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <span className="text-2xl font-extrabold bg-gradient-to-tr from-primary to-secondary bg-clip-text text-transparent">N</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-text-primary">
            Reset Password
          </h1>
          <p className="text-text-secondary mt-2 text-sm">
            Retrieve access to NikkahConnect Admin
          </p>
        </div>

        <div className="glass rounded-3xl p-8 shadow-premium border border-bg-border relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/50 to-secondary/50" />

          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <p className="text-text-secondary text-sm">
                Enter your registered admin email address below, and we will send you instructions to reset your password.
              </p>
              <div>
                <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-2">
                  Admin Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@nikkahconnect.com"
                    className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-bg-border text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary text-white rounded-xl font-semibold text-sm shadow-luxury hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-success/15 flex items-center justify-center text-success">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-text-primary">Check your Inbox</h3>
                <p className="text-text-secondary text-sm">
                  We have sent password reset instructions to <span className="font-semibold text-text-primary">{email}</span> if it is registered in our database.
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-bg-border">
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition-colors font-medium cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
