"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface GrowthData {
  date: string;
  signups: number;
}

export default function GrowthChart({ data }: { data?: GrowthData[] }) {
  const formatXAxis = (tickItem: string) => {
    try {
      const date = new Date(tickItem);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return tickItem;
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-lg text-xs">
          <p className="font-semibold text-slate-700">
            {new Date(payload[0].payload.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <p className="text-indigo-600 font-bold mt-1">
            {payload[0].value} New Seekers
          </p>
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
        No Growth Data Available
      </div>
    );
  }

  return (
    <div className="h-72 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
          <XAxis
            dataKey="date"
            tickFormatter={formatXAxis}
            stroke="#94A3B8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#94A3B8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="signups"
            stroke="#4F46E5"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#growthGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
