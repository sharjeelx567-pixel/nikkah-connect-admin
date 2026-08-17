'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../../services/api';
import { AppSettings } from '../../../types';
import { Save, ShieldAlert, Sliders, ToggleLeft, ToggleRight, Banknote } from 'lucide-react';

export default function SettingsPage() {
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch configs
  const { data, isLoading } = useQuery<AppSettings>({
    queryKey: ['app-configs'],
    queryFn: async () => {
      const response = await api.get('/settings');
      return response.data.data;
    },
  });

  // Mutate configs
  const updateMutation = useMutation({
    mutationFn: async (payload: Partial<AppSettings>) => {
      const response = await api.patch('/settings', payload);
      return response.data;
    },
    onSuccess: () => {
      setSuccessMsg('Configurations successfully dispatched to Flutter clients in real-time.');
      setTimeout(() => setSuccessMsg(''), 4000);
    },
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-60 bg-white/5 border border-primary/10 rounded-3xl shimmer" />
        <div className="h-60 bg-white/5 border border-primary/10 rounded-3xl shimmer" />
      </div>
    );
  }

  const handleToggle = (key: keyof AppSettings) => {
    if (typeof data[key] === 'boolean') {
      updateMutation.mutate({ [key]: !data[key] });
    }
  };

  const handleFlagToggle = (flagName: string) => {
    const updatedFlags = { ...data.featureFlags, [flagName]: !data.featureFlags[flagName] };
    updateMutation.mutate({ featureFlags: updatedFlags });
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Success banner notifications */}
      {successMsg && (
        <div className="p-4 bg-success/10 text-success border border-success/15 rounded-2xl text-xs font-semibold">
          {successMsg}
        </div>
      )}

      {/* Global State Toggles */}
      <div className="glass p-6 border border-primary/10 rounded-3xl shadow-neon-primary premium-card space-y-6">
        <div className="pb-4 border-b border-bg-border">
          <h3 className="text-base font-bold font-display text-text-primary">System Toggles</h3>
          <p className="text-xs text-text-secondary mt-0.5">Control administrative client behaviors</p>
        </div>

        {/* Fix 4: Make clear these toggles ARE functional */}
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-2xl text-[10px] text-primary font-medium flex items-start gap-2">
          <span className="text-base mt-0.5">✅</span>
          <span>
            <strong>These toggles ARE fully functional</strong> — they write live to your Firestore config document, and the Flutter app reads them on each launch. Changes take effect within 30 seconds. Toggle a setting to save it immediately.
          </span>
        </div>

        <div className="space-y-4">
          {[
            { key: 'maintenanceMode' as const, label: 'Maintenance Mode', desc: 'Lock the Flutter app and show a maintenance splash screen to all users.' },
            { key: 'allowRegistration' as const, label: 'Allow Registrations', desc: 'Temporarily allow or freeze new user account signups on the app.' },
            { key: 'matchingEnabled' as const, label: 'Match Algorithm', desc: 'Enable or freeze automated daily profile matching calculations.' },
            { key: 'chatEnabled' as const, label: 'Chat Messaging System', desc: 'Enable or disable the chat engine between matched members.' },
          ].map((toggle) => {
            const isActive = data[toggle.key];
            return (
              <div key={toggle.key} className="flex justify-between items-center text-xs gap-4 p-3 hover:bg-bg-surface/30 rounded-2xl transition-all">
                <div>
                  <h4 className="font-bold text-text-primary">{toggle.label}</h4>
                  <p className="text-[10px] text-text-secondary mt-0.5">{toggle.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle(toggle.key)}
                  className={`text-3xl transition-colors cursor-pointer ${isActive ? 'text-primary' : 'text-text-secondary/50'}`}
                >
                  {isActive ? <ToggleRight className="w-12 h-12" /> : <ToggleLeft className="w-12 h-12" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tiers Pricing parameters */}
      <div className="glass p-6 border border-primary/10 rounded-3xl shadow-neon-primary premium-card space-y-6">
        <div className="pb-4 border-b border-bg-border">
          <h3 className="text-base font-bold font-display text-text-primary">Premium subscription tiers rates</h3>
          <p className="text-xs text-text-secondary mt-0.5">Set package rates displayed inside Flutter premium paywalls</p>
        </div>

        <div className="grid grid-cols-2 gap-6 text-xs">
          <div>
            <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">Monthly Plan Rate (PKR)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary font-bold text-xs">
                Rs
              </span>
              <input
                type="number"
                step="0.01"
                defaultValue={data.premiumMonthlyPrice}
                onBlur={(e) => updateMutation.mutate({ premiumMonthlyPrice: Number(e.target.value) })}
                className="w-full pl-8 pr-4 py-2.5 bg-bg-surface border border-bg-border rounded-xl focus:outline-none focus:border-primary text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">Yearly Plan Rate (PKR)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary font-bold text-xs">
                Rs
              </span>
              <input
                type="number"
                step="0.01"
                defaultValue={data.premiumYearlyPrice}
                onBlur={(e) => updateMutation.mutate({ premiumYearlyPrice: Number(e.target.value) })}
                className="w-full pl-8 pr-4 py-2.5 bg-bg-surface border border-bg-border rounded-xl focus:outline-none focus:border-primary text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Matching Algorithm Configuration */}
      <div className="glass p-6 border border-primary/10 rounded-3xl shadow-neon-primary premium-card space-y-6">
        <div className="pb-4 border-b border-bg-border">
          <h3 className="text-base font-bold font-display text-text-primary">Matching Algorithm Controls</h3>
          <p className="text-xs text-text-secondary mt-0.5">Configure how distance and gender matching logic behaves</p>
        </div>

        <div className="grid grid-cols-1 gap-6 text-xs">
          <div>
            <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">Max Match Distance (KM)</label>
            <input
              type="number"
              step="1"
              defaultValue={data.maxMatchDistanceKm || 500}
              onBlur={(e) => updateMutation.mutate({ maxMatchDistanceKm: Number(e.target.value) })}
              className="w-full px-4 py-2.5 bg-bg-surface border border-bg-border rounded-xl focus:outline-none focus:border-primary text-xs"
            />
            <p className="text-[10px] text-text-secondary mt-1">Maximum allowed distance for matching profiles</p>
          </div>

          <div className="flex justify-between items-center text-xs p-3 bg-bg-surface/30 rounded-2xl border border-bg-border">
            <div>
              <h4 className="font-bold text-text-primary">Enforce Gender Matching</h4>
              <p className="text-[10px] text-text-secondary mt-0.5">Strictly match males with females and vice versa</p>
            </div>
            <button
              type="button"
              onClick={() => updateMutation.mutate({ enforceGenderMatching: !(data.enforceGenderMatching ?? true) })}
              className={`text-3xl transition-colors cursor-pointer ${data.enforceGenderMatching ?? true ? 'text-primary' : 'text-text-secondary/50'}`}
            >
              {data.enforceGenderMatching ?? true ? <ToggleRight className="w-12 h-12" /> : <ToggleLeft className="w-12 h-12" />}
            </button>
          </div>
        </div>
      </div>

      {/* Feature Flags indicators */}
      <div className="glass p-6 border border-primary/10 rounded-3xl shadow-neon-primary premium-card space-y-6">
        <div className="pb-4 border-b border-bg-border">
          <h3 className="text-base font-bold font-display text-text-primary">Extended Feature Flags</h3>
          <p className="text-xs text-text-secondary mt-0.5">Toggle beta features dynamically without code releases</p>
        </div>

        <div className="space-y-4">
          {Object.keys(data.featureFlags).map((flag) => {
            const isActive = data.featureFlags[flag];
            return (
              <div key={flag} className="flex justify-between items-center text-xs p-3 hover:bg-bg-surface/30 rounded-2xl transition-all">
                <div>
                  <h4 className="font-bold text-text-primary capitalize">{flag.replace(/([A-Z])/g, ' $1')}</h4>
                  <p className="text-[10px] text-text-secondary mt-0.5">Toggle dynamic flag value parameter: {String(isActive)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleFlagToggle(flag)}
                  className={`text-3xl transition-colors cursor-pointer ${isActive ? 'text-primary' : 'text-text-secondary/50'}`}
                >
                  {isActive ? <ToggleRight className="w-12 h-12" /> : <ToggleLeft className="w-12 h-12" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
