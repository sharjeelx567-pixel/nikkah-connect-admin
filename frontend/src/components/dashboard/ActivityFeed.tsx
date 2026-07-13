'use client';

import React from 'react';
import { AuditLog } from '../../types';
import { ShieldCheck, UserMinus, Image, Settings, AlertTriangle, HelpCircle } from 'lucide-react';

export default function ActivityFeed({ logs }: { logs?: AuditLog[] }) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'BAN_USER':
      case 'SUSPEND_USER':
        return { icon: UserMinus, color: 'text-error bg-error/10' };
      case 'APPROVE_PHOTO':
      case 'REJECT_PHOTO':
        return { icon: Image, color: 'text-primary bg-primary/10' };
      case 'APPROVE_VERIFICATION':
      case 'REJECT_VERIFICATION':
        return { icon: ShieldCheck, color: 'text-success bg-success/10' };
      case 'UPDATE_SETTINGS':
        return { icon: Settings, color: 'text-accent-dark bg-accent/10' };
      default:
        return { icon: HelpCircle, color: 'text-text-secondary bg-bg-surface' };
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getActionLabel = (log: AuditLog) => {
    const email = log.adminEmail;
    switch (log.action) {
      case 'BAN_USER':
        return `${email} banned user ${log.targetId.slice(0, 8)}`;
      case 'SUSPEND_USER':
        return `${email} suspended user ${log.targetId.slice(0, 8)}`;
      case 'APPROVE_PHOTO':
        return `${email} approved photo for ${log.targetId.slice(0, 8)}`;
      case 'REJECT_PHOTO':
        return `${email} rejected photo for ${log.targetId.slice(0, 8)}`;
      case 'APPROVE_VERIFICATION':
        return `${email} approved KYC verification for ${log.targetId.slice(0, 8)}`;
      case 'UPDATE_SETTINGS':
        return `${email} updated app configuration parameters`;
      default:
        return `${email} performed action: ${log.action}`;
    }
  };

  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-text-secondary">No recent administrative activities logged.</p>
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {logs.map((log, logIdx) => {
          const config = getActionIcon(log.action);
          const Icon = config.icon;

          return (
            <li key={log.id || logIdx}>
              <div className="relative pb-8">
                {logIdx !== logs.length - 1 ? (
                  <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-bg-border" aria-hidden="true" />
                ) : null}
                <div className="relative flex space-x-3">
                  <div>
                    <span className={`h-8 w-8 rounded-xl flex items-center justify-center ring-4 ring-white ${config.color}`}>
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                    <div>
                      <p className="text-xs text-text-primary font-medium">
                        {getActionLabel(log)}
                      </p>
                      {log.details && (log.details.reason || log.details.days) && (
                        <p className="text-[10px] text-text-secondary mt-1 italic">
                          Reason: {log.details.reason || 'N/A'} {log.details.days ? `(${log.details.days} days)` : ''}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-[10px] whitespace-nowrap text-text-secondary font-medium">
                      {formatTime(log.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
