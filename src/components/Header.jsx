'use client';

import React, { useState } from 'react';
import { 
  Bell, 
  Search, 
  CheckCheck,
  Calendar,
  User,
  ShieldCheck,
  ExternalLink,
  Info
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function Header({ 
  user, 
  notifications = [], 
  onMarkRead, 
  onMarkAllRead,
  onSearchChange,
  searchValue 
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotificationClick = async (n) => {
    await onMarkRead(n.id);
    setOpen(false);
    if (n.lead_id) {
      router.push(`/leads/${n.lead_id}`);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'New Lead':
        return <ShieldCheck className="h-4 w-4 text-emerald-400" />;
      case 'Lead Assigned':
        return <User className="h-4 w-4 text-sky-400" />;
      case 'Follow-Up Reminder':
        return <Calendar className="h-4 w-4 text-amber-400" />;
      default:
        return <Info className="h-4 w-4 text-indigo-400" />;
    }
  };

  return (
    <header className="fixed top-0 right-0 z-10 flex h-16 w-[calc(100%-16rem)] items-center justify-between border-b border-slate-200 bg-white px-8 text-slate-800">
      
      {/* Global Search Bar */}
      <div className="relative w-80">
        <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Global search leads, email..."
          value={searchValue || ''}
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              router.push(`/leads?search=${searchValue}`);
            }
          }}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition duration-200"
        />
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-4">
        
        {/* Notification Bell Dropdown */}
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger className="relative rounded-lg border border-slate-200 bg-slate-550/5 p-2 text-slate-500 hover:text-slate-800 transition duration-200 focus:outline-none cursor-pointer">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-650 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-80 border-slate-200 bg-white text-slate-700 shadow-xl rounded-lg">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
              <div className="text-sm font-semibold text-slate-800 px-1.5 py-1">Notifications</div>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onMarkAllRead}
                  className="h-7 text-xs text-indigo-650 hover:text-indigo-700 hover:bg-slate-50 flex items-center gap-1 px-2"
                >
                  <CheckCheck className="h-3 w-3" /> Mark all read
                </Button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  No notifications yet.
                </div>
              ) : (
                notifications.map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 cursor-pointer transition border-b border-slate-50 hover:bg-slate-50 focus:bg-slate-50 focus:text-slate-900 text-slate-700",
                      !n.is_read ? "bg-indigo-50/40 font-medium text-slate-900" : "opacity-75"
                    )}
                  >
                    <div className="mt-0.5 rounded bg-slate-50 p-1 shrink-0">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">{n.title}</p>
                        <span className="text-xs text-slate-400 shrink-0">
                          {new Date(n.created_at || n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                      {n.lead_id && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-indigo-650 font-semibold mt-1">
                          View details <ExternalLink className="h-2 w-2" />
                        </span>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Identity */}
        <div className="h-6 w-px bg-slate-200" />
        <div className="flex items-center gap-3">
          <div className="flex flex-col text-right hidden md:flex">
            <span className="text-xs font-semibold text-slate-800">{user?.name}</span>
            <span className="text-[10px] text-slate-400 font-medium capitalize">{user?.role?.replace('_', ' ')}</span>
          </div>
          <div className="h-9 w-9 rounded-full bg-indigo-600/10 text-indigo-600 border border-indigo-500/10 flex items-center justify-center text-sm font-semibold uppercase">
            {user?.name ? user.name[0] : 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
