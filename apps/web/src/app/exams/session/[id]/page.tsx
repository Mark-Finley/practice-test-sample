'use client';

import { use, useState } from 'react';
import { useExam } from '@/hooks/use-exam';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ExamPlayerPage({ params }: PageProps) {
  const { id: sessionId } = use(params);
  const {
    session,
    answers,
    currentQuestion,
    currentAnswer,
    currentIndex,
    totalQuestions,
    timeLeft,
    isLoading,
    error,
    blurCount,
    showBlurWarning,
    setShowBlurWarning,
    isSubmitting,
    handleSelectOption,
    handleToggleFlag,
    handleNext,
    handlePrev,
    handleGoToQuestion,
    submitExam,
  } = useExam(sessionId);

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Time formatter: MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-500"></div>
          <p className="text-sm font-medium text-slate-400">Loading exam environment...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 text-slate-100 gap-4">
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-center max-w-md">
          <h3 className="text-lg font-bold text-rose-400 mb-2">Error Loading Exam</h3>
          <p className="text-xs text-rose-300/80 leading-relaxed mb-6">{error || 'Session could not be recovered.'}</p>
          <Link href="/dashboard" className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors text-xs font-semibold text-white">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Submission statistics
  const unansweredCount = answers.filter((ans) => ans.optionIds.length === 0).length;
  const flaggedCount = answers.filter((ans) => ans.isFlagged).length;

  const isTimerCritical = timeLeft < 300; // less than 5 minutes remaining

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col relative overflow-hidden select-none">
      {/* Subtle Glows */}
      <div className="absolute top-[-10%] left-[-15%] h-[500px] w-[500px] rounded-full bg-indigo-500/5 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-15%] h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-[120px]" />

      {/* Top Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-white tracking-wide">{session.template.name}</h1>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Question <span className="font-semibold text-slate-200">{currentIndex + 1}</span> of{' '}
            <span className="font-semibold text-slate-200">{totalQuestions}</span>
          </p>
        </div>

        {/* Timer Desk */}
        <div className="flex items-center gap-6">
          <div
            className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all duration-300 ${
              isTimerCritical
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse'
                : 'bg-slate-900/60 border-slate-800 text-slate-200'
            }`}
          >
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Time Remaining</span>
            <span className="text-base font-mono font-bold tracking-wider">{formatTime(timeLeft)}</span>
          </div>

          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-xs font-semibold text-white shadow-lg shadow-indigo-500/10 hover:from-indigo-400 hover:to-violet-400 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Submit Exam
          </button>
        </div>
      </header>

      {/* Main Panel layout */}
      <div className="relative z-10 flex-1 flex h-[calc(100vh-73px)] overflow-hidden">
        
        {/* Left Side: Question Display */}
        <main className="flex-1 overflow-y-auto p-8 lg:p-12 flex flex-col justify-between">
          <div className="max-w-3xl w-full mx-auto space-y-8">
            {/* Question Type Badge */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 font-semibold text-xs tracking-wider border border-indigo-500/25 uppercase">
                {currentQuestion?.type === 'MULTIPLE_CHOICE' ? 'Multiple Choice (Select all correct)' : 'Single Choice'}
              </span>
            </div>

            {/* Question Stem Text */}
            <div className="text-base md:text-lg font-medium text-slate-100 leading-relaxed font-sans">
              {currentQuestion?.text}
            </div>

            {/* Choice Options List */}
            <div className="space-y-3.5 pt-4">
              {currentQuestion?.options.map((option, index) => {
                const isSelected = currentAnswer?.optionIds.includes(option.id);
                const isMultiple = currentQuestion.type === 'MULTIPLE_CHOICE';

                return (
                  <button
                    key={option.id}
                    onClick={() => handleSelectOption(option.id)}
                    className={`w-full p-5 rounded-2xl border text-left flex items-start gap-4 transition-all duration-200 group relative ${
                      isSelected
                        ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-200 shadow-lg shadow-indigo-500/5'
                        : 'bg-slate-900/40 border-slate-800/80 text-slate-300 hover:bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Option Checkbox/Radio Icon */}
                    <div
                      className={`h-5 w-5 mt-0.5 rounded flex items-center justify-center border transition-all ${
                        isMultiple ? 'rounded-md' : 'rounded-full'
                      } ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500 text-white'
                          : 'border-slate-700 bg-slate-950/60 group-hover:border-slate-600'
                      }`}
                    >
                      {isSelected && (
                        <span className="text-[10px] font-bold">
                          {isMultiple ? '✓' : '●'}
                        </span>
                      )}
                    </div>

                    <div className="text-sm font-medium leading-relaxed">
                      <span className="font-bold text-slate-400 mr-2 uppercase tracking-wide font-mono">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      {option.text}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls Bar */}
          <div className="max-w-3xl w-full mx-auto flex items-center justify-between border-t border-slate-800/60 pt-8 mt-12">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="px-5 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-xs font-semibold text-slate-300 hover:text-white transition-colors disabled:opacity-40"
            >
              ← Previous
            </button>

            <button
              onClick={handleToggleFlag}
              className={`px-5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                currentAnswer?.isFlagged
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                  : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-300 hover:text-white'
              }`}
            >
              <span>{currentAnswer?.isFlagged ? '★ Flagged' : '☆ Flag for Review'}</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-950 text-[9px] font-mono border border-slate-800 text-slate-500">F</kbd>
            </button>

            <button
              onClick={handleNext}
              disabled={currentIndex === totalQuestions - 1}
              className="px-5 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-xs font-semibold text-slate-300 hover:text-white transition-colors disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </main>

        {/* Right Side: Navigation Grid & Badges */}
        <aside className="w-80 border-l border-slate-800/80 bg-slate-900/20 backdrop-blur-sm p-6 flex flex-col justify-between overflow-y-auto">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-5">Questions Navigator</h3>
            
            {/* Badges Grid */}
            <div className="grid grid-cols-5 gap-2.5">
              {answers.map((ans, idx) => {
                const isSelected = idx === currentIndex;
                const isAnswered = ans.optionIds.length > 0;
                const isFlagged = ans.isFlagged;

                let badgeStyles = 'border-slate-800/80 text-slate-400 bg-slate-950/20 hover:border-slate-700';
                if (isAnswered) {
                  badgeStyles = 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/15';
                }
                if (isFlagged) {
                  badgeStyles = 'border-amber-500 text-amber-400 bg-amber-500/5';
                }
                if (isAnswered && isFlagged) {
                  // hybrid: answered but flagged (glowing indigo badge with amber border)
                  badgeStyles = 'bg-indigo-600 border-amber-500 text-white shadow-md';
                }

                return (
                  <button
                    key={ans.id}
                    onClick={() => handleGoToQuestion(idx)}
                    className={`h-10 rounded-xl border text-xs font-bold transition-all relative flex items-center justify-center ${badgeStyles} ${
                      isSelected
                        ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 scale-105'
                        : ''
                    }`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick status recap */}
          <div className="border-t border-slate-800/60 pt-6 mt-8 space-y-3.5">
            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span>Answered Questions</span>
              <span className="font-semibold text-slate-200">
                {totalQuestions - unansweredCount} / {totalQuestions}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span>Flagged Questions</span>
              <span className="font-semibold text-slate-200">{flaggedCount}</span>
            </div>

            <div className="pt-3 border-t border-slate-800/40 grid grid-cols-3 gap-2 text-[9px] uppercase font-bold tracking-widest text-center text-slate-500">
              <div className="flex flex-col gap-1 items-center bg-slate-950/40 p-1.5 rounded-lg border border-slate-900">
                <span className="h-2 w-2 rounded-full border border-slate-800" />
                <span>Unread</span>
              </div>
              <div className="flex flex-col gap-1 items-center bg-slate-950/40 p-1.5 rounded-lg border border-slate-900">
                <span className="h-2 w-2 rounded-full bg-indigo-600" />
                <span>Saved</span>
              </div>
              <div className="flex flex-col gap-1 items-center bg-slate-950/40 p-1.5 rounded-lg border border-slate-900">
                <span className="h-2 w-2 rounded-full border border-amber-500 bg-amber-500/10" />
                <span>Flag</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Focus Blur Alert Warning Overlay */}
      {showBlurWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900 border border-rose-500/30 shadow-2xl text-center">
            <div className="h-14 w-14 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-5 text-2xl font-bold border border-rose-500/25">
              ⚠️
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Security Warning</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Focus shifts or tab switching is strictly monitored. Leaving this exam page violates proctoring integrity rules.
            </p>
            <div className="mb-8 rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-[10px] text-slate-400">
              Proctor violation warnings count: <span className="font-bold text-rose-500">{blurCount} / 3</span>
              <br />
              <span className="text-[9px] text-slate-600 block mt-1">Exceeding 3 shifts will result in automatic submission.</span>
            </div>
            <button
              onClick={() => setShowBlurWarning(false)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-xs font-semibold text-white shadow-md active:scale-[0.98] transition-all"
            >
              Resume Examination
            </button>
          </div>
        </div>
      )}

      {/* Submission Confirmation Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-3">Conclude Examination</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Are you sure you want to submit your mock exam? You will not be able to change your answers after submission.
            </p>

            {/* Quick Stats recap */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Unanswered</span>
                <span className={`text-2xl font-extrabold ${unansweredCount > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
                  {unansweredCount}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Flagged</span>
                <span className="text-2xl font-extrabold text-slate-200">{flaggedCount}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:bg-slate-900 text-xs font-semibold text-slate-300 transition-colors disabled:opacity-50"
              >
                Back to Exam
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSubmitModalOpen(false);
                  submitExam();
                }}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-xs font-semibold text-white shadow-md active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border border-white border-t-transparent" />
                ) : (
                  'Yes, Submit Exam'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
