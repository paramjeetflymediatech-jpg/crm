'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  Key, 
  User, 
  Copy, 
  Check, 
  Plus, 
  Settings,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { apiFetch as fetch } from '@/lib/clientApi';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // User States
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [userLoading, setUserLoading] = useState(false);

  // Company States
  const [company, setCompany] = useState({
    company_name: '',
    website: '',
    email: '',
    phone: '',
    api_key: '',
    subscription_plan: ''
  });
  const [companyLoading, setCompanyLoading] = useState(false);

  // Custom configuration states
  const [statuses, setStatuses] = useState([]);
  const [sources, setSources] = useState([]);
  const [newStatus, setNewStatus] = useState({ name: '', color: '#2563eb' });
  const [newSource, setNewSource] = useState('');

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const u = JSON.parse(storedUser);
          setCurrentUser(u);
          setUserProfile({
            name: u.name,
            email: u.email,
            phone: u.phone || '',
            password: ''
          });
        }

        // Fetch company settings if admin level
        const resCompany = await fetch('/api/settings/company');
        if (resCompany.ok) {
          const d = await resCompany.json();
          setCompany(d.company);
        }

        // Fetch configurations
        const [resStatuses, resSources] = await Promise.all([
          fetch('/api/leads/statuses'),
          fetch('/api/leads/sources')
        ]);

        if (resStatuses.ok) {
          const d = await resStatuses.json();
          setStatuses(d.statuses || []);
        }
        if (resSources.ok) {
          const d = await resSources.json();
          setSources(d.sources || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Copy API Key
  const handleCopyKey = () => {
    navigator.clipboard.writeText(company.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Regenerate API Key
  const handleRegenerateKey = async () => {
    if (!window.confirm('Regenerating will break existing WordPress integrations using the current key. Continue?')) return;
    try {
      const res = await fetch('/api/settings/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const d = await res.json();
        setCompany(prev => ({ ...prev, api_key: d.api_key }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Company settings
  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    setCompanyLoading(true);
    try {
      const res = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company)
      });
      if (res.ok) {
        alert('Company settings saved successfully.');
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCompanyLoading(false);
    }
  };

  // Save User settings
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setUserLoading(true);
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userProfile)
      });
      if (res.ok) {
        const d = await res.json();
        // Update local state
        const updatedUser = { ...currentUser, ...d.user };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
        setUserProfile(prev => ({ ...prev, password: '' }));
        alert('Profile saved successfully.');
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUserLoading(false);
    }
  };

  // Add custom Status
  const handleAddStatus = async (e) => {
    e.preventDefault();
    if (!newStatus.name) return;
    try {
      const res = await fetch('/api/leads/statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStatus)
      });
      if (res.ok) {
        const d = await res.json();
        setStatuses(prev => [...prev, d.status]);
        setNewStatus({ name: '', color: '#2563eb' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add custom Source
  const handleAddSource = async (e) => {
    e.preventDefault();
    if (!newSource) return;
    try {
      const res = await fetch('/api/leads/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_name: newSource })
      });
      if (res.ok) {
        const d = await res.json();
        setSources(prev => [...prev, d.source]);
        setNewSource('');
      }
    } catch (err) {
      console.error(err);
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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">CRM Configurations</h1>
        <p className="text-sm text-slate-500 mt-1">Manage profile, subscription keys, and pipelines.</p>
      </div>

      <Tabs defaultValue={currentUser?.role === 'staff' ? 'profile' : 'company'} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-96 border border-slate-200 bg-slate-100 text-slate-500 rounded-lg h-10 p-0.5 mb-6">
          {currentUser?.role !== 'staff' && (
            <TabsTrigger value="company" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
              <Building2 className="h-4 w-4 mr-1.5" /> Company Profile
            </TabsTrigger>
          )}
          {currentUser?.role !== 'staff' && (
            <TabsTrigger value="integration" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
              <Key className="h-4 w-4 mr-1.5" /> WP Integration
            </TabsTrigger>
          )}
          <TabsTrigger value="profile" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
            <User className="h-4 w-4 mr-1.5" /> My Profile
          </TabsTrigger>
        </TabsList>

        {/* 1. Company Tab */}
        {currentUser?.role !== 'staff' && (
          <TabsContent value="company" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-slate-200 bg-white text-slate-700">
                <CardHeader>
                  <CardTitle className="text-base text-slate-900">Branding & details</CardTitle>
                  <CardDescription className="text-xs text-slate-500">Edit company metadata and workspace info</CardDescription>
                </CardHeader>
                <form onSubmit={handleCompanySubmit}>
                  <CardContent className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Company Name</label>
                      <Input
                        required
                        value={company.company_name}
                        onChange={(e) => setCompany({ ...company, company_name: e.target.value })}
                        className="border-slate-200 bg-slate-50 text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Website Address</label>
                      <Input
                        value={company.website || ''}
                        onChange={(e) => setCompany({ ...company, website: e.target.value })}
                        className="border-slate-200 bg-slate-50 text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Notification Email</label>
                      <Input
                        type="email"
                        value={company.email || ''}
                        onChange={(e) => setCompany({ ...company, email: e.target.value })}
                        className="border-slate-200 bg-slate-50 text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Office Phone</label>
                      <Input
                        value={company.phone || ''}
                        onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                        className="border-slate-200 bg-slate-50 text-slate-900"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-slate-100 pt-4">
                    <Button type="submit" disabled={companyLoading} className="bg-indigo-650 hover:bg-indigo-500 text-white">
                      {companyLoading ? 'Saving...' : 'Save Settings'}
                    </Button>
                  </CardFooter>
                </form>
              </Card>

              {/* Configure Lead Statuses and Sources */}
              <div className="space-y-6">
                {/* Pipeline customizer */}
                <Card className="border-slate-200 bg-white text-slate-700">
                  <CardHeader>
                    <CardTitle className="text-base text-slate-900">Customize Pipeline Stages</CardTitle>
                    <CardDescription className="text-xs text-slate-500">Add custom stages to track leads</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Stage Name (e.g. In Review)" 
                        value={newStatus.name}
                        onChange={(e) => setNewStatus({ ...newStatus, name: e.target.value })}
                        className="border-slate-200 bg-slate-50 text-slate-900"
                      />
                      <input 
                        type="color" 
                        value={newStatus.color} 
                        onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
                        className="h-9 w-12 rounded border border-slate-200 bg-white cursor-pointer"
                      />
                      <Button onClick={handleAddStatus} className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      {statuses.map(s => (
                        <span 
                          key={s.id} 
                          className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200"
                        >
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Sources customizer */}
                <Card className="border-slate-200 bg-white text-slate-700">
                  <CardHeader>
                    <CardTitle className="text-base text-slate-900">Acquisition Sources</CardTitle>
                    <CardDescription className="text-xs text-slate-500">Track channels where leads enter</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Source Name (e.g. Email Campaign)" 
                        value={newSource}
                        onChange={(e) => setNewSource(e.target.value)}
                        className="border-slate-200 bg-slate-50 text-slate-900"
                      />
                      <Button onClick={handleAddSource} className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      {sources.map(s => (
                        <span 
                          key={s.id} 
                          className="inline-flex items-center rounded px-2.5 py-1 text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200"
                        >
                          {s.source_name}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        )}

        {/* 2. WordPress Sync */}
        {currentUser?.role !== 'staff' && (
          <TabsContent value="integration">
            <Card className="border-slate-200 bg-white text-slate-700 max-w-3xl">
              <CardHeader>
                <CardTitle className="text-base text-slate-900">WordPress Integration API Credentials</CardTitle>
                <CardDescription className="text-xs text-slate-500">Use these details inside your plugins to sync contact forms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Api key display card */}
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bearer Security Token</span>
                  <div className="flex items-center justify-between gap-3 mt-1 bg-white rounded border border-slate-200 p-2.5">
                    <span className="font-mono text-xs text-slate-800 select-all truncate flex-1">
                      {company.api_key}
                    </span>
                    <div className="flex gap-1.5 shrink-0">
                      <Button size="icon" variant="ghost" onClick={handleCopyKey} className="h-8 w-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100">
                        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={handleRegenerateKey} className="h-8 w-8 text-slate-500 hover:text-red-650 hover:bg-slate-100">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Sync API Target</h4>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-655">
                    <p className="font-bold text-slate-500">Endpoint URL:</p>
                    <p className="font-mono text-indigo-650 mt-1 select-all">
                      {typeof window !== 'undefined' ? `${window.location.origin}/api/leads/create` : 'https://yourcrm.com/api/leads/create'}
                    </p>
                    <p className="font-bold text-slate-500 mt-3">Method Type:</p>
                    <p className="font-mono text-slate-600 mt-0.5">POST</p>
                    <p className="font-bold text-slate-500 mt-3">Auth Header:</p>
                    <p className="font-mono text-slate-600 mt-0.5">Authorization: Bearer <span className="text-indigo-650">{`YOUR_API_KEY`}</span></p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 leading-relaxed bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                  <p className="font-semibold text-slate-900">💡 Pro Tip:</p>
                  <p>You can check the API documentation at the bottom of the portal instructions to copy sample PHP code snippets for **Contact Form 7**, **Elementor Forms**, **WPForms**, and **Gravity Forms** to paste into WordPress theme functions.php files.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* 3. My Profile Tab */}
        <TabsContent value="profile">
          <Card className="border-slate-200 bg-white text-slate-700 max-w-lg">
            <CardHeader>
              <CardTitle className="text-base text-slate-900">My Profile Credentials</CardTitle>
              <CardDescription className="text-xs text-slate-500">Edit your user metadata and login passwords</CardDescription>
            </CardHeader>
            <form onSubmit={handleUserSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Full Name</label>
                  <Input
                    required
                    value={userProfile.name}
                    onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                    className="border-slate-200 bg-slate-50 text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Email Login</label>
                  <Input
                    required
                    type="email"
                    value={userProfile.email}
                    onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                    className="border-slate-200 bg-slate-50 text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Contact Phone</label>
                  <Input
                    value={userProfile.phone}
                    onChange={(e) => setUserProfile({ ...userProfile, phone: e.target.value })}
                    className="border-slate-200 bg-slate-50 text-slate-900"
                  />
                </div>
                <hr className="border-slate-100 my-2" />
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Change Password (Optional)</label>
                  <Input
                    type="password"
                    placeholder="Leave empty to keep existing"
                    value={userProfile.password}
                    onChange={(e) => setUserProfile({ ...userProfile, password: e.target.value })}
                    className="border-slate-200 bg-slate-50 text-slate-900"
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t border-slate-100 pt-4">
                <Button type="submit" disabled={userLoading} className="bg-indigo-650 hover:bg-indigo-500 text-white">
                  {userLoading ? 'Saving...' : 'Update Profile'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
