'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/button'; // fallback custom badge
import { CalendarDays, Bell, User, Loader2, ArrowRight } from 'lucide-react';
import { apiFetch as fetch } from '@/lib/clientApi';

export default function CalendarPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch('/api/reports'); // reports API returns follow-ups count and tasks due
        // Let's directly pull tasks by querying reports or making a custom query. 
        // Wait, reports returns lead details. Let's write an endpoint or pull from api/leads. 
        // Actually, we can fetch all leads and map follow-up dates!
        // Or we can query leads that have follow_up_date.
        // Let's query leads from /api/leads with a large limit to map follow-ups.
        const resLeads = await fetch('/api/leads?limit=100');
        if (resLeads.ok) {
          const d = await resLeads.json();
          // Filter leads that have follow-up dates set
          const followUpTasks = d.leads
            .filter(l => l.follow_up_date)
            .map(l => ({
              id: `lead-${l.id}`,
              title: `Follow-up with ${l.first_name} ${l.last_name || ''}`,
              date: new Date(l.follow_up_date),
              leadId: l.id,
              description: l.subject || 'Follow-up discussion',
              assignee: l.AssignedUser?.name || 'Unassigned',
              status: l.status,
              priority: l.priority
            }));

          setTasks(followUpTasks);
        }
      } catch (err) {
        console.error('Error fetching calendar data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  // Filter tasks due on the selected date
  const selectedTasks = tasks.filter(task => {
    const d = new Date(task.date);
    return (
      d.getDate() === selectedDate.getDate() &&
      d.getMonth() === selectedDate.getMonth() &&
      d.getFullYear() === selectedDate.getFullYear()
    );
  });

  // Highlight days with scheduled follow-ups
  const modifiers = {
    booked: (date) => {
      return tasks.some(task => {
        const d = new Date(task.date);
        return (
          d.getDate() === date.getDate() &&
          d.getMonth() === date.getMonth() &&
          d.getFullYear() === date.getFullYear()
        );
      });
    }
  };

  const modifiersStyles = {
    booked: {
      fontWeight: 'bold',
      border: '2px solid #2563eb',
      borderRadius: '50%'
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Follow-up Calendar</h1>
        <p className="text-sm text-slate-500 mt-1">Check scheduled appointments and lead actions.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Visual Calendar */}
        <Card className="border-slate-200 bg-white text-slate-700 md:col-span-1 flex flex-col items-center p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="rounded-md border border-slate-200 bg-white text-slate-700"
          />
          <div className="text-xs text-slate-500 mt-4 flex items-center gap-1.5 self-start px-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-indigo-500" />
            Days with follow-ups scheduled
          </div>
        </Card>

        {/* Selected Day Agenda */}
        <Card className="border-slate-200 bg-white text-slate-700 md:col-span-2">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-base text-slate-900 font-semibold">
              Agenda for {selectedDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {selectedTasks.length} follow-ups scheduled for this day
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {selectedTasks.length === 0 ? (
              <div className="py-20 text-center text-xs text-slate-500 italic">
                No meetings or tasks scheduled for this day.
              </div>
            ) : (
              <div className="space-y-4">
                {selectedTasks.map(task => (
                  <div 
                    key={task.id}
                    onClick={() => router.push(`/leads/${task.leadId}`)}
                    className="flex flex-col gap-2 p-4 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800">{task.title}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        task.priority === 'High' ? 'bg-red-50 text-red-650 border border-red-100' :
                        task.priority === 'Medium' ? 'bg-amber-50 text-amber-650 border border-amber-100' :
                        'bg-slate-150 text-slate-600 border border-slate-200'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-xs text-slate-550 leading-relaxed">{task.description}</p>
                    <div className="flex items-center justify-between text-[10px] border-t border-slate-100 pt-2 mt-1">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <User className="h-3 w-3 text-slate-400" /> Rep: {task.assignee}
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-indigo-650 font-semibold">
                        View Lead Profile <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
