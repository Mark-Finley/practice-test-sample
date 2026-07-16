'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../store/auth';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'SYSTEM_ADMIN' || user.role === 'ORG_ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, user, router]);

  return (
    <div className="relative flex min-h-screen flex-col justify-center bg-slate-950 overflow-hidden font-sans text-slate-100">
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[130px]" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-violet-500/10 blur-[130px]" />

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-20 text-center lg:px-8">
        {/* Banner badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-xs font-semibold text-indigo-400 mb-8 animate-fadeIn">
          <span>🚀 Premium Mock Testing Environment</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl bg-gradient-to-r from-slate-50 via-slate-100 to-slate-400 bg-clip-text text-transparent">
          Digital Assessment Platform
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
          Prepare for professional certifications like AWS, Google Cloud, CompTIA, and Microsoft through realistic, timed mock exams under simulated exam integrity conditions.
        </p>

        {/* Dynamic Navigation Options */}
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/login"
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg hover:from-indigo-400 hover:to-violet-400 transition-all duration-300 transform hover:scale-[1.02]"
          >
            Sign In to Platform
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold leading-6 text-slate-300 hover:text-white transition-colors"
          >
            Create Candidate Account <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="mx-auto mt-20 max-w-3xl sm:mt-24">
          <dl className="grid max-w-none grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-3">
            <div className="flex flex-col items-center p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm">
              <dt className="text-sm font-semibold leading-7 text-slate-200">
                🎯 Realistic Simulator
              </dt>
              <dd className="mt-2 text-sm text-slate-400 leading-6">
                Fidelity UI matching exact vendor testing environments.
              </dd>
            </div>
            <div className="flex flex-col items-center p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm">
              <dt className="text-sm font-semibold leading-7 text-slate-200">
                ⏱️ Precision Timers
              </dt>
              <dd className="mt-2 text-sm text-slate-400 leading-6">
                Server-synchronized anti-tampering mock timers.
              </dd>
            </div>
            <div className="flex flex-col items-center p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm">
              <dt className="text-sm font-semibold leading-7 text-slate-200">
                🛡️ AI Proctoring Logs
              </dt>
              <dd className="mt-2 text-sm text-slate-400 leading-6">
                Integrity logs checking focus switches and window exits.
              </dd>
            </div>
          </dl>
        </div>
      </main>
    </div>
  );
}
