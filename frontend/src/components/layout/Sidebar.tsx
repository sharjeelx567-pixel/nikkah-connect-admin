'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Image,
  ShieldCheck,
  MessageSquare,
  AlertTriangle,
  CreditCard,
  Bell,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LifeBuoy,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  badgeKey?: string;
  role?: string[];
}

export default function Sidebar({ pendingCounts }: { pendingCounts?: Record<string, number> }) {
  const pathname = usePathname();
  const { admin, logout } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') {
      setIsCollapsed(true);
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  const menuItems: SidebarItem[] = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Users', href: '/users', icon: Users },
    { name: 'Photo Approval', href: '/photos', icon: Image, badgeKey: 'photos' },
    { name: 'Verification Center', href: '/verification', icon: ShieldCheck, badgeKey: 'verifications' },
    { name: 'Chat Moderation', href: '/chats', icon: MessageSquare },
    { name: 'Reports', href: '/reports', icon: AlertTriangle, badgeKey: 'reports' },
    { name: 'Support', href: '/support', icon: LifeBuoy, badgeKey: 'support' },
    { name: 'Premium Management', href: '/premium', icon: CreditCard },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'Content Management', href: '/content', icon: FileText },
    { name: 'Admin Management', href: '/admins', icon: ShieldCheck, role: ['super_admin'] },
    { name: 'App Settings', href: '/settings', icon: Settings, role: ['super_admin'] },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.role) return true;
    return admin && item.role.includes(admin.role);
  });

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 80 : 288 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="border-r border-primary/10 bg-white flex flex-col h-screen sticky top-0 flex-shrink-0 z-30"
    >
      {/* Header section with Recode-inspired pointing arrow banner */}
      <div className="h-24 flex items-center relative pr-4">
        <AnimatePresence mode="wait">
          {!isCollapsed ? (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-[90%] py-4 pl-6 bg-gradient-to-r from-primary to-primary-light text-white recode-arrow shadow-neon-primary relative flex items-center justify-between"
            >
              <div>
                <span className="font-extrabold font-display tracking-tight text-lg">
                  RECODE
                </span>
                <span className="block text-[8px] font-bold text-accent tracking-widest uppercase">
                  NikkahConnect
                </span>
              </div>
              <Sparkles className="w-5 h-5 text-accent animate-pulse mr-8" />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-neon-primary"
            >
              <span className="text-sm font-black text-white">NC</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main navigation list */}
      <nav className="flex-1 px-4 py-4 overflow-y-auto space-y-[4px] custom-scrollbar">
        {filteredMenuItems.map((item) => {
          const isActive = pathname === item.href;
          const count = pendingCounts && item.badgeKey ? pendingCounts[item.badgeKey] : 0;

          return (
            <Link key={item.href} href={item.href} className="relative block group">
              <span
                className={`flex items-center justify-between px-3.5 py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                  isActive
                    ? 'text-primary bg-primary/10 border border-primary/15 shadow-sm'
                    : 'text-[#8B88A0] hover:text-text-primary hover:bg-primary/5'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <item.icon className={`w-[18px] h-[18px] flex-shrink-0 transition-all duration-200 group-hover:scale-105 ${isActive ? 'text-primary' : 'text-[#8B88A0] group-hover:text-text-primary'}`} />
                  
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="whitespace-nowrap text-left"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                {count > 0 && (
                  <span className={`flex items-center justify-center rounded-full bg-gradient-to-r from-secondary to-secondary-dark text-[8px] font-extrabold text-white shadow-md ${
                    isCollapsed 
                      ? 'absolute top-1 right-1 w-3.5 h-3.5' 
                      : 'min-w-5 h-5 px-1.5'
                  }`}>
                    {count}
                  </span>
                )}
              </span>

              {/* Tooltip for collapsed mode */}
              {isCollapsed && (
                <div className="absolute left-20 top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-white border border-primary/10 text-text-primary text-[9px] font-bold tracking-widest uppercase rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-neon-primary whitespace-nowrap">
                  {item.name}
                </div>
              )}

              {isActive && (
                <motion.div
                  layoutId="active-sidebar-indicator"
                  className="absolute left-0 top-[20%] bottom-[20%] w-[3px] bg-primary-light rounded-r"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Admin Profile Details and Collapse Button footer */}
      <div className="p-4 border-t border-primary/10 bg-white/2 space-y-3">
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <Link href="/profile" className="block">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/15 rounded-2xl shadow-sm hover:bg-primary/10 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {admin?.displayName?.charAt(0) || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-text-primary truncate">
                    {admin?.displayName || 'Admin'}
                  </h4>
                  <span className="text-[9px] text-text-secondary font-bold tracking-wider uppercase block">
                    {admin?.role?.replace('_', ' ') || 'Moderator'}
                  </span>
                </div>
              </motion.div>
            </Link>
          )}
        </AnimatePresence>

        {/* Action controls row */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={logout}
            className={`flex items-center gap-3 py-2.5 px-3.5 text-[10px] uppercase font-bold tracking-widest text-[#8B88A0] hover:text-error hover:bg-error/5 rounded-xl transition-all cursor-pointer ${
              isCollapsed ? 'mx-auto justify-center w-full' : 'flex-1'
            }`}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>

          <button
            onClick={toggleCollapse}
            className="p-2 hover:bg-slate-100 border border-primary/10 rounded-xl text-[#8B88A0] hover:text-text-primary transition-colors cursor-pointer hidden md:block"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
