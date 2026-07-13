'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Search, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function TopBar() {
  const pathname = usePathname();
  const { admin } = useAuthStore();

  const getPageTitle = () => {
    switch (pathname) {
      case '/':
        return 'System Overview';
      case '/users':
        return 'User Management';
      case '/photos':
        return 'Photo Moderation';
      case '/verification':
        return 'Verification Center';
      case '/chats':
        return 'Chat Moderation';
      case '/reports':
        return 'Reports Center';
      case '/premium':
        return 'Premium Analytics';
      case '/notifications':
        return 'Push Notifications';
      case '/content':
        return 'Content Management';
      case '/settings':
        return 'App Configurations';
      default:
        return 'Dashboard';
    }
  };

  const getTodayDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return new Date().toLocaleDateString('en-US', options);
  };

  return (
    <header className="h-20 border-b border-primary/10 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-40">
      <div>
        <h1 className="text-xl font-bold font-display text-text-primary tracking-tight">
          {getPageTitle()}
        </h1>
        <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mt-0.5">
          {getTodayDate()}
        </p>
      </div>

      <div className="flex items-center gap-6">
        {/* Search bar light input */}
        <div className="relative w-64">
          <Search className="absolute left-3 inset-y-0 my-auto w-4.5 h-4.5 text-text-secondary" />
          <input
            type="text"
            placeholder="Search console..."
            className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-primary/10 rounded-xl text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary/30 transition-all"
          />
        </div>

        {/* Notifications Button */}
        <button className="relative p-2 hover:bg-slate-100 rounded-xl transition-all text-text-secondary hover:text-text-primary cursor-pointer border border-transparent hover:border-primary/5">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-secondary ring-2 ring-white" />
        </button>

        {/* Secure badge */}
        <div className="flex items-center gap-2 py-1.5 px-3 bg-primary/10 text-primary border border-primary/20 rounded-xl shadow-neon-primary">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-[9px] font-bold tracking-widest uppercase text-primary">
            {admin?.role === 'super_admin' ? 'SECURE ROOT' : 'VERIFIED STACK'}
          </span>
        </div>
      </div>
    </header>
  );
}
