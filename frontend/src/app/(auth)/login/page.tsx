'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../../store/authStore';
import { Eye, EyeOff, Lock, Mail, ShieldAlert, CheckCircle2, ChevronDown } from 'lucide-react';
import api from '../../../services/api';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, error } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('super_admin');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!email || !password) {
      setLocalError('Please fill in all fields.');
      return;
    }

    setIsProcessing(true);

    try {
      // Create or update the user first
      try {
        await api.post('/auth/register', { email, password, role });
      } catch (err: any) {
        setLocalError(err.response?.data?.error || 'Authentication setup failed.');
        setIsProcessing(false);
        return;
      }

      // Proceed to login via Firebase
      const success = await login(email, password, rememberMe);
      if (success) {
        router.replace('/');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const roles = [
    { id: 'super_admin', label: 'Super Admin' },
    { id: 'admin', label: 'Administrator' },
    { id: 'moderator', label: 'Content Moderator' },
    { id: 'support_agent', label: 'Support Agent' },
    { id: 'verification_officer', label: 'Verification Officer' },
    { id: 'content_manager', label: 'Content Manager' },
    { id: 'finance_manager', label: 'Finance Manager' }
  ];

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-50 overflow-hidden px-4 py-8 font-sans">
      {/* Immersive background effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-slate-50 to-slate-100 pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] pointer-events-none mix-blend-multiply" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/20 blur-[120px] pointer-events-none mix-blend-multiply" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[460px] z-10"
      >
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-primary to-secondary p-[1px] mb-6 shadow-luxury"
          >
            <div className="w-full h-full bg-white rounded-[15px] flex items-center justify-center overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
              <span className="text-3xl font-extrabold bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent relative z-10">N</span>
            </div>
          </motion.div>
          
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            Sign in to the NikkahConnect Management Portal
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-2xl rounded-[24px] p-8 shadow-2xl shadow-slate-200/50 border border-slate-200/60 relative">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {(error || localError) && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100"
                >
                  <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{localError || error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                Portal Role
              </label>
              <div className="relative group">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full h-[52px] pl-4 pr-10 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all appearance-none cursor-pointer font-semibold shadow-sm"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400 group-hover:text-slate-600 transition-colors">
                  <ChevronDown className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                Work Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 group-focus-within:text-primary transition-colors pointer-events-none">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your work email"
                  className="w-full h-[52px] pl-11 pr-4 bg-slate-50 hover:bg-slate-100 focus:bg-white rounded-2xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Password
                </label>
                <a
                  href="/forgot-password"
                  className="text-xs text-primary hover:text-primary-dark font-bold transition-colors"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 group-focus-within:text-primary transition-colors pointer-events-none">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-[52px] pl-11 pr-11 bg-slate-50 hover:bg-slate-100 focus:bg-white rounded-2xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center pt-2">
              <label className="flex items-center cursor-pointer group">
                <div className="relative flex items-center justify-center w-5 h-5 rounded border border-slate-300 bg-white group-hover:border-primary transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <AnimatePresence>
                    {rememberMe && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute inset-0 bg-primary flex items-center justify-center rounded-[3px]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <span className="ml-3 text-sm text-slate-500 group-hover:text-slate-700 transition-colors font-bold">
                  Remember my device
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || isProcessing}
              className="w-full h-[52px] mt-4 bg-gradient-to-r from-primary to-secondary hover:from-primary-dark hover:to-primary text-white rounded-2xl font-bold text-[15px] shadow-luxury hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {(isLoading || isProcessing) ? (
                <div className="w-5 h-5 border-[2.5px] border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Secure Login'
              )}
            </button>
          </form>
        </div>
        
        <p className="text-center text-slate-400 text-xs font-bold mt-8">
          Protected by Enterprise Grade Security
        </p>
      </motion.div>
    </div>
  );
}
