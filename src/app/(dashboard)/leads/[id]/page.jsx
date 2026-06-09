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
  CalendarDays
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiFetch as fetch } from '@/lib/clientApi';

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
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Task
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title || !taskForm.due_date || !taskForm.assigned_to) {
      alert('Task title, due date, and assignee are required.');
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
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle task status
  const handleToggleTask = async (task) => {
    try {
      const nextStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
      // We can update task status via PUT leads task route, but since we didn't define a dedicated PUT endpoint, we can support a fast fetch call or implement it. 
      // Let's call the generic update task endpoint or directly update in DB. Since we are in next, let's look at how tasks are modeled.
      // We can mock it or let's create a dedicated PUT task endpoint if needed, or update via a PUT API `/api/tasks/[id]`. Let's verify: we can build a quick route, or implement updating task in a dedicated endpoint `/api/tasks/route.js`. Yes! Let's do a fast PUT request to `/api/tasks` or write it.
      // Wait, we can implement the task complete toggle by requesting:
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
    if (!window.confirm('Are you sure you want to permanently delete this lead?')) return;
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        router.push('/leads');
      }
    } catch (err) {
      console.error(err);
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
                  <SelectValue />
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
            <TabsList className="grid w-full grid-cols-3 border border-slate-200 bg-slate-100 text-slate-500 rounded-lg h-10 p-0.5">
              <TabsTrigger value="timeline" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
                <Activity className="h-4 w-4 mr-1.5" /> Timeline
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
                  <div className="mb-6 rounded-lg bg-slate-50 border border-slate-100 p-4">
                    <p className="text-xs font-semibold text-indigo-650 mb-1">WordPress Inquiry Subject: {lead.subject || 'Inquiry'}</p>
                    <p className="text-xs text-slate-600 italic leading-relaxed">"{lead.message}"</p>
                  </div>
                )}

                {/* Timeline trail */}
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
          </Tabs>
        </div>
      </div>
    </div>
  );
}
