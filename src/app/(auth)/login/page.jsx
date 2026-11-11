'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Layers,
  Users,
  Calendar,
  BarChart3,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Invalid credentials');
      }

      localStorage.setItem('user', JSON.stringify(result.user));
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-950">
      {/* ========================================================= */}
      {/* LEFT SIDE: Platform Overview & Meaningful Grid Background  */}
      {/* ========================================================= */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-slate-800 bg-slate-950 p-12 text-white lg:flex xl:p-16">
        {/* Meaningful Data Mesh / Grid Background */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:28px_28px] opacity-70" />
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-600/30">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white tracking-tight">Flymedia Technology</span>
              <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-300 ring-1 ring-indigo-400/30">
                Enterprise
              </span>
            </div>
            <p className="text-xs text-slate-400">Workspace Management Platform</p>
          </div>
        </div>

        {/* Platform Modules (Clean, informative, no fluff) */}
        <div className="relative z-10 my-auto max-w-md space-y-6 py-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white xl:text-3xl">
              Multi-Tenant Sales & Follow-Up OS
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Manage leads, schedule customer follow-ups, and track team performance with isolated tenant workspaces.
            </p>
          </div>

          {/* Actual Core Modules */}
          <div className="space-y-3">
            <div className="flex items-start gap-3.5 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 backdrop-blur-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Lead Management</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Lifecycle tracking, status progression, and automated ownership assignment.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 backdrop-blur-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Follow-up Calendar</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Scheduled call/meeting reminders and activity logging across deals.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 backdrop-blur-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Pipeline Analytics</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time conversion metrics, deal volume trends, and team productivity reports.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Security Meta */}
        <div className="relative z-10 flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-indigo-400 shrink-0" />
          <span>Tenant-isolated database partition & 256-bit SSL encryption</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT SIDE: Clean, Focused Authentication Form            */}
      {/* ========================================================= */}
      <div className="flex w-full flex-col justify-center bg-slate-50 px-6 py-12 lg:w-1/2 lg:px-16 dark:bg-slate-950">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile-only brand */}
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <Layers className="h-5 w-5" />
            </div>
            <span className="font-semibold text-slate-900 dark:text-white">Flymedia Technology</span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Sign in
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Enter your work email and password to access your workspace.
            </p>
          </div>

          {/* Form */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    placeholder="name@company.com"
                    className="h-10 pl-9 rounded-lg border-slate-200 bg-white text-sm placeholder:text-slate-400 focus-visible:border-indigo-600 focus-visible:ring-indigo-600/20 dark:border-slate-800 dark:bg-slate-950 dark:placeholder:text-slate-500"
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline dark:text-indigo-400"
                  >
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="h-10 pl-9 pr-9 rounded-lg border-slate-200 bg-white text-sm placeholder:text-slate-400 focus-visible:border-indigo-600 focus-visible:ring-indigo-600/20 dark:border-slate-800 dark:bg-slate-950 dark:placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
