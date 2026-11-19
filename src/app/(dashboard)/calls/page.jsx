'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Headphones, 
  Search, 
  Filter, 
  PhoneCall, 
  User, 
  Calendar, 
  Clock, 
  Volume2, 
  Download, 
  ShieldAlert, 
  Loader2, 
  ArrowUpDown,
  Building2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { apiFetch as fetch } from '@/lib/clientApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function CallRecordsPage() {
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const u = localStorage.getItem('user');
        return u ? JSON.parse(u) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [calls, setCalls] = useState([]);
  const [stats, setStats] = useState({
    totalCalls: 0,
    recordedCalls: 0,
    completedCalls: 0,
    totalDurationMinutes: 0
  });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('_all');
  const [agentFilter, setAgentFilter] = useState('_all');
  const [recordingOnly, setRecordingOnly] = useState(false);
  const [companyFilter, setCompanyFilter] = useState('_all');
  const [agents, setAgents] = useState([]);
  const [companies, setCompanies] = useState([]);

  // Fetch team & companies for filter dropdowns
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const resUsers = await fetch('/api/users');
        if (resUsers.ok) {
          const d = await resUsers.json();
          setAgents(d.users || []);
        }

        if (currentUser?.role === 'super_admin') {
          const resComp = await fetch('/api/admin/companies');
          if (resComp.ok) {
            const d = await resComp.json();
            setCompanies(d.companies || []);
          }
        }
      } catch (err) {
        console.error('Failed to load filter metadata:', err);
      }
    };

    fetchDropdowns();
  }, [currentUser]);

  // Fetch calls with current filters & pagination
  const fetchCalls = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '25');

      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== '_all') params.append('status', statusFilter);
      if (agentFilter !== '_all') params.append('agentId', agentFilter);
      if (recordingOnly) params.append('hasRecording', 'true');
      if (companyFilter !== '_all') params.append('companyId', companyFilter);

      const res = await fetch(`/api/calls?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCalls(data.calls || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to fetch call logs:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, agentFilter, recordingOnly, companyFilter]);

  useEffect(() => {
    fetchCalls(1);
  }, [fetchCalls]);

  // Security Guard: Staff cannot view Call Records
  if (currentUser && currentUser.role !== 'super_admin' && currentUser.role !== 'company_admin') {
    return (
      <div className="flex h-[calc(100vh-12rem)] flex-col items-center justify-center text-center space-y-4">
        <div className="rounded-full bg-red-50 p-4 text-red-600 border border-red-100">
          <ShieldAlert className="h-10 w-10 animate-bounce" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">403: Administrator Access Only</h2>
        <p className="text-sm text-slate-500 max-w-sm">
          Call records and audio recordings are restricted to Company Administrators and Super Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Headphones className="h-6 w-6 text-indigo-600" /> Call Records & Audio Monitoring
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Listen to recorded phone calls, review talk time, and audit sales rep conversations.
          </p>
        </div>
        <Button 
          onClick={() => fetchCalls(pagination.page)} 
          variant="outline" 
          size="sm"
          className="border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh Calls
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Calls</span>
              <PhoneCall className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats.totalCalls}</p>
            <span className="text-[11px] text-slate-400">All outbound & inbound logged</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">With Audio</span>
              <Volume2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats.recordedCalls}</p>
            <span className="text-[11px] text-emerald-600 font-medium">Ready to play / download</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Answered</span>
              <span className="text-xs font-bold text-indigo-600">
                {stats.totalCalls > 0 ? `${Math.round((stats.completedCalls / stats.totalCalls) * 100)}%` : '0%'}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats.completedCalls}</p>
            <span className="text-[11px] text-slate-400">Successfully completed</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Talk Time</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats.totalDurationMinutes}m</p>
            <span className="text-[11px] text-slate-400">Cumulative conversation time</span>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-slate-200 bg-white shadow-2xs">
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 items-center">
            {/* Search Input */}
            <div className="relative col-span-1 sm:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search phone number, notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 border-slate-200 bg-slate-50 text-xs h-9"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-slate-200 bg-slate-50 text-xs h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="_all">All Call Outcomes</SelectItem>
                <SelectItem value="completed">Completed / Answered</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="no-answer">No Answer</SelectItem>
                <SelectItem value="follow-up">Follow Up</SelectItem>
              </SelectContent>
            </Select>

            {/* Agent / Rep Filter */}
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="border-slate-200 bg-slate-50 text-xs h-9">
                <SelectValue placeholder="All Agents" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="_all">All Sales Agents</SelectItem>
                {agents.map((ag) => (
                  <SelectItem key={ag.id} value={ag.id.toString()}>{ag.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Recording Filter Toggle Button */}
            <Button
              type="button"
              variant={recordingOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRecordingOnly(!recordingOnly)}
              className={`h-9 text-xs font-semibold ${
                recordingOnly 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Volume2 className="h-3.5 w-3.5 mr-1.5" />
              {recordingOnly ? 'Only Recordings' : 'All Calls'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Call Records Table */}
      <Card className="border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 bg-slate-50/60">
                <TableHead className="font-semibold text-slate-600 text-xs">Date & Time</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs">Customer / Lead</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs">Sales Agent</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs">Duration</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs">Outcome</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs min-w-[280px]">Audio Recording</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span className="text-xs">Loading call recordings...</span>
                  </TableCell>
                </TableRow>
              ) : calls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                      <Headphones className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">No call records found</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                      No call records match your current filters. Calls logged from the Android mobile app or web will appear here.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                calls.map((call) => {
                  const isCompleted = call.status === 'completed';
                  const isBusyOrFailed = ['failed', 'busy', 'no-answer'].includes(call.status);
                  const durationMinutes = Math.floor(call.duration / 60);
                  const durationSeconds = call.duration % 60;

                  return (
                    <TableRow key={call.id} className="border-slate-100 hover:bg-slate-50/60 transition">
                      {/* Date & Time */}
                      <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">
                          {new Date(call.created_at || call.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(call.created_at || call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </TableCell>

                      {/* Lead / Customer */}
                      <TableCell className="text-xs">
                        {call.Lead ? (
                          <div>
                            <Link 
                              href={`/leads/${call.Lead.id}`} 
                              className="font-bold text-indigo-600 hover:underline flex items-center gap-1"
                            >
                              {call.Lead.first_name} {call.Lead.last_name || ''}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                            <span className="text-[11px] text-slate-500 font-mono">{call.to_number}</span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-semibold text-slate-700">Direct Number</span>
                            <div className="text-[11px] text-slate-500 font-mono">{call.to_number}</div>
                          </div>
                        )}
                      </TableCell>

                      {/* Sales Agent */}
                      <TableCell className="text-xs text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center">
                            {call.User?.name ? call.User.name[0].toUpperCase() : 'A'}
                          </div>
                          <span>{call.User?.name || 'Unknown Agent'}</span>
                        </div>
                      </TableCell>

                      {/* Duration */}
                      <TableCell className="text-xs font-bold text-slate-700 whitespace-nowrap">
                        {durationMinutes > 0 ? `${durationMinutes}m ` : ''}{durationSeconds}s
                      </TableCell>

                      {/* Outcome Status */}
                      <TableCell>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize whitespace-nowrap ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isBusyOrFailed
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {call.status}
                        </span>
                      </TableCell>

                      {/* Audio Player */}
                      <TableCell>
                        {call.recording_url ? (
                          <div className="flex items-center gap-2">
                            <audio
                              controls
                              className="h-8 max-w-[240px] rounded"
                              src={call.recording_url}
                              preload="none"
                            >
                              Your browser does not support the audio element.
                            </audio>
                            <a
                              href={call.recording_url}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
                              title="Download audio recording"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No audio recorded</span>
                        )}
                      </TableCell>

                      {/* Notes */}
                      <TableCell className="text-xs text-slate-600 max-w-[200px] truncate" title={call.notes || ''}>
                        {call.notes || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total calls)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchCalls(pagination.page - 1)}
                className="text-xs border-slate-200"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchCalls(pagination.page + 1)}
                className="text-xs border-slate-200"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
