'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Layers,
  KeyRound,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  XCircle,
  ArrowLeft
} from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(token ? '' : 'Invalid reset link. Please request a new password reset.');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password.');
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-950 font-sans">
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

        {/* Security Highlights */}
        <div className="relative z-10 my-auto max-w-md space-y-6 py-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white xl:text-3xl">
              Secure Credential Configuration
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Update your workspace password with bcrypt hash encryption and automatic session invalidation.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3.5 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 backdrop-blur-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Cryptographic Hashing</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Passwords are salted and stored using multi-round bcrypt protection.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 backdrop-blur-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Session Invalidation</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  All active legacy sessions are revoked upon successful credential reset.
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
      {/* RIGHT SIDE: Reset Form Card                               */}
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
              Set new password
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Choose a strong password to secure your workspace account.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {success ? (
              <div className="space-y-4 text-center py-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Password Updated
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Your password has been changed successfully. Redirecting you to sign in...
                  </p>
                </div>
                <div className="pt-2">
                  <Link href="/login" className="block w-full">
                    <Button className="w-full h-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm">
                      Go to Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            ) : !token ? (
              <div className="space-y-4 text-center py-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100 dark:bg-red-950/40 dark:border-red-800 dark:text-red-400">
                  <XCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Invalid Reset Link
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    This password reset link is invalid or has expired.
                  </p>
                </div>
                <div className="pt-2">
                  <Link href="/forgot-password" className="block w-full">
                    <Button variant="outline" className="w-full h-10 rounded-lg border-slate-200 dark:border-slate-800">
                      Request New Link
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="h-10 pl-9 pr-9 rounded-lg border-slate-200 bg-white text-sm placeholder:text-slate-400 focus-visible:border-indigo-600 focus-visible:ring-indigo-600/20 dark:border-slate-800 dark:bg-slate-950 dark:placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="h-10 pl-9 pr-9 rounded-lg border-slate-200 bg-white text-sm placeholder:text-slate-400 focus-visible:border-indigo-600 focus-visible:ring-indigo-600/20 dark:border-slate-800 dark:bg-slate-950 dark:placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      tabIndex={-1}
                      aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password && confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-600 dark:text-red-400">Passwords do not match.</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading || (password && confirmPassword && password !== confirmPassword)}
                  className="w-full h-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>

                <div className="text-center pt-1">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Sign In</span>
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
