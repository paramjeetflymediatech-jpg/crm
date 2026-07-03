'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Plus, 
  Trash2, 
  UserCheck, 
  RefreshCw, 
  Download, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  User,
  MoreVertical,
  Loader2,
  CalendarDays
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch as fetch } from '@/lib/clientApi';

export default function LeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State variables
  const [leads, setLeads] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [priority, setPriority] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  // Dropdown options
  const [statuses, setStatuses] = useState([]);
  const [sources, setSources] = useState([]);
  const [team, setTeam] = useState([]);

  // Selections
  const [selectedLeads, setSelectedLeads] = useState([]);
  
  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);

  // Create lead form states
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    source: 'Manual',
    status: 'New',
    priority: 'Medium',
    subject: '',
    message: ''
  });
  
  // Bulk action values
  const [targetRepresentative, setTargetRepresentative] = useState('');
  const [targetStatus, setTargetStatus] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Initial setup and fetching options
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }

    const fetchFilterOptions = async () => {
      try {
        const [resStatus, resSource, resUsers] = await Promise.all([
          fetch('/api/leads/statuses'),
          fetch('/api/leads/sources'),
          fetch('/api/users')
        ]);

        if (resStatus.ok) {
          const d = await resStatus.json();
          setStatuses(d.statuses || []);
        }
        if (resSource.ok) {
          const d = await resSource.json();
          setSources(d.sources || []);
        }
        if (resUsers.ok) {
          const d = await resUsers.json();
          setTeam(d.users || []);
        }
      } catch (err) {
        console.error('Error loading filter parameters:', err);
      }
    };

    fetchFilterOptions();
  }, []);

  // Fetch leads with active filters
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sortField: 'created_at',
        sortOrder: 'DESC'
      });

      if (search) query.append('search', search);
      if (status) query.append('status', status);
      if (source) query.append('source', source);
      if (priority) query.append('priority', priority);
      if (assignedTo) query.append('assignedTo', assignedTo);

      const res = await fetch(`/api/leads?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads);
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    // Clear check boxes on refetch
    setSelectedLeads([]);
  }, [currentPage, pageSize, status, source, priority, assignedTo]);

  // Debounced live search — fires 300ms after the user stops typing
  const searchDebounceRef = useRef(null);
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchLeads();
    }, 300);
    return () => clearTimeout(searchDebounceRef.current);
  }, [search]);

  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setSource('');
    setPriority('');
    setAssignedTo('');
    setCurrentPage(1);
    router.push('/leads');
  };

  // Row selection handler
  const toggleSelectRow = (id) => {
    setSelectedLeads(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map(l => l.id));
    }
  };

  // Create lead submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setCreateOpen(false);
        setForm({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          source: 'Manual',
          status: 'New',
          priority: 'Medium',
          subject: '',
          message: ''
        });
        fetchLeads();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create lead.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Bulk assign submit
  const handleBulkAssign = async () => {
    try {
      const res = await fetch('/api/leads/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
          leadIds: selectedLeads,
          assignedTo: parseInt(targetRepresentative, 10)
        })
      });
      if (res.ok) {
        setBulkAssignOpen(false);
        setTargetRepresentative('');
        setSelectedLeads([]);
        fetchLeads();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Bulk status update submit
  const handleBulkStatus = async () => {
    try {
      const res = await fetch('/api/leads/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          leadIds: selectedLeads,
          status: targetStatus
        })
      });
      if (res.ok) {
        setBulkStatusOpen(false);
        setTargetStatus('');
        setSelectedLeads([]);
        fetchLeads();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Bulk delete action
  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedLeads.length} leads?`)) return;
    try {
      const res = await fetch('/api/leads/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          leadIds: selectedLeads
        })
      });
      if (res.ok) {
        setSelectedLeads([]);
        fetchLeads();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Export filtered leads to CSV
  const handleExportCSV = () => {
    if (leads.length === 0) return;
    
    // Construct CSV Header
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Subject', 'Source', 'Status', 'Priority', 'Assignee', 'Created At'];
    
    const rows = leads.map(l => [
      l.first_name,
      l.last_name || '',
      l.email || '',
      l.phone || '',
      `"${(l.subject || '').replace(/"/g, '""')}"`,
      l.source || 'Manual',
      l.status,
      l.priority,
      l.AssignedUser ? l.AssignedUser.name : 'Unassigned',
      l.created_at || l.createdAt ? new Date(l.created_at || l.createdAt).toLocaleDateString() : 'N/A'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leads Panel</h1>
          <p className="text-sm text-slate-500 mt-1">Found {totalCount} lead records in system</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={handleExportCSV} 
            variant="outline" 
            className="border-slate-200 hover:bg-slate-50 text-slate-700"
          >
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button 
            onClick={() => setCreateOpen(true)} 
            className="bg-indigo-650 hover:bg-indigo-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" /> Create Lead
          </Button>
        </div>
      </div>

      {/* Filter Drawer */}
      <Card className="border-slate-200 bg-white text-slate-700 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-2 flex-col sm:flex-row">
            <div className="relative flex-1">
              <Input
                placeholder="Search by first name, last name, phone, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-slate-200 bg-slate-50/20 text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <Button 
              type="button" 
              onClick={handleClearFilters} 
              variant="ghost" 
              className="text-slate-500 hover:text-slate-900"
            >
              Clear
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
            {/* Status Select */}
            <Select value={status} onValueChange={(val) => { setStatus(val === '_all' ? '' : val); setCurrentPage(1); }}>
              <SelectTrigger className="border-slate-200 bg-white text-slate-700">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="border-slate-200 bg-white text-slate-800">
                <SelectItem value="_all">All Statuses</SelectItem>
                {statuses.map(s => (
                  <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Source Select */}
            <Select value={source} onValueChange={(val) => { setSource(val === '_all' ? '' : val); setCurrentPage(1); }}>
              <SelectTrigger className="border-slate-200 bg-white text-slate-700">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent className="border-slate-200 bg-white text-slate-800">
                <SelectItem value="_all">All Sources</SelectItem>
                {sources.map(s => (
                  <SelectItem key={s.id} value={s.source_name}>{s.source_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority Select */}
            <Select value={priority} onValueChange={(val) => { setPriority(val === '_all' ? '' : val); setCurrentPage(1); }}>
              <SelectTrigger className="border-slate-200 bg-white text-slate-700">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent className="border-slate-200 bg-white text-slate-800">
                <SelectItem value="_all">All Priorities</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>

            {/* Assigned To Select */}
            <Select value={assignedTo} onValueChange={(val) => { setAssignedTo(val === '_all' ? '' : val); setCurrentPage(1); }}>
              <SelectTrigger className="border-slate-200 bg-white text-slate-700">
                <span className="truncate">
                  {assignedTo
                    ? (team.find(m => m.id.toString() === assignedTo)?.name || 'Representative')
                    : 'All Representatives'}
                </span>
              </SelectTrigger>
              <SelectContent className="border-slate-200 bg-white text-slate-800">
                <SelectItem value="_all">All Representatives</SelectItem>
                {team.map(member => (
                  <SelectItem key={member.id} value={member.id.toString()}>{member.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Panel */}
      {selectedLeads.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50/80 p-3 text-sm text-indigo-850 justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{selectedLeads.length} leads selected</span>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => setBulkAssignOpen(true)}
              className="bg-slate-850 hover:bg-slate-800 text-xs text-white"
            >
              <UserCheck className="h-3.5 w-3.5 mr-1" /> Assign Rep
            </Button>
            <Button 
              size="sm" 
              onClick={() => setBulkStatusOpen(true)}
              className="bg-slate-850 hover:bg-slate-800 text-xs text-white"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Update Status
            </Button>
            {currentUser?.role !== 'staff' && (
              <Button 
                size="sm" 
                onClick={handleBulkDelete}
                className="bg-red-50 border border-red-200 hover:bg-red-100 text-xs text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Selected
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Data Table */}
      <Card className="border-slate-200 bg-white text-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600 mb-4" />
            <p className="text-xs text-slate-400">Retrieving leads from database...</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm font-medium">
            No leads found. Sync your WordPress forms or create leads manually.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-slate-200">
                  <TableHead className="w-12 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedLeads.length === leads.length} 
                      onChange={toggleSelectAll}
                      className="rounded border-slate-350 bg-white text-indigo-650 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="text-slate-800 font-bold text-sm">Name</TableHead>
                  <TableHead className="text-slate-800 font-bold text-sm">Contact</TableHead>
                  {currentUser?.role === 'super_admin' && (
                    <TableHead className="text-slate-800 font-bold text-sm">Company</TableHead>
                  )}
                  <TableHead className="text-slate-800 font-bold text-sm">Source</TableHead>
                  <TableHead className="text-slate-800 font-bold text-sm">Priority</TableHead>
                  <TableHead className="text-slate-800 font-bold text-sm">Status</TableHead>
                  <TableHead className="text-slate-800 font-bold text-sm">Assignee</TableHead>
                  <TableHead className="text-slate-800 font-bold text-sm">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow 
                    key={lead.id} 
                    className="border-slate-200 hover:bg-slate-50 cursor-pointer"
                    onClick={(e) => {
                      if (e.target.type === 'checkbox') return;
                      router.push(`/leads/${lead.id}`);
                    }}
                  >
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedLeads.includes(lead.id)} 
                        onChange={() => toggleSelectRow(lead.id)}
                        className="rounded border-slate-350 bg-white text-indigo-650 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="text-base font-bold text-black">
                      {lead.first_name} {lead.last_name || ''}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="text-black font-medium">{lead.email || 'N/A'}</div>
                      <div className="text-black mt-0.5">{lead.phone || 'N/A'}</div>
                    </TableCell>
                    {currentUser?.role === 'super_admin' && (
                      <TableCell className="text-sm font-medium text-indigo-700">
                        {lead.Company?.company_name || <span className="text-slate-400 italic font-normal">—</span>}
                      </TableCell>
                    )}
                    <TableCell className="text-sm text-black font-medium">{lead.source}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                        lead.priority === 'High' ? 'bg-red-50 text-red-700 border border-red-100' :
                        lead.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        'bg-slate-100 text-slate-600 border border-slate-150'
                      }`}>
                        {lead.priority}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex rounded px-2.5 py-0.5 text-sm font-semibold bg-slate-50 text-slate-700 border border-slate-200">
                        {lead.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-black">
                      {lead.AssignedUser ? (
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-500" />
                          {lead.AssignedUser.name}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic font-normal">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-black font-semibold">
                      {lead.created_at || lead.createdAt ? new Date(lead.created_at || lead.createdAt).toLocaleDateString() : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination controls */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-150">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-medium">Page {currentPage} of {totalPages} &bull; {totalCount} total</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {[10, 25, 50, 100].map(opt => (
                      <option key={opt} value={opt}>{opt} / page</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* CREATE LEAD DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-800 max-w-lg rounded-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Create New Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">First Name</label>
                <Input 
                  required
                  placeholder="e.g. John" 
                  value={form.first_name}
                  onChange={(e) => setForm({...form, first_name: e.target.value})}
                  className="border-slate-200 bg-slate-50 text-slate-900"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Last Name</label>
                <Input 
                  placeholder="e.g. Doe" 
                  value={form.last_name}
                  onChange={(e) => setForm({...form, last_name: e.target.value})}
                  className="border-slate-200 bg-slate-50 text-slate-900"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Email</label>
                <Input 
                  type="email"
                  placeholder="e.g. john@example.com" 
                  value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})}
                  className="border-slate-200 bg-slate-50 text-slate-900"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Phone</label>
                <Input 
                  placeholder="e.g. +1 555 0199" 
                  value={form.phone}
                  onChange={(e) => setForm({...form, phone: e.target.value})}
                  className="border-slate-200 bg-slate-50 text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Source</label>
                <Select value={form.source} onValueChange={(val) => setForm({...form, source: val})}>
                  <SelectTrigger className="border-slate-200 bg-slate-50 text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white text-slate-800">
                    {sources.map(s => (
                      <SelectItem key={s.id} value={s.source_name}>{s.source_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Status</label>
                <Select value={form.status} onValueChange={(val) => setForm({...form, status: val})}>
                  <SelectTrigger className="border-slate-200 bg-slate-50 text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white text-slate-800">
                    {statuses.map(s => (
                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Priority</label>
                <Select value={form.priority} onValueChange={(val) => setForm({...form, priority: val})}>
                  <SelectTrigger className="border-slate-200 bg-slate-50 text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white text-slate-800">
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Subject</label>
              <Input 
                placeholder="Inquiry Topic" 
                value={form.subject}
                onChange={(e) => setForm({...form, subject: e.target.value})}
                className="border-slate-200 bg-slate-50 text-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Message / Description</label>
              <textarea 
                rows={3}
                placeholder="Additional notes or wordpress message text"
                value={form.message}
                onChange={(e) => setForm({...form, message: e.target.value})}
                className="w-full rounded-md border border-slate-200 bg-slate-50 text-slate-900 p-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} className="text-slate-500">
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-650 hover:bg-indigo-550 text-white">
                Create Lead
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* BULK ASSIGN DIALOG */}
      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-800 max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Bulk Assign leads</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Select Representative</label>
              <Select value={targetRepresentative} onValueChange={setTargetRepresentative}>
                <SelectTrigger className="border-slate-200 bg-slate-50 text-slate-700">
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white text-slate-800">
                  {team.map(m => (
                    <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="ghost" size="sm" onClick={() => setBulkAssignOpen(false)} className="text-slate-500">
              Cancel
            </Button>
            <Button size="sm" onClick={handleBulkAssign} className="bg-indigo-650 text-white hover:bg-indigo-500">
              Assign Rep
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BULK STATUS UPDATE DIALOG */}
      <Dialog open={bulkStatusOpen} onOpenChange={setBulkStatusOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-800 max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Bulk Update Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Select status</label>
              <Select value={targetStatus} onValueChange={setTargetStatus}>
                <SelectTrigger className="border-slate-200 bg-slate-50 text-slate-700">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white text-slate-800">
                  {statuses.map(s => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="ghost" size="sm" onClick={() => setBulkStatusOpen(false)} className="text-slate-500">
              Cancel
            </Button>
            <Button size="sm" onClick={handleBulkStatus} className="bg-indigo-650 text-white hover:bg-indigo-500">
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
