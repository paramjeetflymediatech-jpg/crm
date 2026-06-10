'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Activity, 
  Ban, 
  CheckCircle2, 
  Loader2, 
  ShieldAlert,
  Globe,
  Mail,
  Lock,
  Layers
} from 'lucide-react';
import { apiFetch as fetch } from '@/lib/clientApi';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // Client Wizard Form States
  const [form, setForm] = useState({
    company_name: '',
    website: '',
    email: '',
    phone: '',
    subscription_plan: 'free',
    admin_name: '',
    admin_email: '',
    admin_password: ''
  });

  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [resComp, resLogs] = await Promise.all([
        fetch('/api/admin/companies'),
        fetch('/api/admin/audit-logs')
      ]);

      if (resComp.ok) {
        const d = await resComp.json();
        setCompanies(d.companies || []);
      }
      if (resLogs.ok) {
        const d = await resLogs.json();
        setLogs(d.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const u = JSON.parse(userStr);
      setCurrentUser(u);
      if (u.role === 'super_admin') {
        fetchData();
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }

    // Check query params to auto-open provision dialog
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('openProvision') === 'true') {
        setCreateOpen(true);
      }
    }
  }, []);

  const handleToggleSuspend = async (company) => {
    const nextStatus = company.status === 'active' ? 'suspended' : 'active';
    const actionText = nextStatus === 'suspended' ? 'suspend' : 'activate';
    
    if (!window.confirm(`Are you sure you want to ${actionText} Company "${company.company_name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/companies/${company.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleProvisionSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        setCreateOpen(false);
        setForm({
          company_name: '',
          website: '',
          email: '',
          phone: '',
          subscription_plan: 'free',
          admin_name: '',
          admin_email: '',
          admin_password: ''
        });
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to provision company.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Security Role Guard
  if (!currentUser || currentUser.role !== 'super_admin') {
    return (
      <div className="flex h-[calc(100vh-12rem)] flex-col items-center justify-center text-center space-y-4">
        <div className="rounded-full bg-red-50 p-4 text-red-650 border border-red-100">
          <ShieldAlert className="h-10 w-10 animate-bounce" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">403: Access Restricted</h2>
        <p className="text-sm text-slate-500 max-w-sm">This panel requires Super Administrative privileges. Your role limits you from inspecting other client domains.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Control Panel</h1>
          <p className="text-sm text-slate-505 mt-1">Super Administrative view across all company tenants.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-indigo-650 hover:bg-indigo-550 text-white">
          <Plus className="h-4 w-4 mr-2" /> Provision Company
        </Button>
      </div>

      {/* Companies List Table */}
      <Card className="border-slate-200 bg-white text-slate-700 overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-200">
          <CardTitle className="text-base text-slate-900 font-semibold">Active Client Companies</CardTitle>
          <CardDescription className="text-xs text-slate-500">Monitor subscriptions, states, and WordPress endpoints</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 bg-slate-50/50">
                <TableHead className="text-slate-500 font-semibold">Company Name</TableHead>
                <TableHead className="text-slate-500 font-semibold">Contact Domain</TableHead>
                <TableHead className="text-slate-500 font-semibold">Plan Tier</TableHead>
                <TableHead className="text-slate-500 font-semibold">Status</TableHead>
                <TableHead className="text-slate-500 font-semibold">API Key</TableHead>
                <TableHead className="text-slate-500 font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                    No company records found in system database.
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((c) => (
                  <TableRow key={c.id} className="border-slate-100">
                    <TableCell className="font-semibold text-slate-900">{c.company_name}</TableCell>
                    <TableCell className="text-xs">
                      <div>{c.email || 'N/A'}</div>
                      <div className="text-slate-505 mt-0.5">{c.website || 'N/A'}</div>
                    </TableCell>
                    <TableCell className="text-xs font-semibold capitalize text-indigo-650">
                      {c.subscription_plan}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                        c.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-650 border border-emerald-100' 
                          : 'bg-red-50 text-red-650 border border-red-100'
                      }`}>
                        {c.status}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-slate-500 truncate max-w-[120px]" title={c.api_key}>
                      {c.api_key.substring(0, 15)}...
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        onClick={() => handleToggleSuspend(c)}
                        className={c.status === 'active' 
                          ? "bg-red-50 border border-red-100 hover:bg-red-100 text-xs text-red-650"
                          : "bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-xs text-emerald-655"
                        }
                      >
                        {c.status === 'active' ? (
                          <><Ban className="h-3.5 w-3.5 mr-1" /> Suspend</>
                        ) : (
                          <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Activate</>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Global Audit Logs List */}
      <Card className="border-slate-200 bg-white text-slate-700">
        <CardHeader className="bg-slate-50/50 border-b border-slate-200">
          <CardTitle className="text-base text-slate-900 font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-650" /> Platform Security Audit Trail
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">Global tracking of login actions and updates across all tenants</CardDescription>
        </CardHeader>
        <CardContent className="p-0 max-h-[400px] overflow-y-auto">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 bg-slate-50/50">
                  <TableHead className="text-slate-500 font-semibold">Tenant</TableHead>
                  <TableHead className="text-slate-500 font-semibold">Representative</TableHead>
                  <TableHead className="text-slate-500 font-semibold">Module</TableHead>
                  <TableHead className="text-slate-500 font-semibold">Action Logged</TableHead>
                  <TableHead className="text-slate-500 font-semibold">IP Address</TableHead>
                  <TableHead className="text-slate-500 font-semibold text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No actions logged.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="border-slate-100 text-xs">
                      <TableCell className="font-semibold text-slate-800">
                        {log.Company?.company_name || <span className="text-indigo-650 italic">System Core</span>}
                      </TableCell>
                      <TableCell className="text-slate-700">{log.User?.name || 'Automated / System'}</TableCell>
                      <TableCell className="font-medium text-slate-600">{log.module}</TableCell>
                      <TableCell className="text-slate-800 leading-normal">{log.action}</TableCell>
                      <TableCell className="font-mono text-slate-500">{log.ip_address || '127.0.0.1'}</TableCell>
                      <TableCell className="text-right text-slate-500">
                        {log.created_at || log.createdAt ? new Date(log.created_at || log.createdAt).toLocaleString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* PROVISION NEW CLIENT DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-800 max-w-lg">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-650" /> Provision Client Tenant Wizard
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleProvisionSubmit} className="space-y-4 pt-2">
            
            {/* Company setup section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-indigo-650 uppercase tracking-wider">Company Workspace Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500">Company Name</label>
                  <Input 
                    required 
                    placeholder="e.g. Globex Inc" 
                    value={form.company_name}
                    onChange={(e) => setForm({...form, company_name: e.target.value})}
                    className="border-slate-200 bg-slate-50 text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500">Website URL</label>
                  <div className="relative">
                    <Globe className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="e.g. globex.com" 
                      value={form.website}
                      onChange={(e) => setForm({...form, website: e.target.value})}
                      className="pl-10 border-slate-200 bg-slate-50 text-slate-900"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500">Workspace Phone</label>
                  <Input 
                    placeholder="e.g. +1 555 9811" 
                    value={form.phone}
                    onChange={(e) => setForm({...form, phone: e.target.value})}
                    className="border-slate-200 bg-slate-50 text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500">Subscription Tier</label>
                  <Select value={form.subscription_plan} onValueChange={(val) => setForm({...form, subscription_plan: val})}>
                    <SelectTrigger className="border-slate-200 bg-slate-50 text-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-200 bg-white text-slate-800">
                      <SelectItem value="free">Free Trial</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Admin setup section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-indigo-650 uppercase tracking-wider">Initial Company Admin Provisioning</h4>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500">Admin Full Name</label>
                <Input 
                  required 
                  placeholder="e.g. Richard Hendricks" 
                  value={form.admin_name}
                  onChange={(e) => setForm({...form, admin_name: e.target.value})}
                  className="border-slate-200 bg-slate-50 text-slate-900"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500">Admin Email Login</label>
                  <div className="relative">
                    <Mail className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                    <Input 
                      required 
                      type="email"
                      placeholder="e.g. richard@globex.com" 
                      value={form.admin_email}
                      onChange={(e) => setForm({...form, admin_email: e.target.value})}
                      className="pl-10 border-slate-200 bg-slate-50 text-slate-900"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-505">Admin Secure Password</label>
                  <div className="relative">
                    <Lock className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                    <Input 
                      required 
                      type="password"
                      placeholder="••••••••" 
                      value={form.admin_password}
                      onChange={(e) => setForm({...form, admin_password: e.target.value})}
                      className="pl-10 border-slate-200 bg-slate-50 text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} className="text-slate-500 hover:text-slate-800 hover:bg-slate-100">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-indigo-650 hover:bg-indigo-550 text-white">
                {saving ? 'Provisioning...' : 'Provision Tenant'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
