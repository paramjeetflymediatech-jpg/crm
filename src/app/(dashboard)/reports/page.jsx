'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2, Download, TrendingUp, Users, Target, CheckCircle,
  FileText, ChevronLeft, ChevronRight, Search, Filter,
  BarChart2, TableProperties, FileSpreadsheet
} from 'lucide-react';
import { apiFetch } from '@/lib/clientApi';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6'];

const STATUS_COLORS = {
  'New':          { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  'Contacted':    { bg: '#fefce8', text: '#92400e', dot: '#eab308' },
  'Qualified':    { bg: '#ecfdf5', text: '#065f46', dot: '#10b981' },
  'Follow Up':    { bg: '#f5f3ff', text: '#6b21a8', dot: '#a855f7' },
  'Proposal Sent':{ bg: '#fff7ed', text: '#9a3412', dot: '#f97316' },
  'Converted':    { bg: '#f0fdf4', text: '#14532d', dot: '#22c55e' },
  'Lost':         { bg: '#fef2f2', text: '#991b1b', dot: '#ef4444' },
};

const PRIORITY_COLORS = {
  'High':   { bg: '#fef2f2', text: '#991b1b' },
  'Medium': { bg: '#fefce8', text: '#92400e' },
  'Low':    { bg: '#f0fdf4', text: '#14532d' },
};

const PAGE_SIZE = 10;

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Leads table state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  // PDF export dropdown state
  const [showPdfMenu, setShowPdfMenu] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await apiFetch('/api/reports');
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showPdfMenu) return;
    const handler = () => setShowPdfMenu(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showPdfMenu]);

  // ─── CSV Exports ──────────────────────────────────────────────────────────

  const downloadCSV = (headers, rows, filename) => {
    // Escape fields that contain commas or quotes
    const escape = (val) => {
      const str = String(val ?? '');
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const csvContent = 'data:text/csv;charset=utf-8,'
      + [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = (type) => {
    if (!data) return;
    if (type === 'sources') {
      downloadCSV(
        ['Source Channel', 'Leads Count'],
        data.charts.leadsBySource.map(s => [s.name, s.value]),
        'lead_sources_report.csv'
      );
    } else if (type === 'team') {
      downloadCSV(
        ['Representative', 'Total Assigned Leads', 'Converted Leads', 'Conversion Rate (%)'],
        data.charts.teamPerformance.map(t => [t.name, t.leads, t.converted, `${t.conversionRate}%`]),
        'representative_performance_report.csv'
      );
    } else if (type === 'growth') {
      downloadCSV(
        ['Month', 'Total Leads', 'Converted Leads'],
        data.charts.leadsByMonth.map(m => [m.month, m.count, m.converted]),
        'monthly_growth_report.csv'
      );
    } else if (type === 'leads') {
      // Export filtered leads
      downloadCSV(
        ['#', 'Name', 'Email', 'Phone', 'Source', 'Status', 'Priority', 'Lead Score', 'Assigned To', 'Subject', 'Created Date'],
        filteredLeads.map((l, i) => [
          i + 1, l.name, l.email, l.phone, l.source,
          l.status, l.priority, l.lead_score, l.assigned_to, l.subject,
          new Date(l.created_at).toLocaleDateString()
        ]),
        'leads_detail_report.csv'
      );
    }
  };

  // ─── PDF Exports ─────────────────────────────────────────────────────────

  const buildPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    return { jsPDF, autoTable };
  };

  const headerStyle = (color) => ({ fillColor: color });

  const handleExportPDF = async (type = 'full') => {
    if (!data) return;
    const { jsPDF, autoTable } = await buildPDF();
    const doc = new jsPDF();
    const now = new Date().toLocaleString();
    const dateStr = new Date().toISOString().split('T')[0];

    const addTitle = (doc, title) => {
      doc.setFontSize(18);
      doc.setTextColor(79, 70, 229);
      doc.text(title, 14, 20);
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${now}`, 14, 28);
    };

    const addSectionHeading = (doc, text, y) => {
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(text, 14, y);
    };

    const commonStyles = { fontSize: 9 };
    const altRow = { fillColor: [248, 250, 252] };

    // ── Summary section ──
    const addSummary = (doc, startY) => {
      addSectionHeading(doc, 'Performance Summary', startY);
      autoTable(doc, {
        startY: startY + 4,
        head: [['Metric', 'Value']],
        body: [
          ['Total Leads', data.summary.totalLeads],
          ['New Leads', data.summary.newLeads],
          ['Qualified Leads', data.summary.qualifiedLeads],
          ['Converted Leads', data.summary.convertedLeads],
          ['Lost Leads', data.summary.lostLeads],
          ['Conversion Rate', `${data.summary.conversionRate}%`],
          ['Follow-ups Today', data.summary.followupsToday],
        ],
        styles: commonStyles,
        headStyles: headerStyle([79, 70, 229]),
        alternateRowStyles: altRow,
      });
      return doc.lastAutoTable.finalY;
    };

    // ── Monthly section ──
    const addMonthly = (doc, startY) => {
      const y = startY > 240 ? (doc.addPage(), 20) : startY;
      addSectionHeading(doc, 'Monthly Lead Growth', y);
      autoTable(doc, {
        startY: y + 4,
        head: [['Month', 'Total Leads', 'Converted']],
        body: data.charts.leadsByMonth.map(m => [m.month, m.count, m.converted]),
        styles: commonStyles,
        headStyles: headerStyle([16, 185, 129]),
        alternateRowStyles: altRow,
      });
      return doc.lastAutoTable.finalY;
    };

    // ── Sources section ──
    const addSources = (doc, startY) => {
      const y = startY + 12 > 240 ? (doc.addPage(), 20) : startY + 12;
      addSectionHeading(doc, 'Leads by Source Channel', y);
      autoTable(doc, {
        startY: y + 4,
        head: [['Source', 'Lead Count']],
        body: data.charts.leadsBySource.map(s => [s.name, s.value]),
        styles: commonStyles,
        headStyles: headerStyle([245, 158, 11]),
        alternateRowStyles: altRow,
      });
      return doc.lastAutoTable.finalY;
    };

    // ── Team section ──
    const addTeam = (doc, startY) => {
      if (!data.charts.teamPerformance.length) return startY;
      const y = startY + 12 > 240 ? (doc.addPage(), 20) : startY + 12;
      addSectionHeading(doc, 'Representative Performance', y);
      autoTable(doc, {
        startY: y + 4,
        head: [['Representative', 'Assigned', 'Converted', 'Conversion Rate']],
        body: data.charts.teamPerformance.map(t => [t.name, t.leads, t.converted, `${t.conversionRate}%`]),
        styles: commonStyles,
        headStyles: headerStyle([168, 85, 247]),
        alternateRowStyles: altRow,
      });
      return doc.lastAutoTable.finalY;
    };

    // ── Leads detail section ──
    const addLeadsDetail = (doc, startY) => {
      const leadsToExport = data.leadsDetail || [];
      if (!leadsToExport.length) return startY;
      const y = startY > 240 ? (doc.addPage(), 20) : startY;
      addSectionHeading(doc, 'All Leads Detail', y);
      autoTable(doc, {
        startY: y + 4,
        head: [['#', 'Name', 'Email', 'Phone', 'Source', 'Status', 'Priority', 'Score', 'Assigned To', 'Date']],
        body: leadsToExport.map((l, i) => [
          i + 1,
          l.name,
          l.email,
          l.phone,
          l.source,
          l.status,
          l.priority,
          l.lead_score,
          l.assigned_to,
          new Date(l.created_at).toLocaleDateString(),
        ]),
        styles: { fontSize: 7.5 },
        headStyles: headerStyle([14, 165, 233]),
        alternateRowStyles: altRow,
        columnStyles: { 2: { cellWidth: 38 } },
      });
      return doc.lastAutoTable.finalY;
    };

    if (type === 'full') {
      addTitle(doc, 'CRM Analytics Report — Full');
      let y = addSummary(doc, 40);
      y = addMonthly(doc, y + 12);
      y = addSources(doc, y);
      y = addTeam(doc, y);
      doc.addPage();
      addLeadsDetail(doc, 20);
      doc.save(`crm_full_report_${dateStr}.pdf`);

    } else if (type === 'summary') {
      addTitle(doc, 'CRM Analytics Report — Summary');
      addSummary(doc, 40);
      doc.save(`crm_summary_report_${dateStr}.pdf`);

    } else if (type === 'charts') {
      addTitle(doc, 'CRM Analytics Report — Charts Data');
      let y = addMonthly(doc, 40);
      y = addSources(doc, y);
      addTeam(doc, y);
      doc.save(`crm_charts_report_${dateStr}.pdf`);

    } else if (type === 'leads') {
      addTitle(doc, 'CRM Analytics Report — Leads Detail');
      addLeadsDetail(doc, 40);
      doc.save(`crm_leads_report_${dateStr}.pdf`);
    }
  };

  // ─── Filtered leads (for table) ──────────────────────────────────────────

  const allStatuses = useMemo(() => {
    if (!data?.leadsDetail) return [];
    return ['All', ...new Set(data.leadsDetail.map(l => l.status))];
  }, [data]);

  const allSources = useMemo(() => {
    if (!data?.leadsDetail) return [];
    return ['All', ...new Set(data.leadsDetail.map(l => l.source))];
  }, [data]);

  const filteredLeads = useMemo(() => {
    if (!data?.leadsDetail) return [];
    return data.leadsDetail.filter(lead => {
      const matchSearch = !search ||
        lead.name.toLowerCase().includes(search.toLowerCase()) ||
        (lead.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (lead.phone || '').includes(search);
      const matchStatus = statusFilter === 'All' || lead.status === statusFilter;
      const matchSource = sourceFilter === 'All' || lead.source === sourceFilter;
      return matchSearch && matchStatus && matchSource;
    });
  }, [data, search, statusFilter, sourceFilter]);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, sourceFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const pagedLeads = filteredLeads.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading || !data) {
    return (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const { summary, charts } = data;

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports &amp; Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Export, filter, and review conversion metrics.</p>
        </div>

        {/* PDF Export Dropdown */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <Button
            onClick={() => setShowPdfMenu(v => !v)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
          >
            <FileText className="h-4 w-4" />
            Export PDF
            <svg className="h-3 w-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>

          {showPdfMenu && (
            <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-slate-200 bg-white shadow-lg py-1 overflow-hidden">
              {[
                { type: 'full',    icon: <FileText className="h-4 w-4 text-indigo-500" />,   label: 'Full Report',        desc: 'All sections' },
                { type: 'summary', icon: <BarChart2 className="h-4 w-4 text-emerald-500" />,  label: 'Summary Only',       desc: 'KPI metrics' },
                { type: 'charts',  icon: <TrendingUp className="h-4 w-4 text-amber-500" />,   label: 'Charts Data',        desc: 'Monthly, sources, team' },
                { type: 'leads',   icon: <TableProperties className="h-4 w-4 text-sky-500" />, label: 'Leads Detail',      desc: 'Full lead records' },
              ].map(item => (
                <button
                  key={item.type}
                  onClick={() => { setShowPdfMenu(false); handleExportPDF(item.type); }}
                  className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="mt-0.5">{item.icon}</span>
                  <span>
                    <span className="block text-sm font-medium text-slate-800">{item.label}</span>
                    <span className="block text-xs text-slate-400">{item.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 bg-white text-slate-700">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Conversion Rate</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{summary.conversionRate}%</h3>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3 text-emerald-600">
              <Target className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white text-slate-700">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Converted</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{summary.convertedLeads}</h3>
            </div>
            <div className="rounded-lg bg-indigo-50 p-3 text-indigo-600">
              <CheckCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white text-slate-700">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Leads</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{summary.totalLeads}</h3>
            </div>
            <div className="rounded-lg bg-sky-50 p-3 text-sky-600">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white text-slate-700">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Reminders</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{summary.followupsToday}</h3>
            </div>
            <div className="rounded-lg bg-purple-50 p-3 text-purple-600">
              <TrendingUp className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts ── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Source Performance */}
        <Card className="border-slate-200 bg-white text-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-900 font-semibold">Lead Source Channels</CardTitle>
              <CardDescription className="text-xs text-slate-500">Performance counts by acquisition channel</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => handleExportCSV('sources')} className="border-slate-200 text-xs text-slate-700 bg-white hover:bg-slate-50">
              <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.leadsBySource} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px' }} />
                <Bar dataKey="value" name="Leads count" radius={[4, 4, 0, 0]}>
                  {charts.leadsBySource.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Team Performance */}
        <Card className="border-slate-200 bg-white text-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-900 font-semibold">Representative Conversion Rates</CardTitle>
              <CardDescription className="text-xs text-slate-500">Assignments and successful conversions</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => handleExportCSV('team')} className="border-slate-200 text-xs text-slate-700 bg-white hover:bg-slate-50">
              <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent className="h-72">
            {charts.teamPerformance.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-500">
                No staff members found or restricted access.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.teamPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="leads" name="Total Assigned" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="converted" name="Converted" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card className="col-span-2 border-slate-200 bg-white text-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-900 font-semibold">Monthly Performance Trend</CardTitle>
              <CardDescription className="text-xs text-slate-500">Tracking monthly growth values</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => handleExportCSV('growth')} className="border-slate-200 text-xs text-slate-700 bg-white hover:bg-slate-50">
              <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.leadsByMonth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px' }} />
                <Legend iconType="circle" />
                <Line type="monotone" name="Leads Captured" dataKey="count" stroke="#6366f1" strokeWidth={3} />
                <Line type="monotone" name="Converted" dataKey="converted" stroke="#10b981" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Leads Detail Table ── */}
      <Card className="border-slate-200 bg-white text-slate-700">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base text-slate-900 font-semibold flex items-center gap-2">
              <TableProperties className="h-4 w-4 text-indigo-500" />
              All Leads Detail
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Complete lead records — {filteredLeads.length} result{filteredLeads.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search name / email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs w-48 border-slate-200"
              />
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {allStatuses.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
            </select>

            {/* Source filter */}
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {allSources.map(s => <option key={s} value={s}>{s === 'All' ? 'All Sources' : s}</option>)}
            </select>

            {/* Export Leads CSV */}
            <Button size="sm" variant="outline" onClick={() => handleExportCSV('leads')} className="border-slate-200 text-xs text-slate-700 bg-white hover:bg-slate-50 h-8">
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Export CSV
            </Button>

            {/* Export Leads PDF */}
            <Button size="sm" variant="outline" onClick={() => handleExportPDF('leads')} className="border-slate-200 text-xs text-slate-700 bg-white hover:bg-slate-50 h-8">
              <FileText className="h-3.5 w-3.5 mr-1" /> Export PDF
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50">
                  {['#', 'Name', 'Email', 'Phone', 'Source', 'Status', 'Priority', 'Score', 'Assigned To', 'Date'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-xs text-slate-400">
                      No leads match your current filters.
                    </td>
                  </tr>
                ) : pagedLeads.map((lead, idx) => {
                  const sc = STATUS_COLORS[lead.status] || STATUS_COLORS['New'];
                  const pc = PRIORITY_COLORS[lead.priority] || PRIORITY_COLORS['Medium'];
                  const rowNum = (currentPage - 1) * PAGE_SIZE + idx + 1;
                  return (
                    <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">{rowNum}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800 text-xs">{lead.name || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px] truncate">{lead.email || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{lead.phone || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{lead.source || '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
                          style={{ backgroundColor: sc.bg, color: sc.text }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: sc.dot }} />
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
                          style={{ backgroundColor: pc.bg, color: pc.text }}
                        >
                          {lead.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-indigo-500"
                              style={{ width: `${Math.min(100, lead.lead_score)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-600 font-mono">{lead.lead_score}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{lead.assigned_to}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(lead.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                Page {currentPage} of {totalPages} &bull; {filteredLeads.length} total leads
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="h-7 w-7 p-0 border-slate-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Show pages around current
                  let page;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={page}
                      size="sm"
                      variant={page === currentPage ? 'default' : 'outline'}
                      onClick={() => setCurrentPage(page)}
                      className={`h-7 w-7 p-0 text-xs ${page === currentPage ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-600' : 'border-slate-200 text-slate-600'}`}
                    >
                      {page}
                    </Button>
                  );
                })}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="h-7 w-7 p-0 border-slate-200"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
