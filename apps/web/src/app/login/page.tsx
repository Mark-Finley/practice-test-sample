'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, UserProfile } from '../../store/auth';
import { api } from '../../services/api';

export default function LoginPage() {
  const router = useRouter();
  const loginStore = useAuthStore((state) => state.login);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await api.post<{ accessToken: string; user: UserProfile }>('/auth/login', {
        email,
        password,
      });
      
      loginStore(response.accessToken, response.user);
      
      // Route based on role
      if (response.user.role === 'SYSTEM_ADMIN' || response.user.role === 'ORG_ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to authenticate. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8 bg-slate-950 overflow-hidden font-sans">
      {/* Decorative background glow circles */}
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[120px]" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          {/* Logo symbol */}
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/30">
            <span className="text-xl font-bold text-white tracking-wider">A</span>
          </div>
        </div>
        <h2 className="mt-8 text-center text-3xl font-extrabold tracking-tight text-white sm:text-4xl bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
          Sign In
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Prepare for professional certifications with absolute fidelity
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Glassmorphic Card Container */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 px-8 py-10 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-6 rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Authentication Error:</span>
              </div>
              <p className="mt-1">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-200">
                Email Address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border-0 bg-slate-950/60 py-3 text-white shadow-sm ring-1 ring-inset ring-slate-800/80 placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-indigo-500/80 transition-all text-sm"
                  placeholder="name@organization.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-semibold text-slate-200">
                  Password
                </label>
              </div>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border-0 bg-slate-950/60 py-3 text-white shadow-sm ring-1 ring-inset ring-slate-800/80 placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-indigo-500/80 transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 py-3 text-sm font-semibold text-white shadow-lg hover:from-indigo-400 hover:to-violet-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50 transition-all duration-300 transform active:scale-[0.98]"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            Not registered?{' '}
            <Link
              href="/register"
              className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Create Candidate Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
