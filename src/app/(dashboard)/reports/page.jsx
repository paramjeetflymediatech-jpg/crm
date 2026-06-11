'use client';

import React, { useState, useEffect } from 'react';
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
import { Loader2, Download, TrendingUp, Users, Target, CheckCircle, FileText } from 'lucide-react';
import { apiFetch } from '@/lib/clientApi';


const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6'];

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const handleExportCSV = (type) => {
    if (!data) return;

    let headers = [];
    let rows = [];
    let filename = '';

    if (type === 'sources') {
      headers = ['Source Channel', 'Leads Count'];
      rows = data.charts.leadsBySource.map(s => [s.name, s.value]);
      filename = 'lead_sources_report.csv';
    } else if (type === 'team') {
      headers = ['Representative', 'Total Assigned Leads', 'Converted Leads', 'Conversion Rate (%)'];
      rows = data.charts.teamPerformance.map(t => [t.name, t.leads, t.converted, `${t.conversionRate}%`]);
      filename = 'representative_performance_report.csv';
    } else {
      headers = ['Month', 'Total Leads', 'Converted Leads'];
      rows = data.charts.leadsByMonth.map(m => [m.month, m.count, m.converted]);
      filename = 'monthly_growth_report.csv';
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    if (!data) return;
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF();
    const now = new Date().toLocaleString();

    // Title
    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229); // indigo
    doc.text('CRM Analytics Report', 14, 20);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Generated: ${now}`, 14, 28);

    // Summary Stats
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('Performance Summary', 14, 40);
    autoTable(doc, {
      startY: 44,
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
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    // Monthly Growth
    let yOffset = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Monthly Lead Growth', 14, yOffset);
    autoTable(doc, {
      startY: yOffset + 4,
      head: [['Month', 'Total Leads', 'Converted']],
      body: data.charts.leadsByMonth.map(m => [m.month, m.count, m.converted]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [16, 185, 129] },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    // Lead Sources
    yOffset = doc.lastAutoTable.finalY + 12;
    if (yOffset > 240) { doc.addPage(); yOffset = 20; }
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Leads by Source Channel', 14, yOffset);
    autoTable(doc, {
      startY: yOffset + 4,
      head: [['Source', 'Lead Count']],
      body: data.charts.leadsBySource.map(s => [s.name, s.value]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [245, 158, 11] },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    // Team Performance
    if (data.charts.teamPerformance.length > 0) {
      yOffset = doc.lastAutoTable.finalY + 12;
      if (yOffset > 240) { doc.addPage(); yOffset = 20; }
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('Representative Performance', 14, yOffset);
      autoTable(doc, {
        startY: yOffset + 4,
        head: [['Representative', 'Assigned', 'Converted', 'Rate']],
        body: data.charts.teamPerformance.map(t => [t.name, t.leads, t.converted, `${t.conversionRate}%`]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [168, 85, 247] },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });
    }

    doc.save(`crm_analytics_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };


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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Export, filter, and review conversion metrics.</p>
        </div>
        <Button onClick={handleExportPDF} className="bg-indigo-600 hover:bg-indigo-500 text-white">
          <FileText className="h-4 w-4 mr-2" /> Export Full PDF Report
        </Button>
      </div>

      {/* KPI summaries */}
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

      <div className="grid gap-6 md:grid-cols-2">
        {/* Source Performance */}
        <Card className="border-slate-200 bg-white text-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-900 font-semibold">Lead Source Channels</CardTitle>
              <CardDescription className="text-xs text-slate-500">Performance counts by acquisition channel</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => handleExportCSV('sources')} className="border-slate-200 text-xs text-slate-700 bg-white hover:bg-slate-50">
              <Download className="h-3.5 w-3.5 mr-1" /> Export
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

        {/* User conversions */}
        <Card className="border-slate-200 bg-white text-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-900 font-semibold">Representative Conversion Rates</CardTitle>
              <CardDescription className="text-xs text-slate-500">Assignments and successful conversions</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => handleExportCSV('team')} className="border-slate-200 text-xs text-slate-700 bg-white hover:bg-slate-50">
              <Download className="h-3.5 w-3.5 mr-1" /> Export
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

        {/* Monthly conversions growth */}
        <Card className="col-span-2 border-slate-200 bg-white text-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-900 font-semibold">Monthly Performance Trend</CardTitle>
              <CardDescription className="text-xs text-slate-500">Tracking monthly growth values</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => handleExportCSV('growth')} className="border-slate-200 text-xs text-slate-700 bg-white hover:bg-slate-50">
              <Download className="h-3.5 w-3.5 mr-1" /> Export
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
    </div>
  );
}
