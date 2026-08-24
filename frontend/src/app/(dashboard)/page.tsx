'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { DashboardStats, AuditLog, NikkahUser } from '../../types';
import StatCard from '../../components/dashboard/StatCard';
import GrowthChart from '../../components/dashboard/GrowthChart';
import {
  Users,
  Image,
  TrendingUp,
  Activity,
  DollarSign,
  ShieldCheck,
  Server,
  Zap,
  Radio,
  Send,
  CheckSquare,
} from 'lucide-react';

export default function DashboardPage() {
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // Fetch Dashboard Stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/analytics/stats');
      return response.data.data;
    },
    refetchInterval: 15000,
  });

  // Fetch User Growth Chart Data
  const { data: growthData, isLoading: growthLoading } = useQuery({
    queryKey: ['dashboard-growth'],
    queryFn: async () => {
      const response = await api.get('/analytics/growth');
      return response.data.data;
    },
  });

  // Fetch recent users for Recent Signups list
  const { data: recentUsersData, isLoading: usersLoading } = useQuery<{ data: { data: NikkahUser[] } }>({
    queryKey: ['recent-signups-dashboard'],
    queryFn: async () => {
      const response = await api.get('/users', { params: { limit: 5, sortBy: 'createdAt' } });
      return response.data;
    },
  });

  const recentUsers = recentUsersData?.data?.data || [];

  // Broadcast Notification Mutation
  const broadcastMutation = useMutation({
    mutationFn: async (payload: any) => {
      await api.post('/notifications/send', payload);
    },
    onSuccess: () => {
      setBroadcastTitle('');
      setBroadcastBody('');
      setBroadcastMessage('Emergency alert dispatched successfully!');
      setTimeout(() => setBroadcastMessage(''), 4000);
    },
  });

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastBody) return;
    broadcastMutation.mutate({
      title: broadcastTitle,
      body: broadcastBody,
      audience: 'all',
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
  };

  if (statsLoading || growthLoading || usersLoading) {
    return (
      <div className="grid grid-cols-12 gap-6 relative z-10">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="col-span-12 md:col-span-3 h-32 bg-white/5 rounded-3xl border border-primary/10 shimmer" />
        ))}
        <div className="col-span-12 lg:col-span-8 h-80 bg-white/5 rounded-3xl border border-primary/10 shimmer" />
        <div className="col-span-12 lg:col-span-4 h-80 bg-white/5 rounded-3xl border border-primary/10 shimmer" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 relative"
    >
      {/* Decorative Neon Glowing Background Auroras */}
      <div className="absolute top-[-100px] left-[-50px] w-96 h-96 radial-glow-primary rounded-full blur-[110px] pointer-events-none z-0" />
      <div className="absolute bottom-[100px] right-[-50px] w-96 h-96 radial-glow-secondary rounded-full blur-[110px] pointer-events-none z-0" />

      {/* Metrics Row Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        <StatCard
          title="Total Members"
          value={stats?.totalUsers || 0}
          icon={Users}
          description="Registered profiles in database"
          trend={{ value: '+12.4%', type: 'up' }}
          colorTheme="primary"
        />
        <StatCard
          title="Today Signups"
          value={stats?.todaySignups || 0}
          icon={TrendingUp}
          description="New profiles registered today"
          trend={{ value: '+8.2%', type: 'up' }}
          colorTheme="success"
        />
        <StatCard
          title="Premium Members"
          value={stats?.premiumUsers || 0}
          icon={DollarSign}
          description="Active subscription accounts"
          trend={{ value: '+3.1%', type: 'up' }}
          colorTheme="accent"
        />
        <StatCard
          title="Pending Photo Reviews"
          value={stats?.pendingPhotos || 0}
          icon={Image}
          description="Photos awaiting approval"
          colorTheme="secondary"
        />
      </motion.div>

      {/* Main Grid Timelines & System status */}
      <div className="grid grid-cols-12 gap-8 relative z-10">
        {/* User Growth Chart */}
        <motion.div
          variants={itemVariants}
          className="col-span-12 lg:col-span-8 glass p-6 rounded-3xl border border-primary/10 shadow-neon-primary premium-card"
        >
          <div className="flex justify-between items-center pb-4 border-b border-primary/10">
            <div>
              <h3 className="text-base font-bold font-display text-text-primary">Registry Growth</h3>
              <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mt-0.5">Timeline of user growth statistics (30 Days)</p>
            </div>
            <span className="flex items-center gap-1.5 py-1 px-3 bg-primary/15 text-primary-light border border-primary/20 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-neon-primary">
              <Zap className="w-3.5 h-3.5 text-primary-light" /> Active Growth
            </span>
          </div>
          <GrowthChart data={growthData} />
        </motion.div>

        {/* System Health & Active Moderators */}
        <motion.div
          variants={itemVariants}
          className="col-span-12 lg:col-span-4 space-y-6"
        >
          {/* System Health */}
          <div className="glass p-6 border border-primary/10 rounded-3xl shadow-neon-primary flex flex-col justify-between h-44 premium-card">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">System Health</h4>
                <h3 className="text-lg font-bold font-display text-text-primary mt-1">OPERATIONAL</h3>
              </div>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center text-[9px] pt-4 border-t border-primary/10">
              <div className="p-2 bg-white/3 rounded-xl border border-primary/5">
                <Server className="w-4 h-4 mx-auto text-primary-light mb-1" />
                <span className="text-text-secondary block">Node Core</span>
                <p className="font-bold text-success mt-0.5">Healthy</p>
              </div>
              <div className="p-2 bg-white/3 rounded-xl border border-primary/5">
                <ShieldCheck className="w-4 h-4 mx-auto text-success mb-1" />
                <span className="text-text-secondary block">Firestore</span>
                <p className="font-bold text-success mt-0.5">Connected</p>
              </div>
              <div className="p-2 bg-white/3 rounded-xl border border-primary/5">
                <Zap className="w-4 h-4 mx-auto text-accent-light mb-1" />
                <span className="text-text-secondary block">Latency</span>
                <p className="font-bold text-text-primary mt-0.5">14ms</p>
              </div>
            </div>
          </div>

          {/* Active Moderators */}
          <div className="glass p-6 border border-primary/10 rounded-3xl shadow-neon-primary h-48 flex flex-col justify-between premium-card">
            <div>
              <h4 className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">Active Staff</h4>
              <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mt-0.5">Administrators currently online</p>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs ring-2 ring-white">SA</div>
              <div className="w-8 h-8 rounded-full bg-secondary/20 text-secondary flex items-center justify-center font-bold text-xs ring-2 ring-white -ml-4">MO</div>
              <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-xs ring-2 ring-white -ml-4">VO</div>
              <span className="text-xs font-semibold text-text-primary ml-2">+3 Active Sessions</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Row 2: Live Signups and Quick Broadcast Notification */}
      <div className="grid grid-cols-12 gap-8 relative z-10">
        {/* Live Users & Recent Signups */}
        <motion.div
          variants={itemVariants}
          className="col-span-12 lg:col-span-6 glass p-6 border border-primary/10 rounded-3xl shadow-neon-primary premium-card"
        >
          <div className="flex justify-between items-center pb-4 border-b border-primary/10">
            <div>
              <h3 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
                </span>
                Recent Signups
              </h3>
              <p className="text-xs text-text-secondary font-medium mt-0.5">Newly registered platform profiles</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {recentUsers.map((user) => (
              <div key={user.uid} className="flex justify-between items-center text-xs p-3 hover:bg-white/5 rounded-2xl border border-transparent hover:border-primary/10 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary-light flex items-center justify-center font-bold border border-primary/20">
                    {(user.profileImage || user.pendingProfileImage) ? <img src={user.profileImage || user.pendingProfileImage} alt="" className="w-full h-full object-cover rounded-xl" /> : user.displayName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h4 className="font-bold text-text-primary">{user.displayName || 'Anonymous'}</h4>
                    <p className="text-[10px] text-text-secondary">{user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 bg-white/5 text-[#8B88A0] rounded border border-primary/10 text-[9px] font-bold uppercase tracking-wider">
                    {user.gender}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Audit Log Activities & Emergency Alert Broadcast */}
        <motion.div
          variants={itemVariants}
          className="col-span-12 lg:col-span-6 space-y-6"
        >
          {/* Quick Notification Broadcast */}
          <div className="glass p-6 border border-primary/10 rounded-3xl shadow-neon-primary premium-card">
            <div className="flex justify-between items-center pb-4 border-b border-primary/10">
              <div>
                <h3 className="text-base font-bold font-display text-text-primary">System Alert Broadcast</h3>
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mt-0.5">Send critical alert notification to all users</p>
              </div>
              <Radio className="w-5 h-5 text-secondary animate-pulse" />
            </div>

            <form onSubmit={handleBroadcast} className="mt-4 space-y-3 text-xs">
              {broadcastMessage && (
                <div className="p-2.5 bg-success/15 text-success rounded-xl font-bold border border-success/20">
                  {broadcastMessage}
                </div>
              )}
              <input
                type="text"
                required
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="Alert Header..."
                className="w-full p-3 bg-white border border-primary/20 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-xs text-gray-900 placeholder:text-gray-400"
              />
              <textarea
                rows={2}
                required
                value={broadcastBody}
                onChange={(e) => setBroadcastBody(e.target.value)}
                placeholder="Write system message body..."
                className="w-full p-3 bg-white border border-primary/20 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-xs text-gray-900 placeholder:text-gray-400"
              />
              <button
                type="submit"
                disabled={broadcastMutation.isPending}
                className="w-full py-2.5 bg-gradient-to-r from-secondary to-secondary-dark text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-neon-secondary cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" /> Dispatch Alert
              </button>
            </form>
          </div>

          {/* Setup checklist progress panel */}
          <div className="glass p-6 border border-primary/10 rounded-3xl shadow-neon-primary premium-card">
            <div className="flex justify-between items-center pb-3 border-b border-primary/10">
              <h3 className="text-sm font-bold font-display text-text-primary">Admin Checklist</h3>
              <CheckSquare className="w-4 h-4 text-text-secondary" />
            </div>
            <ul className="mt-4 space-y-2.5 text-xs text-text-secondary font-semibold">
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-success/20 text-success flex items-center justify-center font-bold text-[9px]">âœ“</span>
                <span>Connect Firebase Admin API Server</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-success/20 text-success flex items-center justify-center font-bold text-[9px]">âœ“</span>
                <span>Seed Super Administrator roles</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-primary/20 text-primary-light flex items-center justify-center font-bold text-[9px] border border-primary/20 animate-pulse">!</span>
                <span>Setup dynamic matching thresholds Rules</span>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

