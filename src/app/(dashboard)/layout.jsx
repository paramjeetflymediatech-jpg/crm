'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Loader2, AlertCircle, Volume2, X } from 'lucide-react';
import { apiFetch } from '@/lib/clientApi';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [searchVal, setSearchVal] = useState('');
  const [loading, setLoading] = useState(true);
  const [toastAlert, setToastAlert] = useState(null);
  const [socket, setSocket] = useState(null);

  // Synthesize double ding chime using Web Audio API
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // First high tone
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
      osc1.start();
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      
      // Second pitch tone
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.5, audioCtx.currentTime); // C6 note
        gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc2.start();
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);
        setTimeout(() => osc2.stop(), 300);
      }, 120);

      setTimeout(() => osc1.stop(), 150);
    } catch (err) {
      console.warn('Audio tone synthesis failed:', err);
    }
  };

  useEffect(() => {
    // 1. Session verification
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }

    const userData = JSON.parse(storedUser);
    setUser(userData);

    // 2. Fetch notifications
    const fetchNotifications = async () => {
      try {
        const res = await apiFetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // 3. Connect Socket.IO
    const socketUrl = window.location.origin;
    const socketConnection = io(socketUrl);
    setSocket(socketConnection);

    socketConnection.on('connect', () => {
      console.log('Socket.IO connected from client dashboard.');
      // Join company tenant room
      if (userData.companyId) {
        socketConnection.emit('join_company', userData.companyId);
      }
    });

    socketConnection.on('notification', (notif) => {
      console.log('Socket notification received:', notif);
      
      // Prepend to current list
      setNotifications(prev => [
        {
          id: notif.id,
          title: notif.title,
          message: notif.message,
          type: notif.type,
          lead_id: notif.leadId,
          is_read: false,
          created_at: new Date().toISOString()
        },
        ...prev
      ]);

      // Pop toast and play synthesis tone
      setToastAlert(notif);
      playAlertSound();

      // Automatically hide banner after 8 seconds
      setTimeout(() => {
        setToastAlert(prev => prev?.id === notif.id ? null : prev);
      }, 8000);
    });

    return () => {
      socketConnection.disconnect();
    };
  }, [router]);

  const handleMarkRead = async (id) => {
    try {
      const response = await apiFetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [id] })
      });
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const response = await apiFetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('user');
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 text-slate-800">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-500 mb-4" />
          <p className="text-sm font-medium text-slate-505">Loading Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar navigation */}
      <Sidebar user={user} onLogout={handleLogout} />

      {/* Main body area */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        {/* Top header navigation */}
        <Header 
          user={user} 
          notifications={notifications} 
          onMarkRead={handleMarkRead} 
          onMarkAllRead={handleMarkAllRead}
          onSearchChange={setSearchVal}
          searchValue={searchVal}
        />

        {/* Content Panel */}
        <main className="flex-1 pt-16 px-8 py-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Floating Dynamic WebSocket Alert Banner */}
      {toastAlert && (
        <div className="fixed bottom-6 right-6 z-50 w-96 rounded-xl border border-slate-200 bg-white/95 text-slate-800 shadow-xl backdrop-blur-md p-4 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-indigo-650 p-2 text-white shadow-md">
              <Volume2 className="h-5 w-5 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 tracking-wide">{toastAlert.title}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{toastAlert.message}</p>
              {toastAlert.leadId && (
                <button 
                  onClick={() => {
                    router.push(`/leads/${toastAlert.leadId}`);
                    setToastAlert(null);
                  }}
                  className="mt-2.5 inline-flex items-center justify-center rounded-md bg-indigo-650 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 transition duration-150 cursor-pointer"
                >
                  View Lead
                </button>
              )}
            </div>
            <button 
              onClick={() => setToastAlert(null)}
              className="text-slate-400 hover:text-slate-800 transition rounded p-0.5 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
