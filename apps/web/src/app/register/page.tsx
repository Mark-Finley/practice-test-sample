'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, UserProfile } from '../../store/auth';
import { api } from '../../services/api';

export default function RegisterPage() {
  const router = useRouter();
  const loginStore = useAuthStore((state) => state.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // 1. Create candidate user
      await api.post('/auth/register', {
        email,
        password,
        firstName,
        lastName,
      });

      // 2. Perform automatic login for zero friction
      const loginResponse = await api.post<{ accessToken: string; user: UserProfile }>('/auth/login', {
        email,
        password,
      });

      loginStore(loginResponse.accessToken, loginResponse.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check the form data.');
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
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/30">
            <span className="text-xl font-bold text-white tracking-wider">A</span>
          </div>
        </div>
        <h2 className="mt-8 text-center text-3xl font-extrabold tracking-tight text-white sm:text-4xl bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
          Create Account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Sign up to prepare for professional certification exams
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 px-8 py-10 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-6 rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Registration Error:</span>
              </div>
              <p className="mt-1">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-semibold text-slate-200">
                  First Name
                </label>
                <div className="mt-2">
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="block w-full rounded-xl border-0 bg-slate-950/60 py-3 text-white shadow-sm ring-1 ring-inset ring-slate-800/80 placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-indigo-500/80 transition-all text-sm"
                    placeholder="John"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-semibold text-slate-200">
                  Last Name
                </label>
                <div className="mt-2">
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="block w-full rounded-xl border-0 bg-slate-950/60 py-3 text-white shadow-sm ring-1 ring-inset ring-slate-800/80 placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-indigo-500/80 transition-all text-sm"
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-200">
                Email Address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border-0 bg-slate-950/60 py-3 text-white shadow-sm ring-1 ring-inset ring-slate-800/80 placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-indigo-500/80 transition-all text-sm"
                  placeholder="name@organization.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-200">
                Password
              </label>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border-0 bg-slate-950/60 py-3 text-white shadow-sm ring-1 ring-inset ring-slate-800/80 placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-indigo-500/80 transition-all text-sm"
                  placeholder="At least 8 characters"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 py-3 text-sm font-semibold text-white shadow-lg hover:from-indigo-400 hover:to-violet-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50 transition-all duration-300 transform active:scale-[0.98]"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    Creating account...
                  </div>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
