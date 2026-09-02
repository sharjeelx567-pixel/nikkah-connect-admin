"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";
import { auth } from "../../../config/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { APP_NAME } from "../../../config/branding";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, email);
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/8 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
            Reset Password
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Retrieve access to {APP_NAME} Admin Console
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/60 border border-slate-200/80">
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Enter your registered admin email address below, and we will dispatch a secure link to reset your console password.
              </p>

              {error && (
                <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs border border-rose-200 font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Admin Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@nikkahconnect.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Dispatch Password Reset Link"
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">Check your Inbox</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  We have dispatched reset instructions to <strong className="text-slate-800">{email}</strong> if it is registered in our database.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <button
              onClick={() => router.push("/login")}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-semibold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Login
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
