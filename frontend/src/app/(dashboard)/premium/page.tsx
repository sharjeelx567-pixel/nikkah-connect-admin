'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, DollarSign, Users, Award, TrendingUp, ShieldCheck } from 'lucide-react';
import StatCard from '../../../components/dashboard/StatCard';

interface PlanDetails {
  name: string;
  price: string;
  subscribers: number;
  revenue: string;
}

export default function PremiumPage() {
  const plans: PlanDetails[] = [
    { name: 'NikkahConnect Plus (Monthly)', price: '$9.99/mo', subscribers: 1240, revenue: '$12,387' },
    { name: 'NikkahConnect Premium (Annual)', price: '$79.99/yr', subscribers: 450, revenue: '$35,995' },
  ];

  return (
    <div className="space-y-8">
      {/* Monetization overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Platform Revenue"
          value="$48,382"
          icon={DollarSign}
          description="Net cumulative subscription sales"
          colorTheme="success"
        />
        <StatCard
          title="Premium Subscriptions"
          value="1,690"
          icon={Sparkles}
          description="Active paying subscribers"
          colorTheme="accent"
        />
        <StatCard
          title="Monthly Recurring Revenue"
          value="$15,387"
          icon={TrendingUp}
          description="MRR growth timeline estimation"
          colorTheme="primary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Plans configuration details */}
        <div className="lg:col-span-2 glass p-6 border border-primary/10 rounded-3xl shadow-neon-primary premium-card">
          <div className="flex justify-between items-center pb-4 border-b border-bg-border">
            <div>
              <h3 className="text-base font-bold font-display text-text-primary">Subscription Plan Tiers</h3>
              <p className="text-xs text-text-secondary mt-0.5">Details and sales metrics by tier</p>
            </div>
            <span className="p-1 px-3 bg-accent/10 text-accent-dark font-bold text-[10px] rounded-full uppercase tracking-wider">Pricing Configuration</span>
          </div>

          <div className="mt-6 space-y-4">
            {plans.map((plan, idx) => (
              <div key={idx} className="p-4 border border-bg-border rounded-2xl hover:bg-bg-surface/30 transition-all flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-text-primary">{plan.name}</h4>
                    <p className="text-xs text-text-secondary">Price Rate: {plan.price}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold text-text-primary">{plan.subscribers} Members</p>
                  <p className="text-[10px] text-text-secondary font-medium">Revenue contribution: {plan.revenue}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mock Transaction Feed */}
        <div className="glass p-6 border border-primary/10 rounded-3xl shadow-neon-primary premium-card flex flex-col h-[350px]">
          <div className="pb-4 border-b border-bg-border">
            <h3 className="text-base font-bold font-display text-text-primary">Recent Transactions</h3>
            <p className="text-xs text-text-secondary mt-0.5">Sales logs from Google Play / App Store</p>
          </div>

          <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
            {[
              { email: 'sarah@gmail.com', plan: 'Plus (Monthly)', amount: '$9.99', date: 'Just now' },
              { email: 'imran.khan@gmail.com', plan: 'Premium (Annual)', amount: '$79.99', date: '10 mins ago' },
              { email: 'zainab12@yahoo.com', plan: 'Plus (Monthly)', amount: '$9.99', date: '1 hour ago' },
            ].map((tx, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-text-primary">{tx.email}</p>
                  <p className="text-[10px] text-text-secondary">{tx.plan}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-success">{tx.amount}</p>
                  <p className="text-[9px] text-text-secondary">{tx.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
