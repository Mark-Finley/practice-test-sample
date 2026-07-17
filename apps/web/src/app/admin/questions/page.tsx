'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { api } from '@/services/api';

interface Bank {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface Option {
  id?: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  text: string;
  explanation?: string;
  difficulty: string;
  type: string;
  bank: { name: string };
  category: { name: string };
  options: Option[];
}

export default function AdminQuestionsPage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAuthStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lists State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Filters State
  const [filterBank, setFilterBank] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [page, setPage] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formBankId, setFormBankId] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formText, setFormText] = useState('');
  const [formExplanation, setFormExplanation] = useState('');
  const [formDifficulty, setFormDifficulty] = useState('MEDIUM');
  const [formType, setFormType] = useState('SINGLE_CHOICE');
  const [formOptions, setFormOptions] = useState<Option[]>([
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);

  // Bulk Import State
  const [importBankId, setImportBankId] = useState('');
  const [importCategoryId, setImportCategoryId] = useState('');
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Fetching state
  const [isFetchingQuestions, setIsFetchingQuestions] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (user && user.role !== 'SYSTEM_ADMIN' && user.role !== 'ORG_ADMIN') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, isLoading, router]);

  const fetchBanksAndCategories = async () => {
    try {
      const [banksData, categoriesData] = await Promise.all([
        api.get<Bank[]>('/questions/banks'),
        api.get<Category[]>('/questions/categories'),
      ]);
      setBanks(banksData);
      setCategories(categoriesData);

      if (banksData.length > 0) {
        setFormBankId(banksData[0].id);
        setImportBankId(banksData[0].id);
      }
      if (categoriesData.length > 0) {
        setFormCategoryId(categoriesData[0].id);
        setImportCategoryId(categoriesData[0].id);
      }
    } catch (err) {
      console.error('Failed to load filters data:', err);
    }
  };

  const fetchQuestions = async () => {
    setIsFetchingQuestions(true);
    try {
      const query = [];
      if (filterBank) query.push(`bankId=${filterBank}`);
      if (filterCategory) query.push(`categoryId=${filterCategory}`);
      if (filterDifficulty) query.push(`difficulty=${filterDifficulty}`);
      query.push(`page=${page}`);
      query.push('limit=10');

      const data = await api.get<{ total: number; items: Question[] }>(`/questions?${query.join('&')}`);
      setQuestions(data.items);
      setTotalQuestions(data.total);
    } catch (err) {
      console.error('Failed to load questions catalog:', err);
    } finally {
      setIsFetchingQuestions(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'SYSTEM_ADMIN' || user?.role === 'ORG_ADMIN')) {
      fetchBanksAndCategories();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'SYSTEM_ADMIN' || user?.role === 'ORG_ADMIN')) {
      fetchQuestions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, filterBank, filterCategory, filterDifficulty, page]);

  const handleAddOption = () => {
    setFormOptions([...formOptions, { text: '', isCorrect: false }]);
  };

  const handleRemoveOption = (index: number) => {
    if (formOptions.length <= 2) return;
    setFormOptions(formOptions.filter((_, idx) => idx !== index));
  };

  const handleOptionTextChange = (index: number, text: string) => {
    const updated = [...formOptions];
    updated[index].text = text;
    setFormOptions(updated);
  };

  const handleOptionCorrectChange = (index: number, checked: boolean) => {
    const updated = [...formOptions];
    if (formType === 'SINGLE_CHOICE') {
      // Mark all others false
      updated.forEach((opt, idx) => {
        opt.isCorrect = idx === index ? checked : false;
      });
    } else {
      updated[index].isCorrect = checked;
    }
    setFormOptions(updated);
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const correctCount = formOptions.filter(opt => opt.isCorrect).length;
    if (formType === 'SINGLE_CHOICE' && correctCount !== 1) {
      setFormError('Single choice questions must have exactly one correct option marked.');
      setIsSubmitting(false);
      return;
    }
    if (formType === 'MULTIPLE_CHOICE' && correctCount < 1) {
      setFormError('Multiple choice questions must have at least one correct option marked.');
      setIsSubmitting(false);
      return;
    }

    try {
      await api.post('/questions', {
        bankId: formBankId,
        categoryId: formCategoryId,
        text: formText,
        explanation: formExplanation || undefined,
        difficulty: formDifficulty,
        type: formType,
        options: formOptions,
      });

      setFormText('');
      setFormExplanation('');
      setFormOptions([
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ]);
      setIsModalOpen(false);
      fetchQuestions();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create question.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await api.delete(`/questions/${id}`);
      fetchQuestions();
    } catch (err: any) {
      alert(err.message || 'Failed to delete question.');
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);
    setIsImporting(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await api.post<any>(
        `/questions/bulk-import?bankId=${importBankId}&categoryId=${importCategoryId}`,
        formData
      );
      setImportSuccess(`Successfully imported ${result.count} questions into the bank!`);
      fetchQuestions();
    } catch (err: any) {
      setImportError(err.message || 'Failed to parse CSV uploader.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-500"></div>
      </div>
    );
  }

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
            <span className="font-semibold tracking-wide text-white">Question Explorer</span>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href="/admin/dashboard"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Control Desk
            </Link>
            <Link
              href="/admin/templates"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Exam Blueprints
            </Link>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-xs font-semibold text-white shadow-md hover:from-indigo-400 hover:to-violet-400 transition-all active:scale-[0.98]"
            >
              Create Question
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="relative z-10 flex-1 mx-auto max-w-7xl w-full px-6 py-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left column: Filters & Bulk Upload */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Question Filter Panel */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white mb-4">Catalog Filters</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-2">Question Bank</label>
                <select
                  value={filterBank}
                  onChange={(e) => { setFilterBank(e.target.value); setPage(1); }}
                  className="block w-full rounded-xl border-0 bg-slate-950/60 py-2.5 px-3 text-white ring-1 ring-slate-800/80 focus:ring-2 focus:ring-indigo-500/80 transition-all text-xs"
                >
                  <option value="">All Question Banks</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-2">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
                  className="block w-full rounded-xl border-0 bg-slate-950/60 py-2.5 px-3 text-white ring-1 ring-slate-800/80 focus:ring-2 focus:ring-indigo-500/80 transition-all text-xs"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-2">Difficulty</label>
                <select
                  value={filterDifficulty}
                  onChange={(e) => { setFilterDifficulty(e.target.value); setPage(1); }}
                  className="block w-full rounded-xl border-0 bg-slate-950/60 py-2.5 px-3 text-white ring-1 ring-slate-800/80 focus:ring-2 focus:ring-indigo-500/80 transition-all text-xs"
                >
                  <option value="">All Difficulties</option>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bulk Import Panel */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white mb-4">Bulk Import CSV</h3>
            
            {importError && (
              <div className="mb-4 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-[10px] text-rose-400">
                {importError}
              </div>
            )}
            {importSuccess && (
              <div className="mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-[10px] text-emerald-400">
                {importSuccess}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-2">Target Bank</label>
                <select
                  value={importBankId}
                  onChange={(e) => setImportBankId(e.target.value)}
                  className="block w-full rounded-xl border-0 bg-slate-950/60 py-2.5 px-3 text-white ring-1 ring-slate-800/80 focus:ring-2 focus:ring-indigo-500/80 transition-all text-xs"
                >
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-2">Target Category</label>
                <select
                  value={importCategoryId}
                  onChange={(e) => setImportCategoryId(e.target.value)}
                  className="block w-full rounded-xl border-0 bg-slate-950/60 py-2.5 px-3 text-white ring-1 ring-slate-800/80 focus:ring-2 focus:ring-indigo-500/80 transition-all text-xs"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleBulkUpload}
                accept=".csv"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting || banks.length === 0 || categories.length === 0}
                className="w-full py-3 rounded-xl border border-dashed border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 flex flex-col items-center justify-center gap-1.5 transition-all text-xs text-slate-400 hover:text-indigo-400 disabled:opacity-50"
              >
                {isImporting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-white" />
                ) : (
                  <>
                    <span>📤 Drag or Click to Upload CSV</span>
                    <span className="text-[9px] text-slate-600">text, explanation, difficulty, type, correctOptionIndex, option1...</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Right column: Questions List */}
        <div className="lg:col-span-3">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Questions Inventory</h2>
            <span className="text-xs text-slate-400">Total: <span className="font-bold text-indigo-400">{totalQuestions}</span></span>
          </div>

          {isFetchingQuestions ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-500"></div>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-20 rounded-2xl bg-slate-900/30 border border-slate-800/60">
              <p className="text-slate-500 text-sm">No questions found matching your filter criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm shadow-lg hover:border-slate-700/80 transition-colors"
                >
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 text-[10px] font-semibold">
                        {q.bank.name}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-semibold">
                        {q.category.name}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        q.difficulty === 'EASY' ? 'bg-emerald-500/10 text-emerald-400' :
                        q.difficulty === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {q.difficulty}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="text-xs text-rose-500 hover:text-rose-400 transition-colors font-medium"
                    >
                      Delete
                    </button>
                  </div>

                  <p className="text-slate-100 text-sm font-medium leading-relaxed">{q.text}</p>
                  
                  {q.explanation && (
                    <div className="mt-3 p-3 rounded-lg bg-slate-950/40 text-xs text-slate-400 border-l-2 border-indigo-500/50">
                      <span className="font-semibold text-slate-300 block mb-1">Explanation:</span>
                      {q.explanation}
                    </div>
                  )}

                  {/* Options List */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {q.options.map((opt, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl text-xs flex justify-between items-center ${
                          opt.isCorrect 
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' 
                            : 'bg-slate-950/60 border border-slate-900 text-slate-400'
                        }`}
                      >
                        <span>{opt.text}</span>
                        {opt.isCorrect && <span className="font-bold text-[9px] uppercase tracking-wider bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded">Correct</span>}
                      </div>
                    ))}
                  </div>

                </div>
              ))}

              {/* Pagination controls */}
              {totalQuestions > 10 && (
                <div className="flex justify-between items-center pt-4">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold hover:bg-slate-800 transition-colors disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-500">Page {page} of {Math.ceil(totalQuestions / 10)}</span>
                  <button
                    disabled={page >= Math.ceil(totalQuestions / 10)}
                    onClick={() => setPage(page + 1)}
                    className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold hover:bg-slate-800 transition-colors disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}

            </div>
          )}
        </div>
      </main>

      {/* Manual Question Creator Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Create Practice Question</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Scroll Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {formError && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-400">
                  {formError}
                </div>
              )}

              <form id="question-form" onSubmit={handleCreateQuestion} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Question Bank</label>
                    <select
                      value={formBankId}
                      onChange={(e) => setFormBankId(e.target.value)}
                      className="block w-full rounded-xl border-0 bg-slate-950/60 py-2.5 px-3 text-white ring-1 ring-slate-800/80 focus:ring-2 focus:ring-indigo-500/80 transition-all text-xs"
                    >
                      {banks.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Category</label>
                    <select
                      value={formCategoryId}
                      onChange={(e) => setFormCategoryId(e.target.value)}
                      className="block w-full rounded-xl border-0 bg-slate-950/60 py-2.5 px-3 text-white ring-1 ring-slate-800/80 focus:ring-2 focus:ring-indigo-500/80 transition-all text-xs"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Difficulty</label>
                    <select
                      value={formDifficulty}
                      onChange={(e) => setFormDifficulty(e.target.value)}
                      className="block w-full rounded-xl border-0 bg-slate-950/60 py-2.5 px-3 text-white ring-1 ring-slate-800/80 focus:ring-2 focus:ring-indigo-500/80 transition-all text-xs"
                    >
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Type</label>
                    <select
                      value={formType}
                      onChange={(e) => {
                        setFormType(e.target.value);
                        // Reset options checks
                        setFormOptions(formOptions.map(opt => ({ ...opt, isCorrect: false })));
                      }}
                      className="block w-full rounded-xl border-0 bg-slate-950/60 py-2.5 px-3 text-white ring-1 ring-slate-800/80 focus:ring-2 focus:ring-indigo-500/80 transition-all text-xs"
                    >
                      <option value="SINGLE_CHOICE">Single Choice</option>
                      <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Question Text</label>
                  <textarea
                    required
                    value={formText}
                    onChange={(e) => setFormText(e.target.value)}
                    rows={3}
                    className="block w-full rounded-xl border-0 bg-slate-950/60 py-2.5 px-3 text-white ring-1 ring-slate-800/80 focus:ring-2 focus:ring-indigo-500/80 transition-all text-xs resize-none"
                    placeholder="Enter the question query prompt..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2 font-mono">Explanation (Optional)</label>
                  <textarea
                    value={formExplanation}
                    onChange={(e) => setFormExplanation(e.target.value)}
                    rows={2}
                    className="block w-full rounded-xl border-0 bg-slate-950/60 py-2.5 px-3 text-white ring-1 ring-slate-800/80 focus:ring-2 focus:ring-indigo-500/80 transition-all text-xs resize-none"
                    placeholder="Provide reasoning for correct/incorrect answers..."
                  />
                </div>

                {/* Option management */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-300">Answer Options List</label>
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      + Add Option Row
                    </button>
                  </div>

                  {formOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3 animate-fadeIn">
                      <input
                        type={formType === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'}
                        name="correct-option"
                        checked={opt.isCorrect}
                        onChange={(e) => handleOptionCorrectChange(idx, e.target.checked)}
                        className="h-4 w-4 rounded-full bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500"
                      />
                      <input
                        type="text"
                        required
                        value={opt.text}
                        onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                        className="block flex-1 rounded-xl border-0 bg-slate-950/60 py-2 px-3 text-white ring-1 ring-slate-800/80 focus:ring-2 focus:ring-indigo-500/80 transition-all text-xs"
                        placeholder={`Choice Option ${idx + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        disabled={formOptions.length <= 2}
                        className="text-xs text-slate-500 hover:text-rose-400 disabled:opacity-30 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/40">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:bg-slate-900 text-xs font-semibold text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="question-form"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-xs font-semibold text-white shadow-md hover:from-indigo-400 hover:to-violet-400 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Create Question'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
