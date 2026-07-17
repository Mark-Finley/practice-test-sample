'use client';

import { useEffect, useState } from 'react';
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

export default function AdminTemplatesPage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAuthStore();

  // Lists State
  const [templates, setTemplates] = useState<ExamTemplate[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formBankId, setFormBankId] = useState('');
  const [formTotalQuestions, setFormTotalQuestions] = useState(10);
  const [formDuration, setFormDuration] = useState(30);
  const [formPassingScore, setFormPassingScore] = useState(70);
  const [formWeights, setFormWeights] = useState<Record<string, number>>({});

  // Status indicators
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Exam Module (Question Bank) Form State
  const [moduleName, setModuleName] = useState('');
  const [moduleDesc, setModuleDesc] = useState('');
  const [isCreatingModule, setIsCreatingModule] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (user && user.role !== 'SYSTEM_ADMIN' && user.role !== 'ORG_ADMIN') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, isLoading, router]);

  const fetchBanksAndTemplates = async () => {
    try {
      const [banksData, templatesData] = await Promise.all([
        api.get<Bank[]>('/questions/banks'),
        api.get<ExamTemplate[]>('/exam-templates'),
      ]);
      setBanks(banksData);
      setTemplates(templatesData);

      if (banksData.length > 0) {
        setFormBankId(banksData[0].id);
      }
    } catch (err) {
      console.error('Failed to load banks or templates list:', err);
    } finally {
      setIsFetching(false);
    }
  };

  const fetchCategoriesForBank = async (bankId: string) => {
    if (!bankId) return;
    try {
      const categoriesData = await api.get<Category[]>('/questions/categories');
      setCategories(categoriesData);
      
      // Initialize weights map to 0 for each category
      const initialWeights: Record<string, number> = {};
      categoriesData.forEach(cat => {
        initialWeights[cat.id] = 0;
      });
      setFormWeights(initialWeights);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'SYSTEM_ADMIN' || user?.role === 'ORG_ADMIN')) {
      fetchBanksAndTemplates();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (formBankId) {
      fetchCategoriesForBank(formBankId);
    }
  }, [formBankId]);

  const handleWeightChange = (categoryId: string, value: number) => {
    setFormWeights(prev => ({
      ...prev,
      [categoryId]: isNaN(value) ? 0 : Math.max(0, value),
    }));
  };

  // Calculate dynamic sum of current weights
  const currentSum = Object.values(formWeights).reduce((sum, val) => sum + val, 0);
  const weightsMatch = currentSum === formTotalQuestions;

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!weightsMatch) {
      setFormError(`The sum of weights (${currentSum}) must equal total questions (${formTotalQuestions}) exactly.`);
      return;
    }

    setIsSubmitting(true);

    // Filter out categories with 0 count to minimize payload
    const categoryWeights = Object.entries(formWeights)
      .map(([categoryId, questionCount]) => ({ categoryId, questionCount }))
      .filter(w => w.questionCount > 0);

    try {
      await api.post('/exam-templates', {
        name: formName,
        bankId: formBankId,
        totalQuestions: formTotalQuestions,
        duration: formDuration,
        passingScore: formPassingScore,
        categoryWeights,
      });

      setFormName('');
      setIsModalOpen(false);
      fetchBanksAndTemplates(); // Refresh catalog list
    } catch (err: any) {
      setFormError(err.message || 'Failed to save exam template.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exam template?')) return;
    try {
      await api.delete(`/exam-templates/${id}`);
      fetchBanksAndTemplates();
    } catch (err: any) {
      alert(err.message || 'Failed to delete exam template.');
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleName.trim()) return;
    setIsCreatingModule(true);
    try {
      await api.post('/questions/banks', {
        name: moduleName,
        description: moduleDesc || undefined,
      });
      setModuleName('');
      setModuleDesc('');
      fetchBanksAndTemplates();
    } catch (err: any) {
      alert(err.message || 'Failed to create exam module.');
    } finally {
      setIsCreatingModule(false);
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exam module? All questions under this bank will be deleted.')) {
      return;
    }
    try {
      await api.delete(`/questions/banks/${id}`);
      fetchBanksAndTemplates();
    } catch (err: any) {
      alert(err.message || 'Failed to delete exam module.');
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
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-15%] h-[600px] w-[600px] rounded-full bg-indigo-500/5 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-15%] h-[600px] w-[600px] rounded-full bg-violet-500/5 blur-[120px]" />

      {/* Navbar */}
      <nav className="relative z-10 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 shadow-md">
              <span className="text-sm font-bold text-white">A</span>
            </Link>
            <span className="font-semibold tracking-wide text-white">Exam Templates Desk</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/admin/dashboard"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Control Desk
            </Link>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-xs font-semibold text-white shadow-md hover:from-indigo-400 hover:to-violet-400 transition-all active:scale-[0.98]"
            >
              Create Template
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="relative z-10 flex-1 mx-auto max-w-7xl w-full px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Left Column: Exam Blueprints (Templates) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-extrabold text-white sm:text-3xl bg-gradient-to-r from-slate-50 to-slate-400 bg-clip-text text-transparent">
                  Exam Blueprints
                </h1>
                <p className="mt-2 text-slate-400 text-xs">
                  Define the duration, target score, and weights distributions for timed mock examinations
                </p>
              </div>
            </div>

            {isFetching ? (
              <div className="flex justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-500"></div>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-20 rounded-2xl bg-slate-900/30 border border-slate-800/60">
                <p className="text-slate-500 text-sm">No exam templates created yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm shadow-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                          <span className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-semibold tracking-wider border border-indigo-500/25 truncate block max-w-full">
                            {tpl.bank?.name || 'EXAM'}
                          </span>
                          <h3 className="font-bold text-white text-lg mt-3 leading-tight">{tpl.name}</h3>
                        </div>
                        <button
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          className="text-xs text-rose-500 hover:text-rose-400 transition-colors flex-shrink-0"
                        >
                          Delete
                        </button>
                      </div>

                      {/* Core template details */}
                      <div className="grid grid-cols-3 gap-4 py-4 border-y border-slate-800/60 my-4 text-center">
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">Questions</span>
                          <span className="text-base font-bold text-white mt-1 block">{tpl.totalQuestions}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">Timer Limit</span>
                          <span className="text-base font-bold text-white mt-1 block">{tpl.duration}m</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">Passing Score</span>
                          <span className="text-base font-bold text-white mt-1 block">{tpl.passingScore}%</span>
                        </div>
                      </div>

                      {/* Weights distribution lists */}
                      <div className="space-y-2 mt-4">
                        <span className="text-xs font-semibold text-slate-400">Category Allocations:</span>
                        <div className="grid grid-cols-1 gap-1.5 pt-1">
                          {tpl.categoryWeights.map((cw, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs p-2 rounded bg-slate-950/40">
                              <span className="text-slate-400">{cw.category.name}</span>
                              <span className="font-bold text-slate-200">{cw.questionCount} questions</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Exam Modules (Question Banks) */}
          <div className="lg:col-span-1 space-y-8">
            {/* Create Exam Module */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white tracking-wide">Create Exam Module</h2>
              <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 shadow-2xl">
                <form onSubmit={handleCreateModule} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Module Name</label>
                    <input
                      type="text"
                      required
                      value={moduleName}
                      onChange={(e) => setModuleName(e.target.value)}
                      className="block w-full rounded-xl border-0 bg-slate-950/60 py-2.5 px-3.5 text-white shadow-sm ring-1 ring-inset ring-slate-800/80 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/80 transition-all text-xs"
                      placeholder="e.g. AWS Cloud Practitioner (CLF-C02)"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Description</label>
                    <textarea
                      value={moduleDesc}
                      onChange={(e) => setModuleDesc(e.target.value)}
                      rows={3}
                      className="block w-full rounded-xl border-0 bg-slate-950/60 py-2.5 px-3.5 text-white shadow-sm ring-1 ring-inset ring-slate-800/80 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/80 transition-all text-xs"
                      placeholder="Core concepts, security, dynamic scaling architectures..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isCreatingModule || !moduleName.trim()}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-xs font-semibold text-white shadow-md hover:from-indigo-400 hover:to-violet-400 disabled:opacity-50 transition-all active:scale-[0.98]"
                  >
                    {isCreatingModule ? 'Creating...' : 'Add Exam Module'}
                  </button>
                </form>
              </div>
            </div>

            {/* Exam Modules List */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white tracking-wide">Available Exam Modules</h2>
              {isFetching ? (
                <div className="flex justify-center py-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-800 border-t-indigo-500"></div>
                </div>
              ) : banks.length === 0 ? (
                <div className="text-center py-8 rounded-2xl bg-slate-900/30 border border-slate-800/60">
                  <p className="text-slate-500 text-xs">No exam modules created yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {banks.map((bank) => (
                    <div
                      key={bank.id}
                      className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm shadow-md flex justify-between items-start"
                    >
                      <div className="flex-1 min-w-0 mr-4">
                        <h4 className="font-bold text-white text-sm truncate">{bank.name}</h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                          {(bank as any).description || 'No description provided.'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteModule(bank.id)}
                        className="text-xs text-rose-500 hover:text-rose-400 transition-colors font-medium flex-shrink-0"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* Template Builder Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Create Exam Blueprint</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {formError && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-400">
                  {formError}
                </div>
              )}

              <form id="template-form" onSubmit={handleCreateTemplate} className="space-y-4">
                
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Blueprint Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="block w-full rounded-xl border-0 bg-slate-950/60 py-2.5 px-3.5 text-white ring-1 ring-slate-800/80 focus:ring-2 focus:ring-indigo-500/80 text-xs transition-all"
                    placeholder="e.g. AWS Cloud Practitioner Full Simulator"
                  />
                </div>

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
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Total Questions</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formTotalQuestions}
                      onChange={(e) => setFormTotalQuestions(parseInt(e.target.value, 10))}
                      className="block w-full rounded-xl border-0 bg-slate-950/60 py-2.5 px-3.5 text-white ring-1 ring-slate-800/80 focus:ring-2 focus:ring-indigo-500/80 text-xs transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Duration (Minutes)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formDuration}
                      onChange={(e) => setFormDuration(parseInt(e.target.value, 10))}
                      className="block w-full rounded-xl border-0 bg-slate-950/60 py-2.5 px-3.5 text-white ring-1 ring-slate-800/80 focus:ring-2 focus:ring-indigo-500/80 text-xs transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Passing Score (%)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={formPassingScore}
                      onChange={(e) => setFormPassingScore(parseInt(e.target.value, 10))}
                      className="block w-full rounded-xl border-0 bg-slate-950/60 py-2.5 px-3.5 text-white ring-1 ring-slate-800/80 focus:ring-2 focus:ring-indigo-500/80 text-xs transition-all"
                    />
                  </div>
                </div>

                {/* Categories weight sliders/inputs */}
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-300">Category Weights Distribution</label>
                    
                    {/* Live Sum Ticker Indicator */}
                    <div className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                      weightsMatch 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' 
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                    }`}>
                      {weightsMatch 
                        ? `✓ Weights sum matches: ${currentSum} / ${formTotalQuestions}` 
                        : `✗ Sum mismatch: ${currentSum} / ${formTotalQuestions}`
                      }
                    </div>
                  </div>

                  <div className="space-y-3">
                    {categories.map((cat) => (
                      <div key={cat.id} className="flex justify-between items-center text-xs p-3 rounded-xl bg-slate-950/40 border border-slate-900">
                        <span className="font-semibold text-slate-300">{cat.name}</span>
                        <input
                          type="number"
                          min={0}
                          value={formWeights[cat.id] ?? 0}
                          onChange={(e) => handleWeightChange(cat.id, parseInt(e.target.value, 10))}
                          className="w-20 rounded-lg border-0 bg-slate-950/80 py-1.5 px-2.5 text-white ring-1 ring-slate-800 focus:ring-2 focus:ring-indigo-500 text-xs text-center"
                        />
                      </div>
                    ))}
                  </div>
                </div>

              </form>
            </div>

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
                form="template-form"
                disabled={isSubmitting || !weightsMatch}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-xs font-semibold text-white shadow-md hover:from-indigo-400 hover:to-violet-400 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Blueprint'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
