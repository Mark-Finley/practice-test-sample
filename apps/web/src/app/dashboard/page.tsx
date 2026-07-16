'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';

export default function CandidateDashboard() {
  const router = useRouter();
  const { isAuthenticated, user, logout, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (user && (user.role === 'SYSTEM_ADMIN' || user.role === 'ORG_ADMIN')) {
      router.push('/admin/dashboard');
    }
  }, [isAuthenticated, user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-500"></div>
      </div>
    );
  }

  const mockExams = [
    { id: '1', name: 'AWS Certified Solutions Architect - Associate', code: 'SAA-C03', questions: 65, duration: 130 },
    { id: '2', name: 'CompTIA Security+ Certification', code: 'SY0-701', questions: 90, duration: 90 },
    { id: '3', name: 'Google Cloud Associate Cloud Engineer', code: 'ACE', questions: 50, duration: 120 },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-[-10%] left-[-15%] h-[600px] w-[600px] rounded-full bg-indigo-500/5 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-15%] h-[600px] w-[600px] rounded-full bg-violet-500/5 blur-[120px]" />

      {/* Navbar */}
      <nav className="relative z-10 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 shadow-md">
              <span className="text-sm font-bold text-white">A</span>
            </div>
            <span className="font-semibold tracking-wide text-white">Candidate Workspace</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/profile"
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors text-sm"
            >
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`http://localhost:3001${user.avatarUrl}`}
                  alt="Avatar"
                  className="h-6 w-6 rounded-full object-cover border border-slate-700"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                  {user.firstName[0]}{user.lastName[0]}
                </div>
              )}
              <span className="font-medium text-slate-300">{user.firstName} {user.lastName}</span>
            </Link>
            <button
              onClick={logout}
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex-1 mx-auto max-w-7xl w-full px-6 py-10">
        {/* Welcome Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl bg-gradient-to-r from-slate-50 to-slate-400 bg-clip-text text-transparent">
            Welcome back, {user.firstName}
          </h1>
          <p className="mt-2 text-slate-400 text-sm">
            Track your certification goals and run mock examinations with automated AI proctoring simulation
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Practice Exams Run</p>
            <h3 className="text-4xl font-extrabold text-white mt-2">0</h3>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Test Score</p>
            <h3 className="text-4xl font-extrabold text-white mt-2">0%</h3>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Passing Attempts</p>
            <h3 className="text-4xl font-extrabold text-white mt-2">0</h3>
          </div>
        </div>

        {/* Practice Exams Catalog */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Available Certification Mock Exams</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {mockExams.map((exam) => (
              <div
                key={exam.id}
                className="flex flex-col justify-between p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm hover:border-indigo-500/50 transition-all duration-300 group shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 font-semibold text-xs tracking-wider border border-indigo-500/25">
                      {exam.code}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                    {exam.name}
                  </h3>
                  <div className="flex gap-4 mt-4 text-xs text-slate-400">
                    <div>Questions: <span className="font-semibold text-slate-200">{exam.questions}</span></div>
                    <div>Duration: <span className="font-semibold text-slate-200">{exam.duration}m</span></div>
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    className="flex-1 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    Practice Mode
                  </button>
                  <button
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-xs font-semibold text-white transition-all shadow-md active:scale-[0.98]"
                  >
                    Start Simulated Test
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
