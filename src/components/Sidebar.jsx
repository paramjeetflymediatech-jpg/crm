'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Calendar, 
  TrendingUp, 
  ShieldAlert, 
  LogOut,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Sidebar({ user, onLogout }) {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Leads', href: '/leads', icon: Users },
    { name: 'Follow-ups', href: '/calendar', icon: Calendar },
    { name: 'Reports', href: '/reports', icon: TrendingUp },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  // Add Admin Panel if super admin
  if (user && user.role === 'super_admin') {
    menuItems.push({ name: 'Platform Admin', href: '/admin', icon: ShieldAlert });
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex h-full w-64 flex-col border-r border-slate-200 bg-white text-slate-650">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-650 text-white font-bold">
          <Layers className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-900 leading-tight">CRM Tenancy</span>
          <span className="text-[10px] text-indigo-600 font-medium tracking-wider uppercase">Enterprise</span>
        </div>
      </div>

      {/* Tenant Indicator */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tenant Portal</div>
          <div className="text-xs font-semibold text-slate-700 truncate mt-0.5">
            {user?.companyName || 'Loading...'}
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5 px-4 py-6">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition duration-200",
                isActive 
                  ? "bg-indigo-650 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile / Logout */}
      <div className="border-t border-slate-150 p-4">
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-200 p-2.5 mb-2">
          <div className="h-8 w-8 rounded-full bg-indigo-600/10 text-indigo-600 border border-indigo-500/10 flex items-center justify-center text-xs font-bold uppercase">
            {user?.name ? user.name[0] : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-855 truncate">{user?.name}</p>
            <p className="text-[10px] text-slate-400 truncate capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition duration-200"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
