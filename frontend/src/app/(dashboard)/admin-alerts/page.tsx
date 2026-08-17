'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCircle2, UserCircle, ExternalLink } from 'lucide-react';
import api from '../../../services/api';

interface AdminNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  targetUid?: string;
  isRead: boolean;
  timestamp: any;
}

export default function AdminAlertsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/admin-alerts');
      setNotifications(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch alerts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/admin-alerts/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const handleAction = async (notif: AdminNotification) => {
    if (!notif.isRead) {
      await markAsRead(notif.id);
    }

    if (notif.type === 'photo_upload' || notif.title.toLowerCase().includes('photo')) {
      router.push('/photos');
    } else if (notif.targetUid) {
      router.push(`/users`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display text-text-primary tracking-tight">Admin Alerts</h2>
          <p className="text-sm text-text-secondary mt-1">Real-time incoming notifications from users</p>
        </div>
      </div>

      <div className="glass p-6 border border-primary/10 rounded-3xl shadow-neon-primary premium-card">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-primary/5 text-primary rounded-full flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 opacity-50" />
            </div>
            <h3 className="text-lg font-bold text-text-primary">All Caught Up!</h3>
            <p className="text-text-secondary text-sm mt-1">There are no incoming alerts at the moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notif) => (
              <div 
                key={notif.id}
                className={`p-5 rounded-2xl border transition-all ${
                  notif.isRead 
                    ? 'bg-bg-surface border-bg-border/50 opacity-70' 
                    : 'bg-primary/5 border-primary/20 shadow-sm'
                } flex items-start gap-4`}
              >
                <div className={`p-3 rounded-full shrink-0 ${notif.isRead ? 'bg-bg-border text-text-secondary' : 'bg-primary/20 text-primary'}`}>
                  {notif.type === 'photo_upload' ? <UserCircle className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-bold ${notif.isRead ? 'text-text-primary' : 'text-primary'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-[10px] uppercase font-bold text-text-secondary tracking-widest">
                      {new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                    {notif.body}
                  </p>
                  
                  <div className="mt-4 flex items-center gap-3">
                    <button 
                      onClick={() => handleAction(notif)}
                      className={`text-xs font-bold py-1.5 px-4 rounded-xl flex items-center gap-1.5 transition-colors ${
                        notif.isRead 
                          ? 'bg-bg-border hover:bg-text-secondary hover:text-white text-text-primary' 
                          : 'bg-primary hover:bg-primary-dark text-white'
                      }`}
                    >
                      {notif.type === 'photo_upload' ? 'Review Photo' : 'View Details'}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>

                    {!notif.isRead && (
                      <button 
                        onClick={() => markAsRead(notif.id)}
                        className="text-xs font-bold py-1.5 px-4 rounded-xl flex items-center gap-1.5 text-text-secondary hover:bg-bg-border transition-colors"
                      >
                        Mark as Read
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
