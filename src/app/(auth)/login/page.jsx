'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldAlert, KeyRound, Mail, Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
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
        throw new Error(result.error || 'Login failed. Please try again.');
      }

      // Store user details in localStorage for frontend client context
      localStorage.setItem('user', JSON.stringify(result.user));
      
      // Redirect to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-tr from-slate-50 via-indigo-50/40 to-sky-50 px-4">
      {/* Decorative ambient elements */}
      <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-indigo-500/5 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-blue-500/5 blur-3xl" />

      <Card className="relative w-full max-w-md border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-xl text-slate-800">
        <CardHeader className="space-y-2 text-center pb-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-550/10 text-indigo-600 border border-indigo-500/20">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Welcome Back</CardTitle>
          <CardDescription className="text-slate-500">
            Log in to manage leads and follow-ups.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-650">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Email Address</label>
              <div className="relative">
                <Mail className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                <Input
                  {...register('email')}
                  type="email"
                  placeholder="name@company.com"
                  className="pl-10 border-slate-200 bg-white text-slate-950 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              {errors.email && (
                <span className="text-xs text-red-550">{errors.email.message}</span>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Password</label>
              <div className="relative">
                <KeyRound className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                <Input
                  {...register('password')}
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 border-slate-200 bg-white text-slate-950 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              {errors.password && (
                <span className="text-xs text-red-550">{errors.password.message}</span>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
            <div className="text-center text-xs text-slate-400">
             
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
