'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { DashboardStats } from '../../types';
import { useDesktopNotification } from '../../hooks/useDesktopNotification';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch real-time pending notification counts for the sidebar badges
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats-badges'],
    queryFn: async () => {
      const response = await api.get('/analytics/stats');
      return response.data.data;
    },
    enabled: isAuthenticated,
    refetchInterval: 10000, // Poll every 10 seconds for updates
  });

  const { data: unreadSupport } = useQuery({
    queryKey: ['support-unread-count'],
    queryFn: async () => {
      const response = await api.get('/support/tickets/unread-count');
      return response.data.data.count;
    },
    enabled: isAuthenticated,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const pendingCounts = {
    photos: stats?.pendingPhotos || 0,
    verifications: stats?.pendingVerifications || 0,
    reports: stats?.pendingReports || 0,
    support: unreadSupport || 0,
  };

  useDesktopNotification(unreadSupport || 0, 'New Support Ticket', 'You have unread support messages.');

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-surface">
        {/* Animated luxury branding spinner */}
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
        </div>
        <h2 className="text-sm font-semibold tracking-wide text-text-secondary uppercase">
          Securing Connection...
        </h2>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg-surface">
      {/* Sidebar Navigation */}
      <Sidebar pendingCounts={pendingCounts} />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Controls */}
        <TopBar />

        {/* Dynamic Nested Page Content */}
        <main className="flex-1 overflow-y-auto bg-bg-surface/40 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
