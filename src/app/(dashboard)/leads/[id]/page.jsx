'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Calendar, 
  User, 
  MessageSquare,
  Activity,
  CheckSquare,
  Square,
  Loader2,
  Trash2,
  Plus,
  CalendarDays,
  PhoneCall,
  Headphones,
  Volume2,
  Upload,
  FileAudio,
  Lock,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiFetch as fetch } from '@/lib/clientApi';
import { showSuccess, showError, showConfirm, Toast } from '@/lib/sweetalert';

export default function LeadDetailPage({ params: paramsPromise }) {
  const router = useRouter();
  
  const [params, setParams] = useState(null);
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState([]);
  const [team, setTeam] = useState([]);
  
  // Note Form
  const [noteContent, setNoteContent] = useState('');
  
  // Task Form
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    due_date: '',
    assigned_to: ''
  });
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  // Call Log Modal & Upload states
  const [showCallModal, setShowCallModal] = useState(false);
  const [callSubmitting, setCallSubmitting] = useState(false);
  const [callForm, setCallForm] = useState({
    direction: 'outbound',
    duration: 60,
    status: 'completed',
    notes: '',
    file: null
  });

  const handleCallSubmit = async (e) => {
    e.preventDefault();
    if (!lead) return;

    try {
      setCallSubmitting(true);
      const formData = new FormData();
      formData.append('lead_id', lead.id.toString());
      formData.append('phone_number', lead.phone || '');
      formData.append('direction', callForm.direction);
      formData.append('duration', (parseInt(callForm.duration, 10) || 0).toString());
      formData.append('status', callForm.status);
      formData.append('notes', callForm.notes || '');

      if (callForm.file) {
        formData.append('file', callForm.file);
      }

      const res = await fetch('/api/calls/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        showSuccess('Call Logged', 'Call record and audio recording successfully saved.');
        setShowCallModal(false);
        setCallForm({
          direction: 'outbound',
          duration: 60,
          status: 'completed',
          notes: '',
          file: null
        });
        refreshLead();
      } else {
        showError('Upload Failed', data.error || 'Failed to save call log.');
      }
    } catch (err) {
      showError('Error', err.message || 'An error occurred while saving call log.');
    } finally {
      setCallSubmitting(false);
    }
  };

  // Unwrap params using React.use() or a simple useEffect wrapper
  useEffect(() => {
    paramsPromise.then(resolved => setParams(resolved));
  }, [paramsPromise]);

  useEffect(() => {
    if (!params) return;

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }

    const fetchAllData = async () => {
      try {
        const [resLead, resStatus, resUsers] = await Promise.all([
          fetch(`/api/leads/${params.id}`),
          fetch('/api/leads/statuses'),
          fetch('/api/users')
        ]);

        if (resLead.ok) {
          const d = await resLead.json();
          setLead(d.lead);
        } else {
          router.push('/leads');
        }

        if (resStatus.ok) {
          const d = await resStatus.json();
          setStatuses(d.statuses || []);
        }

        if (resUsers.ok) {
          const d = await resUsers.json();
          setTeam(d.users || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [params, router]);

  const refreshLead = async () => {
    if (!params) return;
    try {
      const res = await fetch(`/api/leads/${params.id}`);
      if (res.ok) {
        const d = await res.json();
        setLead(d.lead);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update single field (e.g. status, priority, assigned_to)
  const handleFieldChange = async (fieldName, value) => {
    if (!lead) return;
    try {
      const parsedVal = fieldName === 'assigned_to' ? (value === 'unassigned' ? null : parseInt(value, 10)) : value;
      
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [fieldName]: parsedVal })
      });
      if (res.ok) {
        refreshLead();
        Toast.fire({ icon: 'success', title: 'Field updated' });
      } else {
        const err = await res.json();
        showError('Update Failed', err.error || 'Failed to update field.');
      }
    } catch (err) {
      console.error(err);
      showError('Error', 'An unexpected error occurred.');
    }
  };

  // Add Note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    try {
      const res = await fetch(`/api/leads/${lead.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteContent })
      });
      if (res.ok) {
        setNoteContent('');
        refreshLead();
        Toast.fire({ icon: 'success', title: 'Note added to lead' });
      } else {
        const err = await res.json();
        showError('Failed', err.error || 'Could not add note');
      }
    } catch (err) {
      console.error(err);
      showError('Error', 'An unexpected error occurred.');
    }
  };

  // Add Task
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title || !taskForm.due_date || !taskForm.assigned_to) {
      showError('Incomplete Task', 'Task title, due date, and assignee are required.');
      return;
    }
    try {
      const res = await fetch(`/api/leads/${lead.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description,
          due_date: new Date(taskForm.due_date).toISOString(),
          assigned_to: parseInt(taskForm.assigned_to, 10)
        })
      });
      if (res.ok) {
        setTaskForm({ title: '', description: '', due_date: '', assigned_to: '' });
        setShowTaskForm(false);
        refreshLead();
        Toast.fire({ icon: 'success', title: 'Task scheduled successfully' });
      } else {
        const err = await res.json();
        showError('Task Failed', err.error || 'Failed to schedule task.');
      }
    } catch (err) {
      console.error(err);
      showError('Error', 'An unexpected error occurred.');
    }
  };

  // Toggle task status
  const handleToggleTask = async (task) => {
    try {
      const nextStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
      const res = await fetch(`/api/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, status: nextStatus })
      });
      if (res.ok) {
        refreshLead();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Lead
  const handleDeleteLead = async () => {
    const confirmed = await showConfirm({
      title: 'Permanently delete this lead?',
      text: 'This action will delete this lead, including all communication history and scheduled follow-ups.',
      confirmButtonText: 'Yes, delete lead',
      isDanger: true
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        Toast.fire({ icon: 'success', title: 'Lead deleted successfully' });
        router.push('/leads');
      } else {
        const err = await res.json();
        showError('Delete Failed', err.error || 'Failed to delete lead.');
      }
    } catch (err) {
      console.error(err);
      showError('Error', 'An unexpected error occurred while deleting lead.');
    }
  };

  if (loading || !lead) {
    return (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top action controls */}
      <div className="flex items-center justify-between">
        <Button 
          onClick={() => router.push('/leads')} 
          variant="ghost" 
          className="text-slate-500 hover:text-slate-800 hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Leads
        </Button>
        {currentUser?.role !== 'staff' && (
          <Button 
            onClick={handleDeleteLead} 
            variant="ghost" 
            className="text-red-650 hover:text-red-550 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete Lead
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Profile Panel */}
        <Card className="border-slate-200 bg-white text-slate-700 md:col-span-1">
          <CardHeader className="text-center border-b border-slate-100">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-650 text-white font-bold text-xl uppercase shadow-md">
              {lead.first_name[0]}{lead.last_name ? lead.last_name[0] : ''}
            </div>
            <CardTitle className="text-xl font-bold text-slate-900 mt-3 leading-snug">
              {lead.first_name} {lead.last_name || ''}
            </CardTitle>
            <span className="inline-flex mx-auto rounded px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-650">
              WordPress {lead.source || 'Manual'}
            </span>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            {/* Contact Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs">
                <Mail className="h-4 w-4 text-slate-500" />
                <span className="truncate">{lead.email || 'No email provided'}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <Phone className="h-4 w-4 text-slate-500" />
                <span>{lead.phone || 'No phone provided'}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span>Sync Date: {lead.created_at || lead.createdAt ? new Date(lead.created_at || lead.createdAt).toLocaleDateString() : 'N/A'}</span>
              </div>
              {lead.phone && (
                <div className="flex gap-2 pt-1">
                  <a
                    href={`tel:${lead.phone.replace(/[^0-9+]/g, '')}`}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-9 flex items-center justify-center gap-1.5 shadow-xs rounded-lg transition"
                  >
                    <Phone className="h-3.5 w-3.5" /> Call Phone
                  </a>
                  <Button
                    onClick={() => setShowCallModal(true)}
                    variant="outline"
                    className="flex-1 border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs h-9 flex items-center justify-center gap-1.5 shadow-xs rounded-lg"
                  >
                    <FileAudio className="h-3.5 w-3.5 text-indigo-600" /> Log Call
                  </Button>
                </div>
              )}
            </div>

            <hr className="border-slate-100" />

            {/* Dropdown Select Statuses */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lead Status</label>
              <Select value={lead.status} onValueChange={(val) => handleFieldChange('status', val)}>
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

            {/* Priority Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priority Level</label>
              <Select value={lead.priority} onValueChange={(val) => handleFieldChange('priority', val)}>
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

            {/* Follow-up Date Picker */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scheduled Follow-up Date</label>
              <Input
                type="datetime-local"
                value={lead.follow_up_date ? new Date(new Date(lead.follow_up_date).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  handleFieldChange('follow_up_date', val ? new Date(val).toISOString() : null);
                }}
                className="border-slate-200 bg-slate-50 text-slate-700"
              />
            </div>

            {/* Assign User Select */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Rep</label>
              <Select 
                value={lead.assigned_to ? lead.assigned_to.toString() : 'unassigned'} 
                onValueChange={(val) => handleFieldChange('assigned_to', val)}
              >
                <SelectTrigger className="border-slate-200 bg-slate-50 text-slate-700">
                  <span>
                    {lead.assigned_to
                      ? (team.find(m => m.id === lead.assigned_to || m.id.toString() === lead.assigned_to?.toString())?.name || 'Unassigned')
                      : 'Unassigned'}
                  </span>
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white text-slate-800">
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {team.map(m => (
                    <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Right Tabbed Timeline Workspace */}
        <div className="md:col-span-2">
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="grid w-full grid-cols-4 border border-slate-200 bg-slate-100 text-slate-500 rounded-lg h-10 p-0.5">
              <TabsTrigger value="timeline" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
                <Activity className="h-4 w-4 mr-1.5" /> Timeline
              </TabsTrigger>
              <TabsTrigger value="calls" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
                <PhoneCall className="h-4 w-4 mr-1.5" /> Calls ({lead.CallLogs?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="notes" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
                <MessageSquare className="h-4 w-4 mr-1.5" /> Notes
              </TabsTrigger>
              <TabsTrigger value="tasks" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
                <CheckSquare className="h-4 w-4 mr-1.5" /> Tasks
              </TabsTrigger>
            </TabsList>

            {/* Timeline Area */}
            <TabsContent value="timeline" className="mt-4">
              <Card className="border-slate-200 bg-white text-slate-655 p-6">
                <h3 className="text-base font-bold text-slate-900 mb-4">Activities Log</h3>
                
                {/* Inquiry message box */}
                {lead.message && (
                  <div className="mb-6 rounded-xl bg-slate-50 border border-slate-200 p-5 shadow-xs">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-indigo-600" />
                        {lead.source === 'Facebook Ads' ? 'Facebook Lead Form Submission' : (lead.subject || 'Form Inquiry Message')}
                      </h4>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {lead.source || 'Website'}
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      {lead.message.includes(': ') ? (
                        <div className="grid gap-2.5 sm:grid-cols-2">
                          {lead.message.split('\n').map((line, idx) => {
                            const trimmed = line.trim();
                            if (!trimmed) return null;
                            if (trimmed.startsWith('---')) {
                              return (
                                <div key={idx} className="sm:col-span-2 pt-2 border-t border-slate-200 font-bold text-slate-700 text-[11px] tracking-wider uppercase">
                                  {trimmed.replace(/---/g, '').trim()}
                                </div>
                              );
                            }

                            const colonIdx = trimmed.indexOf(': ');
                            if (colonIdx > 0) {
                              const key = trimmed.slice(0, colonIdx).replace(/^[•\-*]\s*/, '');
                              const val = trimmed.slice(colonIdx + 2);
                              return (
                                <div key={idx} className="bg-white border border-slate-200/80 rounded-lg p-3 flex flex-col justify-between shadow-2xs">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{key}</span>
                                  <span className="text-xs font-semibold text-slate-900 break-words">{val}</span>
                                </div>
                              );
                            }

                            return (
                              <div key={idx} className="sm:col-span-2 text-slate-700 text-xs">
                                {trimmed}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {lead.message}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Timeline trail */}
                <div className="overflow-y-auto max-h-[420px] pr-1">
                  <div className="relative border-l border-slate-200 pl-4 space-y-6">
                    {lead.Activities && lead.Activities.length === 0 ? (
                      <p className="text-xs text-slate-500">No activity trail recorded.</p>
                    ) : (
                      lead.Activities?.map((act) => (
                        <div key={act.id} className="relative">
                          {/* Dot indicator */}
                          <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-500 border-2 border-white" />
                          <div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-800">{act.action}</span>
                              <span className="text-[10px] text-slate-505">
                                {act.created_at || act.createdAt ? new Date(act.created_at || act.createdAt).toLocaleString() : 'N/A'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{act.description}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Notes Area */}
            <TabsContent value="notes" className="mt-4 space-y-4">
              {/* Note creator */}
              <Card className="border-slate-200 bg-white p-4">
                <form onSubmit={handleAddNote} className="space-y-3">
                  <textarea 
                    rows={3}
                    placeholder="Type comments, call notes or follow-up summaries..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    className="w-full rounded-md border border-slate-200 bg-slate-50 text-slate-800 p-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" className="bg-indigo-650 hover:bg-indigo-550 text-white text-xs">
                      Submit Note
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Note records list */}
              <div className="space-y-4">
                {lead.Notes && lead.Notes.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No notes left yet. Add details above.
                  </div>
                ) : (
                  lead.Notes?.map((note) => (
                    <Card key={note.id} className="border-slate-200 bg-white text-slate-700">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5">
                          <span className="font-semibold text-indigo-650">{note.User?.name}</span>
                          <span className="text-[10px] text-slate-505">
                            {note.created_at || note.createdAt ? new Date(note.created_at || note.createdAt).toLocaleString() : 'N/A'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">{note.note}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Tasks Area */}
            <TabsContent value="tasks" className="mt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-slate-900">Call/Follow-up Checklist</h3>
                <Button 
                  size="sm" 
                  onClick={() => setShowTaskForm(!showTaskForm)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs border border-slate-200 shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Task
                </Button>
              </div>

              {/* Task Form Panel */}
              {showTaskForm && (
                <Card className="border-slate-200 bg-white p-4">
                  <form onSubmit={handleAddTask} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400">Task Title</label>
                        <Input 
                          required 
                          placeholder="e.g. Schedule Initial Call" 
                          value={taskForm.title}
                          onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                          className="border-slate-200 bg-slate-50 text-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400">Assignee</label>
                        <Select 
                          value={taskForm.assigned_to} 
                          onValueChange={(val) => setTaskForm({...taskForm, assigned_to: val})}
                        >
                          <SelectTrigger className="border-slate-200 bg-slate-50 text-slate-700">
                            <SelectValue placeholder="Choose rep" />
                          </SelectTrigger>
                          <SelectContent className="border-slate-200 bg-white text-slate-800">
                            {team.map(t => (
                              <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400">Due Date</label>
                        <Input 
                          required 
                          type="datetime-local" 
                          value={taskForm.due_date}
                          onChange={(e) => setTaskForm({...taskForm, due_date: e.target.value})}
                          className="border-slate-200 bg-slate-50 text-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400">Description</label>
                        <Input 
                          placeholder="e.g. call details, context" 
                          value={taskForm.description}
                          onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                          className="border-slate-200 bg-slate-50 text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowTaskForm(false)} className="text-slate-505 text-xs">
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" className="bg-indigo-650 hover:bg-indigo-550 text-white text-xs">
                        Save Task
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {/* Tasks List */}
              <div className="space-y-2">
                {lead.Tasks && lead.Tasks.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No active reminders. Add one above.
                  </div>
                ) : (
                  lead.Tasks?.map((task) => {
                    const isOverdue = new Date(task.due_date) < new Date() && task.status === 'Pending';
                    return (
                      <div 
                        key={task.id} 
                        onClick={() => handleToggleTask(task)}
                        className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3">
                          {task.status === 'Completed' ? (
                            <CheckSquare className="h-5 w-5 text-indigo-500" />
                          ) : (
                            <Square className="h-5 w-5 text-slate-400" />
                          )}
                          <div>
                            <p className={`text-xs font-semibold ${task.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-[10px] text-slate-500 mt-0.5">{task.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-[10px]">
                          <span className="flex items-center gap-1 text-slate-505">
                            <User className="h-3 w-3 text-slate-400" /> {task.AssignedUser?.name}
                          </span>
                          <span className={`flex items-center gap-1 font-semibold rounded px-1.5 py-0.5 ${
                            isOverdue ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-slate-100 text-slate-600'
                          }`}>
                            <Calendar className="h-3 w-3" />
                            {new Date(task.due_date).toLocaleDateString()} {new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {/* Calls & Recordings Area */}
            <TabsContent value="calls" className="mt-4">
              <Card className="border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Headphones className="h-5 w-5 text-indigo-600" /> Call Logs & Audio Recordings
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Calls placed via Android SIM or logged with audio recordings.</p>
                  </div>
                  <Button
                    onClick={() => setShowCallModal(true)}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" /> Log Call / Recording
                  </Button>
                </div>

                {/* Call logs list */}
                <div className="space-y-3">
                  {(!lead.CallLogs || lead.CallLogs.length === 0) ? (
                    <div className="py-12 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                        <PhoneCall className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">No calls recorded yet</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                        Calls made and recorded from your Android app will automatically upload here. You can also manually log a call or upload a recording above.
                      </p>
                    </div>
                  ) : (
                    lead.CallLogs.map((call) => {
                      const isCompleted = call.status === 'completed';
                      const isBusyOrFailed = ['failed', 'busy', 'no-answer'].includes(call.status);
                      const durationMinutes = Math.floor(call.duration / 60);
                      const durationSeconds = call.duration % 60;

                      return (
                        <div
                          key={call.id}
                          className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                isCompleted ? 'bg-emerald-100 text-emerald-700' : isBusyOrFailed ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                <PhoneCall className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-800 capitalize">
                                    {call.direction || 'Outbound'} Call
                                  </span>
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                                    isCompleted
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : isBusyOrFailed
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                                  }`}>
                                    {call.status}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {new Date(call.created_at || call.createdAt).toLocaleString()} {call.User?.name ? `• Agent: ${call.User.name}` : ''}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-xs font-bold text-slate-700">
                                {durationMinutes > 0 ? `${durationMinutes}m ` : ''}{durationSeconds}s
                              </span>
                            </div>
                          </div>

                          {/* Audio Player - Restricted exclusively to super_admin and company_admin */}
                          {call.recording_url && (currentUser?.role === 'super_admin' || currentUser?.role === 'company_admin') ? (
                            <div className="pt-2 border-t border-slate-200/70">
                              <div className="flex items-center gap-2 mb-1.5">
                                <Volume2 className="h-3.5 w-3.5 text-indigo-600" />
                                <span className="text-[11px] font-medium text-slate-600">Recording Audio (Admin Access)</span>
                              </div>
                              <audio
                                controls
                                className="w-full h-8 rounded"
                                src={call.recording_url}
                                preload="none"
                              >
                                Your browser does not support the audio element.
                              </audio>
                            </div>
                          ) : (call.recording_url || call.has_recording) ? (
                            <div className="pt-2 border-t border-slate-200/70 flex items-center gap-2 text-[11px] text-slate-500 bg-slate-100/70 p-2 rounded-lg">
                              <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>Audio recording secured &bull; Restricted to administrators only.</span>
                            </div>
                          ) : isCompleted ? (
                            <div className="text-[11px] text-slate-400 italic pt-1">
                              No audio recording attached to this call.
                            </div>
                          ) : null}

                          {call.notes && (
                            <p className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-100">
                              {call.notes}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Log Call & Audio Recording Dialog */}
      <Dialog open={showCallModal} onOpenChange={setShowCallModal}>
        <DialogContent className="sm:max-w-md bg-white text-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Headphones className="h-5 w-5 text-indigo-600" /> Log Call & Upload Recording
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCallSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Call Direction</label>
                <Select
                  value={callForm.direction}
                  onValueChange={(val) => setCallForm({ ...callForm, direction: val })}
                >
                  <SelectTrigger className="border-slate-200 bg-slate-50 text-slate-900 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="outbound">Outbound (Dialed)</SelectItem>
                    <SelectItem value="inbound">Inbound (Received)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Call Outcome</label>
                <Select
                  value={callForm.status}
                  onValueChange={(val) => setCallForm({ ...callForm, status: val })}
                >
                  <SelectTrigger className="border-slate-200 bg-slate-50 text-slate-900 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="completed">Completed / Answered</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="no-answer">No Answer</SelectItem>
                    <SelectItem value="follow-up">Follow Up Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Call Duration (seconds)</label>
              <Input
                type="number"
                min="0"
                value={callForm.duration}
                onChange={(e) => setCallForm({ ...callForm, duration: e.target.value })}
                placeholder="e.g. 90"
                className="border-slate-200 bg-slate-50 text-slate-900 text-xs"
              />
              <p className="text-[10px] text-slate-400">
                {Math.floor((parseInt(callForm.duration, 10) || 0) / 60)} minutes {(parseInt(callForm.duration, 10) || 0) % 60} seconds
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Audio Recording File (.mp3, .m4a, .wav)</label>
              <Input
                type="file"
                accept="audio/*,.mp3,.m4a,.wav,.aac,.3gp,.amr,.ogg"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setCallForm({ ...callForm, file: f });
                }}
                className="border-slate-200 bg-slate-50 text-slate-900 text-xs file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-indigo-50 file:text-indigo-700"
              />
              <p className="text-[10px] text-slate-400">Attach the audio file recorded on Android or call dialer.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Call Notes / Discussion Summary</label>
              <textarea
                rows={3}
                value={callForm.notes}
                onChange={(e) => setCallForm({ ...callForm, notes: e.target.value })}
                placeholder="Key points discussed, next steps, customer requirements..."
                className="w-full rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCallModal(false)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={callSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium"
              >
                {callSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving...
                  </>
                ) : (
                  'Save Call Record'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
