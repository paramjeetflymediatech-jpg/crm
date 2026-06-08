'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  Percent, 
  Calendar, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Inbox,
  Flame,
  Loader2,
  Plus
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/clientApi';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6'];

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    setMounted(true);

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }

    const fetchReports = async () => {
      try {
        const res = await apiFetch('/api/reports');
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (err) {
        console.error('Error fetching dashboard reports:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-500 mb-4" />
          <p className="text-sm text-slate-400">Loading Dashboard Metrics...</p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {
    totalLeads: 0,
    newLeads: 0,
    qualifiedLeads: 0,
    convertedLeads: 0,
    lostLeads: 0,
    followupsToday: 0,
    conversionRate: 0
  };

  const charts = data?.charts || {
    leadsByMonth: [],
    leadsBySource: [],
    leadPipeline: [],
    teamPerformance: []
  };

  const stats = [
    { name: 'Total Leads', value: summary.totalLeads, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { name: 'New Leads', value: summary.newLeads, icon: Inbox, color: 'text-sky-600', bg: 'bg-sky-50' },
    { name: 'Qualified Leads', value: summary.qualifiedLeads, icon: Flame, color: 'text-amber-600', bg: 'bg-amber-50' },
    { name: 'Converted Leads', value: summary.convertedLeads, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Conversion Rate', value: `${summary.conversionRate}%`, icon: Percent, color: 'text-purple-600', bg: 'bg-purple-50' },
    { name: 'Follow-ups Today', value: summary.followupsToday, icon: Calendar, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time indicators, conversions, and follow-ups.</p>
        </div>
        {currentUser?.role === 'super_admin' && (
          <Link href="/admin?openProvision=true">
            <Button className="bg-indigo-650 hover:bg-indigo-550 text-white font-medium shadow-md">
              <Plus className="h-4 w-4 mr-2" /> Provision Company
            </Button>
          </Link>
        )}
      </div>

      {currentUser?.role === 'super_admin' && (
        <Card className="border-indigo-100 bg-indigo-50/20 text-slate-700 shadow-sm p-4 rounded-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-sm font-bold text-indigo-900">Platform Management Quick Actions</h3>
              <p className="text-xs text-indigo-600 mt-0.5">As a Super Administrator, you can deploy new company tenant workspaces here.</p>
            </div>
            <Link href="/admin?openProvision=true">
              <Button size="sm" className="bg-indigo-650 hover:bg-indigo-550 text-white font-semibold flex items-center shadow-sm">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Provision New Company Tenant
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* KPI Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name} className="border-slate-200 bg-white text-slate-700 shadow-sm">
              <CardContent className="p-4 flex flex-col justify-between h-28">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.name}</span>
                  <div className={`rounded-lg p-1.5 ${stat.bg} ${stat.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Grid */}
      {mounted && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          
          {/* Monthly Growth Line Chart */}
          <Card className="col-span-2 border-slate-200 bg-white text-slate-700 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">Lead Growth Over Time</CardTitle>
              <CardDescription className="text-xs text-slate-400">Number of leads captured and converted monthly</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.leadsByMonth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px' }}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" name="Total Captured" dataKey="count" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 8 }} />
                  <Line type="monotone" name="Converted" dataKey="converted" stroke="#10b981" strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Leads by Source Pie Chart */}
          <Card className="border-slate-200 bg-white text-slate-700 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">Leads by Channel</CardTitle>
              <CardDescription className="text-xs text-slate-400">Distribution of source channels</CardDescription>
            </CardHeader>
            <CardContent className="h-80 flex items-center justify-center">
              {charts.leadsBySource.length === 0 ? (
                <span className="text-xs text-slate-405">No source data available</span>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.leadsBySource}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {charts.leadsBySource.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px' }} />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" iconSize={10} iconType="circle" wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Pipeline Conversion Bar Chart */}
          <Card className="col-span-2 border-slate-200 bg-white text-slate-700 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">Lead Stages Pipeline</CardTitle>
              <CardDescription className="text-xs text-slate-400">Count of leads grouped by current pipeline status</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {charts.leadPipeline.length === 0 ? (
                <span className="text-xs text-slate-405">No pipeline data available</span>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.leadPipeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px' }} />
                    <Bar dataKey="value" name="Leads Count" fill="#6366f1" radius={[4, 4, 0, 0]}>
                      {charts.leadPipeline.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Team Performance Table/Chart */}
          <Card className="border-slate-200 bg-white text-slate-700 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">Representative Results</CardTitle>
              <CardDescription className="text-xs text-slate-400">Individual conversions and assignments</CardDescription>
            </CardHeader>
            <CardContent className="h-80 overflow-y-auto">
              {charts.teamPerformance.length === 0 ? (
                <div className="flex h-full items-center justify-center py-8 text-center text-xs text-slate-400">
                  Staff results hidden or no members found.
                </div>
              ) : (
                <div className="space-y-4">
                  {charts.teamPerformance.map((member) => (
                    <div key={member.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span>{member.name}</span>
                        <span>{member.converted}/{member.leads} leads ({member.conversionRate}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${member.conversionRate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}

      {/* Leads Navigation Quick Link */}
      <div className="flex justify-end">
        <Link 
          href="/leads" 
          className="inline-flex items-center gap-1.5 text-xs text-indigo-650 font-semibold hover:text-indigo-800 transition duration-150"
        >
          Manage all leads in board <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
