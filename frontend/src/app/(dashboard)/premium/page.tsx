'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Banknote, Users, Award, TrendingUp, ShieldCheck } from 'lucide-react';
import StatCard from '../../../components/dashboard/StatCard';
import { db } from '../../../config/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

interface PlanDetails {
  id: string;
  name: string;
  price: string;
  subscribers: number;
  revenue: number;
}

interface Transaction {
  id: string;
  email: string;
  planName: string;
  amount: number;
  status: 'active' | 'failed' | 'expired';
  createdAt: any;
}

export default function PremiumPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [mrr, setMrr] = useState(0);
  const [activeSubscribers, setActiveSubscribers] = useState(0);
  const [plans, setPlans] = useState<PlanDetails[]>([]);

  useEffect(() => {
    // Listen to real subscriptions/transactions from Firestore
    const q = query(collection(db, 'subscriptions'), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs: Transaction[] = [];
      let totalRev = 0;
      let monthlyRev = 0;
      let activeSubs = 0;
      
      const planStats: Record<string, { name: string; price: number; count: number; rev: number }> = {};

      snapshot.forEach(doc => {
        const data = doc.data();
        const tx: Transaction = {
          id: doc.id,
          email: data.userEmail || 'Unknown User',
          planName: data.planName || 'Premium Plan',
          amount: data.amountPKR || 0,
          status: data.status || 'active',
          createdAt: data.createdAt
        };
        txs.push(tx);

        if (tx.status === 'active') {
          activeSubs++;
          totalRev += tx.amount;
          if (tx.planName.toLowerCase().includes('month')) {
            monthlyRev += tx.amount;
          } else if (tx.planName.toLowerCase().includes('year')) {
            monthlyRev += tx.amount / 12;
          }

          if (!planStats[tx.planName]) {
            planStats[tx.planName] = { name: tx.planName, price: tx.amount, count: 0, rev: 0 };
          }
          planStats[tx.planName].count++;
          planStats[tx.planName].rev += tx.amount;
        }
      });

      setTransactions(txs);
      setTotalRevenue(totalRev);
      setMrr(monthlyRev);
      setActiveSubscribers(activeSubs);

      const plansArray: PlanDetails[] = Object.keys(planStats).map(key => ({
        id: key,
        name: planStats[key].name,
        price: `Rs ${planStats[key].price}`,
        subscribers: planStats[key].count,
        revenue: planStats[key].rev
      }));
      
      // If no data, show empty state instead of dummy
      setPlans(plansArray);
    }, (error) => {
      console.error("Error fetching subscriptions:", error);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-8">
      {/* Monetization overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Platform Revenue"
          value={`Rs ${totalRevenue.toLocaleString()}`}
          icon={Banknote}
          description="Net cumulative subscription sales"
          colorTheme="success"
        />
        <StatCard
          title="Premium Subscriptions"
          value={activeSubscribers.toLocaleString()}
          icon={Sparkles}
          description="Active paying subscribers"
          colorTheme="accent"
        />
        <StatCard
          title="Monthly Recurring Revenue"
          value={`Rs ${Math.round(mrr).toLocaleString()}`}
          icon={TrendingUp}
          description="Estimated MRR"
          colorTheme="primary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Plans configuration details */}
        <div className="lg:col-span-2 glass p-6 border border-primary/10 rounded-3xl shadow-neon-primary premium-card">
          <div className="flex justify-between items-center pb-4 border-b border-bg-border">
            <div>
              <h3 className="text-base font-bold font-display text-text-primary">Subscription Plan Tiers</h3>
              <p className="text-xs text-text-secondary mt-0.5">Real-time metrics from Firestore</p>
            </div>
            <span className="p-1 px-3 bg-accent/10 text-accent-dark font-bold text-[10px] rounded-full uppercase tracking-wider">Active</span>
          </div>

          <div className="mt-6 space-y-4">
            {plans.length === 0 ? (
              <p className="text-center text-sm text-text-secondary py-8">No active subscriptions found.</p>
            ) : (
              plans.map((plan, idx) => (
                <div key={idx} className="p-4 border border-bg-border rounded-2xl hover:bg-bg-surface/30 transition-all flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-text-primary">{plan.name}</h4>
                      <p className="text-xs text-text-secondary">Rate: {plan.price}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-text-primary">{plan.subscribers} Members</p>
                    <p className="text-[10px] text-text-secondary font-medium">Revenue: Rs {plan.revenue.toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Real-time Transaction Feed */}
        <div className="glass p-6 border border-primary/10 rounded-3xl shadow-neon-primary premium-card flex flex-col h-[400px]">
          <div className="pb-4 border-b border-bg-border">
            <h3 className="text-base font-bold font-display text-text-primary">Live Transactions</h3>
            <p className="text-xs text-text-secondary mt-0.5">Recent subscriptions in PKR</p>
          </div>

          <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1 custom-scrollbar">
            {transactions.length === 0 ? (
              <p className="text-center text-sm text-text-secondary py-8">No recent transactions.</p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center text-xs p-2 hover:bg-bg-surface/50 rounded-lg">
                  <div>
                    <p className="font-bold text-text-primary">{tx.email}</p>
                    <p className="text-[10px] text-text-secondary">{tx.planName}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${tx.status === 'active' ? 'text-success' : 'text-error'}`}>
                      Rs {tx.amount.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-text-secondary capitalize">{tx.status}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
