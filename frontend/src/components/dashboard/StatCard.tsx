'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: string;
    type: 'up' | 'down';
  };
  colorTheme?: 'primary' | 'secondary' | 'accent' | 'success';
}

const AnimatedCounter = ({ endValue }: { endValue: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1200;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * endValue));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [endValue]);

  return <>{count.toLocaleString()}</>;
};

export default function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  colorTheme = 'primary',
}: StatCardProps) {
  const isNumeric = typeof value === 'number';

  const getColors = () => {
    switch (colorTheme) {
      case 'secondary':
        return {
          bg: 'bg-secondary/15 text-secondary',
          border: 'border-secondary/20 hover:border-secondary/40',
          glow: 'hover:shadow-[0_10px_30px_-10px_rgba(255,107,157,0.15)]',
          topLine: 'group-hover:via-secondary/50',
        };
      case 'accent':
        return {
          bg: 'bg-accent/15 text-accent-dark',
          border: 'border-accent/20 hover:border-accent/40',
          glow: 'hover:shadow-[0_10px_30px_-10px_rgba(255,215,0,0.15)]',
          topLine: 'group-hover:via-accent/50',
        };
      case 'success':
        return {
          bg: 'bg-success/15 text-success',
          border: 'border-success/20 hover:border-success/40',
          glow: 'hover:shadow-[0_10px_30px_-10px_rgba(34,197,94,0.15)]',
          topLine: 'group-hover:via-success/50',
        };
      default:
        return {
          bg: 'bg-primary/15 text-primary',
          border: 'border-primary/20 hover:border-primary/40',
          glow: 'hover:shadow-[0_10px_30px_-10px_rgba(108,71,255,0.15)]',
          topLine: 'group-hover:via-primary/50',
        };
    }
  };

  const theme = getColors();

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`glass p-6 rounded-3xl transition-all duration-300 relative overflow-hidden group cursor-pointer premium-card ${theme.border} ${theme.glow}`}
    >
      {/* Top border ambient gradient line */}
      <div className={`absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-transparent to-transparent ${theme.topLine} transition-all duration-500`} />

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">
            {title}
          </span>
          <h3 className="text-3xl font-bold font-display text-text-primary tracking-tight">
            {isNumeric ? <AnimatedCounter endValue={value as number} /> : value}
          </h3>
        </div>

        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${theme.bg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(description || trend) && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-primary/10 text-xs">
          {trend && (
            <span className={`font-bold px-2 py-0.5 rounded-lg text-[9px] uppercase tracking-wider ${
              trend.type === 'up' ? 'text-success bg-success/10 border border-success/15' : 'text-error bg-error/10 border border-error/15'
            }`}>
              {trend.value}
            </span>
          )}
          {description && (
            <span className="text-text-secondary font-bold text-[9px] uppercase tracking-wider">
              {description}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
