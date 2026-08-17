'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldCheck, Bell } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { admin } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await api.get('/admin-alerts/unread-count');
        if (res.data?.count !== undefined) {
          setUnreadCount(res.data.count);
        }
      } catch (err) {
        // ignore errors
      }
    };
    fetchUnread();
    // Poll every 30 seconds instead of websocket to avoid firestore rules
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

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
      case '/admin-alerts':
        return 'Admin Alerts';
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

      <div className="flex items-center gap-6 flex-1 justify-end">
        {/* Notifications Bell */}
        <button 
          onClick={() => router.push('/admin-alerts')}
          className="relative p-2 text-text-secondary hover:text-primary hover:bg-primary/5 rounded-full transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1.5 w-2.5 h-2.5 bg-error rounded-full border-2 border-white animate-pulse shadow-[0_0_8px_rgba(255,75,75,0.6)]"></span>
          )}
        </button>

        <div className="h-6 w-px bg-bg-border mx-2"></div>

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
