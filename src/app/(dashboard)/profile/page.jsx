'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Building2, 
  Camera, 
  Upload, 
  Trash2, 
  Lock, 
  CheckCircle2, 
  Save, 
  Key, 
  Eye, 
  EyeOff, 
  Loader2,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch as fetch } from '@/lib/clientApi';
import { showSuccess, showError, showConfirm, Toast } from '@/lib/sweetalert';

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [successBanner, setSuccessBanner] = useState('');

  // Fetch initial profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          const u = JSON.parse(stored);
          setCurrentUser(u);
          setProfile({
            name: u.name || '',
            email: u.email || '',
            phone: u.phone || '',
            avatar: u.avatar || ''
          });
        }

        const res = await fetch('/api/settings/profile');
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            const u = data.user;
            setProfile({
              name: u.name || '',
              email: u.email || '',
              phone: u.phone || '',
              avatar: u.avatar || ''
            });
            setCurrentUser(prev => {
              const merged = { ...prev, ...u };
              localStorage.setItem('user', JSON.stringify(merged));
              return merged;
            });
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  // Handle avatar upload with automatic persistence
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showError('File Too Large', 'Please select an image smaller than 5MB.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload image.');

      const newAvatarUrl = uploadData.url;
      setProfile(prev => ({ ...prev, avatar: newAvatarUrl }));

      // Automatically persist avatar change immediately to database
      const saveRes = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          avatar: newAvatarUrl
        })
      });

      if (saveRes.ok) {
        const savedData = await saveRes.json();
        const updatedUser = { ...currentUser, ...savedData.user, avatar: newAvatarUrl };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
        window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: updatedUser }));
        Toast.fire({ icon: 'success', title: 'Profile image updated!' });
      }
    } catch (err) {
      console.error(err);
      showError('Upload Error', err.message || 'Failed to update avatar image.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Remove avatar
  const handleRemoveAvatar = async () => {
    const confirmed = await showConfirm({
      title: 'Remove Profile Picture?',
      text: 'Your avatar will be reset to the default letter icon.',
      confirmButtonText: 'Yes, remove',
      isDanger: false
    });
    if (!confirmed) return;

    setProfile(p => ({ ...p, avatar: '' }));
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          avatar: ''
        })
      });

      if (res.ok) {
        const data = await res.json();
        const updatedUser = { ...currentUser, ...data.user, avatar: null };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
        window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: updatedUser }));
        Toast.fire({ icon: 'success', title: 'Profile image removed' });
      }
    } catch (err) {
      console.error(err);
      showError('Error', 'Failed to remove avatar.');
    }
  };

  // Save profile information
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile.name || !profile.email) {
      showError('Missing Fields', 'Name and email are required.');
      return;
    }

    setSavingProfile(true);
    setSuccessBanner('');
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          avatar: profile.avatar
        })
      });

      const data = await res.json();
      if (res.ok) {
        const updatedUser = { ...currentUser, ...data.user };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
        setProfile(prev => ({
          ...prev,
          name: data.user?.name || prev.name,
          email: data.user?.email || prev.email,
          phone: data.user?.phone || prev.phone,
          avatar: data.user?.avatar || prev.avatar
        }));
        window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: updatedUser }));
        setSuccessBanner('Profile details updated successfully!');
        showSuccess('Profile Saved', 'Your personal details have been updated successfully.');
      } else {
        showError('Update Failed', data.error || 'Failed to update profile.');
      }
    } catch (err) {
      console.error(err);
      showError('Error', 'An unexpected error occurred while saving profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Change password
  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.newPassword) {
      showError('Password Required', 'Please enter a new password.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showError('Password Too Short', 'Password must be at least 6 characters long.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError('Password Mismatch', 'The new passwords do not match. Please re-check.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          avatar: profile.avatar,
          password: passwordForm.newPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPasswordForm({ newPassword: '', confirmPassword: '' });
        showSuccess('Password Updated', 'Your account password has been changed securely.');
      } else {
        showError('Update Failed', data.error || 'Failed to change password.');
      }
    } catch (err) {
      console.error(err);
      showError('Error', 'An error occurred while changing password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
            <Shield className="h-3 w-3" /> Super Admin
          </span>
        );
      case 'company_admin':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
            <Shield className="h-3 w-3" /> Company Admin
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <User className="h-3 w-3" /> Staff Representative
          </span>
        );
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
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account credentials, contact info, and security settings.</p>
      </div>

      {/* Success Notification Alert */}
      {successBanner && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span className="font-medium">{successBanner}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-200 bg-white text-slate-700 shadow-xs">
            <CardContent className="pt-6 text-center space-y-4">
              {/* Avatar Preview with Camera Overlay */}
              <div className="relative mx-auto w-24 h-24 group">
                <div className="w-24 h-24 rounded-full border-2 border-slate-200 bg-white shadow-xs overflow-hidden flex items-center justify-center">
                  {profile.avatar || currentUser?.companyLogo || currentUser?.avatar ? (
                    <img
                      src={profile.avatar || currentUser?.companyLogo || currentUser?.avatar}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-indigo-600 uppercase">
                      {profile.name ? profile.name[0] : 'U'}
                    </span>
                  )}
                </div>

                {/* Upload hover trigger */}
                <button
                  type="button"
                  onClick={() => document.getElementById('profile-avatar-input')?.click()}
                  className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                  title="Change Profile Picture"
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </button>
              </div>

              {/* Upload Input */}
              <input
                type="file"
                id="profile-avatar-input"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                onChange={handleAvatarChange}
                className="hidden"
              />

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  {profile.name || 'User Profile'}
                </h3>
                <p className="text-xs text-slate-500">{profile.email}</p>
                <div className="pt-2 flex justify-center">
                  {getRoleBadge(currentUser?.role)}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingAvatar}
                  onClick={() => document.getElementById('profile-avatar-input')?.click()}
                  className="text-xs h-8 bg-white border-slate-200 cursor-pointer"
                >
                  {uploadingAvatar ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin text-indigo-600" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      Upload Photo
                    </>
                  )}
                </Button>

                {profile.avatar && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                JPG, PNG, WebP or SVG up to 5MB. Shows in header and sidebar.
              </p>
            </CardContent>

            {/* Quick Metadata Box */}
            <div className="border-t border-slate-100 p-4 bg-slate-50/60 rounded-b-xl space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" /> Company / Tenant
                </span>
                <span className="font-semibold text-slate-800">
                  {currentUser?.companyName || 'System Platform'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Account Status
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Edit Profile & Change Password Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Personal Details Form */}
          <Card className="border-slate-200 bg-white text-slate-700 shadow-xs">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-600" /> Personal Details
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Update your display name and login contact details
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSaveProfile}>
              <CardContent className="space-y-4 pt-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Full Name</label>
                  <Input
                    required
                    value={profile.name}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. John Doe"
                    className="border-slate-200 bg-white text-slate-900 text-sm h-9"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Email Address (Login)</label>
                    <Input
                      required
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="user@example.com"
                      className="border-slate-200 bg-white text-slate-900 text-sm h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Contact Phone</label>
                    <Input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 000-0000"
                      className="border-slate-200 bg-white text-slate-900 text-sm h-9"
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="border-t border-slate-100 pt-4 flex items-center justify-between">
                <span className="text-xs text-slate-400">All updates sync across devices</span>
                <Button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm h-9 px-4 cursor-pointer"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      Save Profile
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* 2. Security & Password Update Form */}
          <Card className="border-slate-200 bg-white text-slate-700 shadow-xs">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                <Lock className="h-4 w-4 text-indigo-600" /> Security & Password
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Change your authentication password to keep your account secure
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSavePassword}>
              <CardContent className="space-y-4 pt-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">New Password</label>
                    <div className="relative">
                      <Input
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="At least 6 characters"
                        className="border-slate-200 bg-white text-slate-900 text-sm h-9 pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Confirm New Password</label>
                    <Input
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Repeat new password"
                      className="border-slate-200 bg-white text-slate-900 text-sm h-9"
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="border-t border-slate-100 pt-4 flex items-center justify-between">
                <span className="text-xs text-slate-400">Must be minimum 6 characters</span>
                <Button
                  type="submit"
                  disabled={savingPassword}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-sm h-9 px-4 cursor-pointer"
                >
                  {savingPassword ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Key className="h-3.5 w-3.5 mr-1.5" />
                      Update Password
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
