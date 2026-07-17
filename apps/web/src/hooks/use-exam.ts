'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/services/api';
import { useRouter } from 'next/navigation';

export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  type: string; // 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE'
  options: Option[];
}

export interface Answer {
  id: string;
  questionId: string;
  question: Question;
  optionIds: string[];
  isFlagged: boolean;
  timeSpentSeconds: number;
  sortOrder: number;
}

export interface ExamSession {
  id: string;
  status: string;
  timeRemainingSeconds: number;
  template: {
    name: string;
    duration: number;
  };
  answers: Answer[];
}

export function useExam(sessionId: string) {
  const router = useRouter();
  const [session, setSession] = useState<ExamSession | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blurCount, setBlurCount] = useState(0);
  const [showBlurWarning, setShowBlurWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef(false);

  // Time spent per question tracking
  const currentQuestionTimeRef = useRef<number>(0);
  const questionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load session from backend
  const loadSession = useCallback(async () => {
    try {
      const data = await api.get<ExamSession>(`/exams/sessions/${sessionId}`);
      if (data.status === 'COMPLETED') {
        router.push(`/exams/session/${sessionId}/result`);
        return;
      }
      setSession(data);
      setAnswers(data.answers || []);
      setTimeLeft(data.timeRemainingSeconds);
      setIsLoading(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load exam session.');
      setIsLoading(false);
    }
  }, [sessionId, router]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Submit session
  const submitExam = useCallback(async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    // Save final time spent on current question before submitting
    if (session && answers[currentIndex]) {
      try {
        const currentAnswer = answers[currentIndex];
        await api.post(`/exams/sessions/${sessionId}/save-answer`, {
          questionId: currentAnswer.questionId,
          optionIds: currentAnswer.optionIds,
          timeSpentSeconds: currentAnswer.timeSpentSeconds + currentQuestionTimeRef.current,
          isFlagged: currentAnswer.isFlagged,
        });
      } catch (err) {
        console.error('Failed to save final answer state before submit:', err);
      }
    }

    try {
      await api.post(`/exams/sessions/${sessionId}/submit`);
      router.push(`/exams/session/${sessionId}/result`);
    } catch (err: any) {
      alert(err.message || 'Failed to submit exam.');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [sessionId, router, session, answers, currentIndex]);

  // Countdown timer loop
  useEffect(() => {
    if (isLoading || !session || session.status !== 'ACTIVE') return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          submitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLoading, session, submitExam]);

  // Time spent per question tracking
  useEffect(() => {
    if (isLoading || !session || session.status !== 'ACTIVE') return;

    currentQuestionTimeRef.current = 0;
    questionTimerRef.current = setInterval(() => {
      currentQuestionTimeRef.current += 1;
    }, 1000);

    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [isLoading, session, currentIndex]);

  // Heartbeat sync with backend every 60 seconds
  useEffect(() => {
    if (isLoading || !session || session.status !== 'ACTIVE') return;

    heartbeatRef.current = setInterval(async () => {
      try {
        const data = await api.get<ExamSession>(`/exams/sessions/${sessionId}`);
        setTimeLeft(data.timeRemainingSeconds);
      } catch (err) {
        console.warn('Heartbeat sync failed:', err);
      }
    }, 60000);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [isLoading, session, sessionId]);

  // Save current answer state to API
  const saveAnswerState = async (
    questionId: string,
    optionIds: string[],
    timeSpent: number,
    isFlagged: boolean,
  ) => {
    try {
      await api.post(`/exams/sessions/${sessionId}/save-answer`, {
        questionId,
        optionIds,
        timeSpentSeconds: timeSpent,
        isFlagged,
      });
    } catch (err) {
      console.error('Autosave failed:', err);
    }
  };

  // Select Option
  const handleSelectOption = useCallback((optionId: string) => {
    if (!answers[currentIndex]) return;

    const currentAnswer = answers[currentIndex];
    const isMultiple = currentAnswer.question.type === 'MULTIPLE_CHOICE';

    let newOptionIds = [...currentAnswer.optionIds];
    if (isMultiple) {
      if (newOptionIds.includes(optionId)) {
        newOptionIds = newOptionIds.filter((id) => id !== optionId);
      } else {
        newOptionIds.push(optionId);
      }
    } else {
      newOptionIds = [optionId];
    }

    // Update local state instantly
    const updatedAnswers = [...answers];
    updatedAnswers[currentIndex] = {
      ...currentAnswer,
      optionIds: newOptionIds,
    };
    setAnswers(updatedAnswers);

    // Save to backend instantly
    saveAnswerState(
      currentAnswer.questionId,
      newOptionIds,
      currentAnswer.timeSpentSeconds + currentQuestionTimeRef.current,
      currentAnswer.isFlagged,
    );
  }, [answers, currentIndex]);

  // Toggle Flag
  const handleToggleFlag = useCallback(() => {
    if (!answers[currentIndex]) return;

    const currentAnswer = answers[currentIndex];
    const newFlagged = !currentAnswer.isFlagged;

    const updatedAnswers = [...answers];
    updatedAnswers[currentIndex] = {
      ...currentAnswer,
      isFlagged: newFlagged,
    };
    setAnswers(updatedAnswers);

    saveAnswerState(
      currentAnswer.questionId,
      currentAnswer.optionIds,
      currentAnswer.timeSpentSeconds + currentQuestionTimeRef.current,
      newFlagged,
    );
  }, [answers, currentIndex]);

  // Navigation functions
  const handleNext = useCallback(() => {
    if (currentIndex >= answers.length - 1) return;

    // Save current spent time on index change
    const currentAnswer = answers[currentIndex];
    saveAnswerState(
      currentAnswer.questionId,
      currentAnswer.optionIds,
      currentAnswer.timeSpentSeconds + currentQuestionTimeRef.current,
      currentAnswer.isFlagged,
    );

    // Update timeSpentSeconds locally
    const updatedAnswers = [...answers];
    updatedAnswers[currentIndex].timeSpentSeconds += currentQuestionTimeRef.current;
    setAnswers(updatedAnswers);

    currentQuestionTimeRef.current = 0;
    setCurrentIndex((prev) => prev + 1);
  }, [answers, currentIndex]);

  const handlePrev = useCallback(() => {
    if (currentIndex <= 0) return;

    const currentAnswer = answers[currentIndex];
    saveAnswerState(
      currentAnswer.questionId,
      currentAnswer.optionIds,
      currentAnswer.timeSpentSeconds + currentQuestionTimeRef.current,
      currentAnswer.isFlagged,
    );

    const updatedAnswers = [...answers];
    updatedAnswers[currentIndex].timeSpentSeconds += currentQuestionTimeRef.current;
    setAnswers(updatedAnswers);

    currentQuestionTimeRef.current = 0;
    setCurrentIndex((prev) => prev - 1);
  }, [answers, currentIndex]);

  const handleGoToQuestion = useCallback((index: number) => {
    if (index < 0 || index >= answers.length) return;

    const currentAnswer = answers[currentIndex];
    saveAnswerState(
      currentAnswer.questionId,
      currentAnswer.optionIds,
      currentAnswer.timeSpentSeconds + currentQuestionTimeRef.current,
      currentAnswer.isFlagged,
    );

    const updatedAnswers = [...answers];
    updatedAnswers[currentIndex].timeSpentSeconds += currentQuestionTimeRef.current;
    setAnswers(updatedAnswers);

    currentQuestionTimeRef.current = 0;
    setCurrentIndex(index);
  }, [answers, currentIndex]);

  // Window Focus blur detector (Anti-cheating)
  useEffect(() => {
    if (isLoading || !session || session.status !== 'ACTIVE') return;

    const handleBlur = () => {
      setBlurCount((prev) => {
        const next = prev + 1;

        // Log blur event to backend proctor log API
        api.post(`/exams/sessions/${sessionId}/proctor/log`, {
          eventType: 'TAB_SWITCH',
          severity: next >= 3 ? 'HIGH' : 'MEDIUM',
          details: { blurIndex: next, windowInnerWidth: window.innerWidth },
        }).catch((err) => console.warn('Failed to log proctor blur:', err));

        if (next >= 3) {
          submitExam();
        } else {
          setShowBlurWarning(true);
        }
        return next;
      });
    };

    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, [isLoading, session, sessionId, submitExam]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    if (isLoading || !session || session.status !== 'ACTIVE') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInput = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';
      if (isInput) return; // avoid blocking standard text inputting

      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key.toLowerCase() === 'f') {
        handleToggleFlag();
      } else {
        // Option selection digits (1, 2, 3, 4...)
        const optionNum = parseInt(e.key);
        if (!isNaN(optionNum) && optionNum >= 1) {
          const currentAnswer = answers[currentIndex];
          if (currentAnswer && currentAnswer.question.options[optionNum - 1]) {
            handleSelectOption(currentAnswer.question.options[optionNum - 1].id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLoading, session, currentIndex, answers, handleNext, handlePrev, handleSelectOption, handleToggleFlag]);

  return {
    session,
    answers,
    currentQuestion: answers[currentIndex]?.question || null,
    currentAnswer: answers[currentIndex] || null,
    currentIndex,
    totalQuestions: answers.length,
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
  };
}
