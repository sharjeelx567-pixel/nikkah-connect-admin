"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: string;
    type: "up" | "down";
  };
  colorTheme?: "primary" | "secondary" | "accent" | "success" | "warning";
}

const AnimatedCounter = ({ endValue }: { endValue: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 900;

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
  colorTheme = "primary",
}: StatCardProps) {
  const isNumeric = typeof value === "number";

  const getThemeClasses = () => {
    switch (colorTheme) {
      case "secondary":
        return {
          iconBg: "bg-pink-50 text-pink-600",
          ring: "hover:border-pink-300",
        };
      case "accent":
      case "warning":
        return {
          iconBg: "bg-amber-50 text-amber-600",
          ring: "hover:border-amber-300",
        };
      case "success":
        return {
          iconBg: "bg-emerald-50 text-emerald-600",
          ring: "hover:border-emerald-300",
        };
      default:
        return {
          iconBg: "bg-indigo-50 text-indigo-600",
          ring: "hover:border-indigo-300",
        };
    }
  };

  const theme = getThemeClasses();

  return (
    <div
      className={`bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between ${theme.ring}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {title}
          </span>
          <h3 className="text-2xl font-bold font-display text-slate-900 mt-1 tracking-tight">
            {isNumeric ? <AnimatedCounter endValue={value as number} /> : value}
          </h3>
        </div>

        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${theme.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(description || trend) && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
          {trend && (
            <span
              className={`font-semibold px-1.5 py-0.5 rounded-md text-[10px] ${
                trend.type === "up"
                  ? "text-emerald-700 bg-emerald-50"
                  : "text-rose-700 bg-rose-50"
              }`}
            >
              {trend.value}
            </span>
          )}
          {description && (
            <span className="text-slate-400 text-xs font-medium">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
