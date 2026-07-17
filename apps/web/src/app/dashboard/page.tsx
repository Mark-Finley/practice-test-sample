'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { api } from '@/services/api';

interface CategoryWeight {
  categoryId: string;
  questionCount: number;
  category: {
    name: string;
  };
}

interface ExamTemplate {
  id: string;
  name: string;
  totalQuestions: number;
  duration: number;
  passingScore: number;
  bank: {
    name: string;
  };
  categoryWeights: CategoryWeight[];
}

interface ExamAttempt {
  id: string;
  score: number;
  isPassed: boolean;
  createdAt: string;
  session: {
    id: string;
    template: {
      name: string;
    };
  };
}

export default function CandidateDashboard() {
  const router = useRouter();
  const { isAuthenticated, user, logout, isLoading } = useAuthStore();
  const [templates, setTemplates] = useState<ExamTemplate[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [isFetchingTemplates, setIsFetchingTemplates] = useState(true);
  const [isFetchingAttempts, setIsFetchingAttempts] = useState(true);
  const [isStartingSession, setIsStartingSession] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (user && (user.role === 'SYSTEM_ADMIN' || user.role === 'ORG_ADMIN')) {
      router.push('/admin/dashboard');
    }
  }, [isAuthenticated, user, isLoading, router]);

  useEffect(() => {
    async function loadTemplates() {
      if (!isAuthenticated || (user && user.role !== 'CANDIDATE')) return;
      try {
        const data = await api.get<ExamTemplate[]>('/exams/templates');
        setTemplates(data);
      } catch (error) {
        console.error('Failed to load templates:', error);
      } finally {
        setIsFetchingTemplates(false);
      }
    }
    loadTemplates();
  }, [isAuthenticated, user]);

  useEffect(() => {
    async function loadAttempts() {
      if (!isAuthenticated || (user && user.role !== 'CANDIDATE')) return;
      try {
        const data = await api.get<ExamAttempt[]>('/reports/candidate/attempts');
        setAttempts(data);
      } catch (error) {
        console.error('Failed to load attempts history:', error);
      } finally {
        setIsFetchingAttempts(false);
      }
    }
    loadAttempts();
  }, [isAuthenticated, user]);

  const handleStartExam = async (templateId: string) => {
    setIsStartingSession(templateId);
    try {
      const session = await api.post<{ id: string }>('/exams/sessions', { templateId });
      router.push(`/exams/session/${session.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to initialize exam session.');
      setIsStartingSession(null);
    }
  };

  // Dynamic statistics calculations
  const totalAttemptsCount = attempts.length;
  const avgScore = totalAttemptsCount > 0 
    ? Math.round(attempts.reduce((sum, att) => sum + att.score, 0) / totalAttemptsCount) 
    : 0;
  const passingAttemptsCount = attempts.filter((att) => att.isPassed).length;

  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-500"></div>
      </div>
    );
  }

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
      <main className="relative z-10 flex-1 mx-auto max-w-7xl w-full px-6 py-10 space-y-12">
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl bg-gradient-to-r from-slate-50 to-slate-400 bg-clip-text text-transparent">
            Welcome back, {user.firstName}
          </h1>
          <p className="mt-2 text-slate-400 text-sm">
            Track your certification goals and run mock examinations with automated AI proctoring simulation
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Practice Exams Run</p>
            <h3 className="text-4xl font-extrabold text-white mt-2">{totalAttemptsCount}</h3>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Test Score</p>
            <h3 className="text-4xl font-extrabold text-white mt-2">{avgScore}%</h3>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Passing Attempts</p>
            <h3 className="text-4xl font-extrabold text-white mt-2">{passingAttemptsCount}</h3>
          </div>
        </div>

        {/* Practice Exams Catalog */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white tracking-wide">Available Certification Mock Exams</h2>

          {isFetchingTemplates ? (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-500"></div>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-slate-900/30 border border-slate-800/60">
              <p className="text-slate-500 text-sm">No certification mock exams are available yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex flex-col justify-between p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm hover:border-indigo-500/50 transition-all duration-300 group shadow-xl"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 font-semibold text-xs tracking-wider border border-indigo-500/25">
                        {template.bank?.name ? template.bank.name.split(' (')[1]?.replace(')', '') || 'EXAM' : 'EXAM'}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {template.name}
                    </h3>
                    <div className="flex gap-4 mt-4 text-xs text-slate-400">
                      <div>Questions: <span className="font-semibold text-slate-200">{template.totalQuestions}</span></div>
                      <div>Duration: <span className="font-semibold text-slate-200">{template.duration}m</span></div>
                      <div>Passing score: <span className="font-semibold text-slate-200">{template.passingScore}%</span></div>
                    </div>
                  </div>

                  <div className="mt-8 flex gap-3">
                    <button
                      onClick={() => handleStartExam(template.id)}
                      disabled={isStartingSession !== null}
                      className="flex-1 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors disabled:opacity-50"
                    >
                      Practice Mode
                    </button>
                    <button
                      onClick={() => handleStartExam(template.id)}
                      disabled={isStartingSession !== null}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-xs font-semibold text-white transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {isStartingSession === template.id ? (
                        <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent"></div>
                      ) : (
                        'Start Simulated Test'
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attempts History */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white tracking-wide">Your Practice Attempt History</h2>

          {isFetchingAttempts ? (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-500"></div>
            </div>
          ) : attempts.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-slate-900/30 border border-slate-800/60">
              <p className="text-slate-500 text-sm">You haven't run any mock exam sessions yet.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/30 backdrop-blur-sm shadow-xl">
              <table className="min-w-full divide-y divide-slate-800/80">
                <thead className="bg-slate-900/65">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Exam Title</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Submitted Date</th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-400">Score</th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-400">Result Status</th>
                    <th scope="col" className="relative px-6 py-4"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/20 text-slate-300">
                  {attempts.map((attempt) => (
                    <tr key={attempt.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-slate-100">{attempt.session.template.name}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-xs text-slate-400">{new Date(attempt.createdAt).toLocaleString()}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-bold font-mono">{attempt.score}%</td>
                      <td className="whitespace-nowrap px-6 py-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                          attempt.isPassed
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        }`}>
                          {attempt.isPassed ? 'Pass' : 'Fail'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-xs">
                        <Link
                          href={`/exams/session/${attempt.session.id}/result`}
                          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition-all shadow-sm"
                        >
                          Review Results
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
