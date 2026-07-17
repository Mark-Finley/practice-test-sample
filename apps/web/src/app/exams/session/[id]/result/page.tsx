'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/services/api';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  text: string;
  explanation: string | null;
  difficulty: string;
  type: string;
  options: QuestionOption[];
}

interface Answer {
  id: string;
  questionId: string;
  optionIds: string[];
  isFlagged: boolean;
  timeSpentSeconds: number;
  question: Question;
}

interface CategoryStats {
  categoryId: string;
  categoryName: string;
  total: number;
  correct: number;
  percentage: number;
}

interface ExamAttempt {
  id: string;
  score: number;
  isPassed: boolean;
  createdAt: string;
  reportJson: {
    totalQuestions: number;
    correctAnswers: number;
    scorePercentage: number;
    categories: CategoryStats[];
  };
}

interface ExamSession {
  id: string;
  status: string;
  template: {
    name: string;
    passingScore: number;
  };
  attempt: ExamAttempt | null;
  answers: Answer[];
}

export default function ExamResultPage({ params }: PageProps) {
  const { id: sessionId } = use(params);
  const [session, setSession] = useState<ExamSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadCertificate = async () => {
    if (!session || !session.attempt) return;
    setIsDownloading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      const token = localStorage.getItem('token') || '';
      const response = await fetch(`${baseUrl}/reports/attempts/${session.attempt.id}/certificate`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to download certificate.');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate_${session.attempt.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      alert(err.message || 'Failed to download certificate.');
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    async function loadResult() {
      try {
        const data = await api.get<ExamSession>(`/exams/sessions/${sessionId}`);
        if (data.status !== 'COMPLETED' || !data.attempt) {
          setError('Exam results are not available. The session may not be completed yet.');
        } else {
          setSession(data);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load exam results.');
      } finally {
        setIsLoading(false);
      }
    }
    loadResult();
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-500"></div>
          <p className="text-sm font-medium text-slate-400">Loading diagnostic scorecard...</p>
        </div>
      </div>
    );
  }

  if (error || !session || !session.attempt) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 text-slate-100 gap-4">
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-center max-w-md">
          <h3 className="text-lg font-bold text-rose-400 mb-2">Unavailable Result</h3>
          <p className="text-xs text-rose-300/80 leading-relaxed mb-6">{error || 'Attempt records could not be resolved.'}</p>
          <Link href="/dashboard" className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors text-xs font-semibold text-white">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const attempt = session.attempt;
  const report = attempt.reportJson;
  const isPassed = attempt.isPassed;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col relative overflow-hidden">
      {/* Background glowing rings */}
      <div className="absolute top-[-10%] left-[-15%] h-[600px] w-[600px] rounded-full bg-indigo-500/5 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-15%] h-[600px] w-[600px] rounded-full bg-violet-500/5 blur-[120px]" />

      {/* Navbar */}
      <nav className="relative z-10 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 shadow-md">
              <span className="text-sm font-bold text-white">A</span>
            </Link>
            <span className="font-semibold tracking-wide text-white">Exam Diagnostics Summary</span>
          </div>

          <Link href="/dashboard" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
            Exit Workspace
          </Link>
        </div>
      </nav>

      {/* Dashboard container */}
      <main className="relative z-10 flex-1 mx-auto max-w-4xl w-full px-6 py-10 space-y-10">
        
        {/* Main scorecard card */}
        <div className="p-8 rounded-3xl bg-slate-900/55 border border-slate-800/80 backdrop-blur-xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Circular Score Gauge */}
          <div className="relative flex items-center justify-center h-44 w-44 rounded-full border-4 border-slate-800/60 shadow-inner">
            {/* Outline indicator based on pass/fail */}
            <div className={`absolute inset-[-4px] rounded-full border-4 ${isPassed ? 'border-emerald-500/45 animate-pulse' : 'border-rose-500/45 animate-pulse'}`} />
            <div className="text-center">
              <span className="text-4xl font-extrabold tracking-tight font-mono">{attempt.score}%</span>
              <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold mt-1">Score Scored</span>
            </div>
          </div>

          {/* Details column */}
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div>
              <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-2 ${
                isPassed
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}>
                {isPassed ? 'Passed Examination' : 'Failed Attempt'}
              </span>
              <h2 className="text-2xl font-bold text-white leading-tight">{session.template.name}</h2>
              <p className="text-slate-400 text-xs mt-1">Submitted on {new Date(attempt.createdAt).toLocaleString()}</p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-950/40 border border-slate-800/60 p-3.5 rounded-2xl text-center">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Target Pass</span>
                <span className="text-sm font-bold text-slate-300">{session.template.passingScore}%</span>
              </div>
              <div className="bg-slate-950/40 border border-slate-800/60 p-3.5 rounded-2xl text-center">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Total Items</span>
                <span className="text-sm font-bold text-slate-300">{report.totalQuestions}</span>
              </div>
              <div className="bg-slate-950/40 border border-slate-800/60 p-3.5 rounded-2xl text-center">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Correct Items</span>
                <span className="text-sm font-bold text-slate-300">{report.correctAnswers}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Blueprint category diagnostics */}
        <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-md space-y-6 shadow-xl">
          <h3 className="text-lg font-bold text-white tracking-wide">Domain-by-Domain breakdown</h3>
          
          <div className="space-y-5">
            {report.categories.map((cat) => {
              const isCatPassed = cat.percentage >= session.template.passingScore;

              return (
                <div key={cat.categoryId} className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-300">{cat.categoryName}</span>
                    <span className="font-mono text-slate-400">
                      {cat.correct} / {cat.total} answered correct ({cat.percentage}%)
                    </span>
                  </div>

                  {/* Custom progress bar */}
                  <div className="h-2 w-full rounded-full bg-slate-950 border border-slate-800/50 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCatPassed ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Study review details toggle */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white tracking-wide">Detailed item review</h3>
            <button
              onClick={() => setIsReviewOpen(!isReviewOpen)}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors text-xs font-semibold text-slate-300 hover:text-white"
            >
              {isReviewOpen ? 'Hide Items' : 'Review Questions & Explanations'}
            </button>
          </div>

          {isReviewOpen && (
            <div className="space-y-6 animate-fadeIn">
              {session.answers.map((ans, idx) => {
                const question = ans.question;
                const correctOptions = question.options.filter((o) => o.isCorrect).map((o) => o.id);
                const isCorrect =
                  correctOptions.length === ans.optionIds.length &&
                  correctOptions.every((id) => ans.optionIds.includes(id));

                return (
                  <div
                    key={ans.id}
                    className={`p-6 rounded-2xl border backdrop-blur-sm space-y-4 ${
                      isCorrect
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-rose-500/5 border-rose-500/20'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Item {idx + 1}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isCorrect ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>

                    {/* Question text */}
                    <p className="text-sm font-medium text-slate-100 leading-relaxed">
                      {question.text}
                    </p>

                    {/* Choices Review */}
                    <div className="space-y-2 pt-2">
                      {question.options.map((opt) => {
                        const isUserSelected = ans.optionIds.includes(opt.id);
                        const isOptCorrect = opt.isCorrect;

                        let cardStyles = 'bg-slate-950/40 border-slate-900 text-slate-400';
                        if (isOptCorrect) {
                          cardStyles = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
                        } else if (isUserSelected) {
                          cardStyles = 'bg-rose-500/10 border-rose-500/30 text-rose-300';
                        }

                        return (
                          <div
                            key={opt.id}
                            className={`p-3.5 rounded-xl border text-xs flex justify-between items-center ${cardStyles}`}
                          >
                            <span>{opt.text}</span>
                            
                            <div className="flex gap-2">
                              {isUserSelected && (
                                <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isOptCorrect ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'}`}>
                                  Your Choice
                                </span>
                              )}
                              {isOptCorrect && (
                                <span className="text-[8px] font-bold uppercase tracking-wider bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded">
                                  Correct Choice
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {question.explanation && (
                      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 leading-relaxed mt-4">
                        <span className="font-semibold text-slate-200 block mb-1">Study Explanation:</span>
                        {question.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Bottom */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 font-semibold text-slate-300 hover:text-white text-xs transition-all w-full sm:w-auto text-center"
          >
            Return to Dashboard Workspace
          </Link>
          {isPassed && (
            <button
              onClick={handleDownloadCertificate}
              disabled={isDownloading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 font-semibold text-white text-xs shadow-lg shadow-indigo-500/10 active:scale-[0.98] transition-all w-full sm:w-auto flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent"></div>
                  Generating PDF...
                </>
              ) : (
                'Download Completion Certificate'
              )}
            </button>
          )}
        </div>

      </main>
    </div>
  );
}
