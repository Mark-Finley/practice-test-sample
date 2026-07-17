'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/services/api';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface ProctorLog {
  id: string;
  eventType: string;
  severity: string;
  timestamp: string;
  details?: any;
}

interface ExamSession {
  id: string;
  status: string;
  createdAt: string;
  startedAt: string;
  endedAt: string | null;
  candidate: {
    firstName: string;
    lastName: string;
    email: string;
  };
  template: {
    name: string;
  };
  attempt?: {
    score: number;
    isPassed: boolean;
  } | null;
}

interface ProctorData {
  session: ExamSession;
  logs: ProctorLog[];
}

export default function ProctorAuditPage({ params }: PageProps) {
  const { id: sessionId } = use(params);
  const [data, setData] = useState<ProctorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLogs() {
      try {
        const response = await api.get<ProctorData>(`/exams/sessions/${sessionId}/proctor/logs`);
        setData(response);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load proctoring logs.');
      } finally {
        setIsLoading(false);
      }
    }
    loadLogs();
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-500"></div>
          <p className="text-sm font-medium text-slate-400">Loading audit timelines...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 text-slate-100 gap-4">
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-center max-w-md">
          <h3 className="text-lg font-bold text-rose-400 mb-2">Audit Load Failed</h3>
          <p className="text-xs text-rose-300/80 leading-relaxed mb-6">{error || 'Telemetry logs could not be recovered.'}</p>
          <Link href="/admin/dashboard" className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors text-xs font-semibold text-white">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { session, logs } = data;

  // Compute Proctoring Trust Score
  // Base 100%, deduct 25% for every shift warning log. Min 0%
  const blurCount = logs.filter((l) => l.eventType === 'TAB_SWITCH').length;
  const trustScore = Math.max(0, 100 - blurCount * 25);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-[-10%] left-[-15%] h-[600px] w-[600px] rounded-full bg-indigo-500/5 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-15%] h-[600px] w-[600px] rounded-full bg-violet-500/5 blur-[120px]" />

      {/* Navbar */}
      <nav className="relative z-10 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 shadow-md">
              <span className="text-sm font-bold text-white">A</span>
            </Link>
            <span className="font-semibold tracking-wide text-white">Proctor Audit Timeline</span>
          </div>

          <Link href="/admin/dashboard" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </nav>

      <main className="relative z-10 flex-1 mx-auto max-w-4xl w-full px-6 py-10 space-y-10">
        {/* Candidate Summary Panel */}
        <div className="p-8 rounded-3xl bg-slate-900/55 border border-slate-800/80 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-4 text-center md:text-left">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 text-[10px] font-semibold uppercase tracking-wider mb-2">
                Exam Session Audit
              </span>
              <h2 className="text-2xl font-bold text-white leading-tight">
                {session.candidate.firstName} {session.candidate.lastName}
              </h2>
              <p className="text-xs text-slate-500 mt-1">{session.candidate.email}</p>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-400">
              <div>Exam blueprint: <span className="font-semibold text-slate-200">{session.template.name}</span></div>
              <div>Status: <span className="font-semibold text-slate-200 uppercase">{session.status}</span></div>
              <div>Started: <span className="font-semibold text-slate-200">{new Date(session.startedAt).toLocaleString()}</span></div>
              <div>Submitted: <span className="font-semibold text-slate-200">{session.endedAt ? new Date(session.endedAt).toLocaleString() : 'N/A'}</span></div>
            </div>
          </div>

          {/* Glowing Trust Score Panel */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-950/60 border border-slate-800/60 w-44">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Trust Score</span>
            <span className={`text-4xl font-extrabold font-mono tracking-tight ${
              trustScore > 75 ? 'text-emerald-400' :
              trustScore >= 50 ? 'text-amber-400' : 'text-rose-500'
            }`}>
              {trustScore}%
            </span>
            <span className={`text-[9px] font-bold uppercase tracking-wider mt-2.5 px-2 py-0.5 rounded ${
              trustScore > 75 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              trustScore >= 50 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {trustScore > 75 ? 'INTEGRAL' : trustScore >= 50 ? 'SUSPICIOUS' : 'FLAGGED'}
            </span>
          </div>
        </div>

        {/* Audit Logs Chronological Timeline */}
        <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-md space-y-8 shadow-xl">
          <div className="flex justify-between items-center border-b border-slate-800/60 pb-5">
            <h3 className="text-lg font-bold text-white tracking-wide">Focus Anomalies Logs</h3>
            <span className="text-xs text-slate-400">Total flags: <span className="font-bold text-rose-400">{logs.length}</span></span>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-16">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4 text-xl border border-emerald-500/20">
                ✓
              </div>
              <p className="text-slate-300 text-sm font-semibold">Zero focus shift events detected!</p>
              <p className="text-slate-500 text-xs mt-1">The candidate maintained strict exam focus lockdown.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-800 ml-4 pl-8 space-y-8">
              {logs.map((log) => {
                const eventDate = new Date(log.timestamp);
                const isHigh = log.severity === 'HIGH';

                return (
                  <div key={log.id} className="relative group">
                    {/* SVG timeline marker dot */}
                    <span className={`absolute left-[-39px] top-1.5 h-4 w-4 rounded-full border-2 border-slate-950 flex items-center justify-center transition-transform group-hover:scale-110 ${
                      isHigh ? 'bg-rose-500 border-rose-500/30' : 'bg-amber-500 border-amber-500/30'
                    }`}>
                      <span className="h-1 w-1 rounded-full bg-white" />
                    </span>

                    {/* Timeline card layer */}
                    <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm shadow-md hover:border-slate-700 transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-200 text-sm">
                            {log.eventType === 'TAB_SWITCH' ? '💻 Windows Focus Blur (Tab switched/Lost focus)' : log.eventType}
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            isHigh ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          }`}>
                            {log.severity}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono font-semibold">
                          {eventDate.toLocaleTimeString()} ({eventDate.toLocaleDateString()})
                        </span>
                      </div>

                      {/* Details specs */}
                      {log.details && (
                        <div className="mt-3 p-3 rounded-lg bg-slate-950/60 border border-slate-900 font-mono text-[10px] text-slate-400 space-y-1">
                          {Object.entries(log.details).map(([key, val]) => (
                            <div key={key}>
                              <span className="text-slate-600 font-bold">{key}:</span> {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
