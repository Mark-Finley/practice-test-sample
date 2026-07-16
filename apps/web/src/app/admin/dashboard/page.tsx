'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { api } from '@/services/api';

interface Org {
  id: string;
  name: string;
  logoUrl?: string;
  createdAt: string;
  _count: {
    users: number;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const { isAuthenticated, user, logout, isLoading } = useAuthStore();

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgLogo, setNewOrgLogo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (user && user.role !== 'SYSTEM_ADMIN' && user.role !== 'ORG_ADMIN') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, isLoading, router]);

  const fetchOrgs = async () => {
    try {
      const data = await api.get<Org[]>('/organizations');
      setOrgs(data);
    } catch (err: any) {
      console.error('Failed to load organizations:', err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'SYSTEM_ADMIN' || user?.role === 'ORG_ADMIN')) {
      fetchOrgs();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await api.post('/organizations', {
        name: newOrgName,
        logoUrl: newOrgLogo || undefined,
      });
      setNewOrgName('');
      setNewOrgLogo('');
      fetchOrgs(); // Refresh list
    } catch (err: any) {
      setError(err.message || 'Failed to create organization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrg = async (id: string) => {
    if (!confirm('Are you sure you want to delete this organization? This action is irreversible.')) {
      return;
    }
    try {
      await api.delete(`/organizations/${id}`);
      fetchOrgs();
    } catch (err: any) {
      alert(err.message || 'Failed to delete organization.');
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
      {/* Glow circles */}
      <div className="absolute top-[-10%] left-[-15%] h-[600px] w-[600px] rounded-full bg-indigo-500/5 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-15%] h-[600px] w-[600px] rounded-full bg-violet-500/5 blur-[120px]" />

      {/* Navbar */}
      <nav className="relative z-10 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 shadow-md">
              <span className="text-sm font-bold text-white">A</span>
            </div>
            <span className="font-semibold tracking-wide text-white">Admin Control Desk</span>
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

      {/* Content */}
      <main className="relative z-10 flex-1 mx-auto max-w-7xl w-full px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Create Org Form */}
        <div className="lg:col-span-1">
          <h2 className="text-xl font-bold text-white mb-6">Create Organization</h2>
          <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 shadow-2xl">
            {error && (
              <div className="mb-4 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
                {error}
              </div>
            )}
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Organization Name</label>
                <input
                  type="text"
                  required
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="block w-full rounded-xl border-0 bg-slate-950/60 py-2.5 px-3.5 text-white shadow-sm ring-1 ring-inset ring-slate-800/80 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/80 transition-all text-xs"
                  placeholder="e.g. AWS Academy Hub"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Logo URL (Optional)</label>
                <input
                  type="url"
                  value={newOrgLogo}
                  onChange={(e) => setNewOrgLogo(e.target.value)}
                  className="block w-full rounded-xl border-0 bg-slate-950/60 py-2.5 px-3.5 text-white shadow-sm ring-1 ring-inset ring-slate-800/80 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/80 transition-all text-xs"
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-xs font-semibold text-white shadow-md hover:from-indigo-400 hover:to-violet-400 disabled:opacity-50 transition-all transform active:scale-[0.98]"
              >
                {isSubmitting ? 'Creating...' : 'Create Tenant'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Organizations List */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-white mb-6">Active Platform Tenants</h2>
          {isFetching ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-800 border-t-indigo-500"></div>
            </div>
          ) : orgs.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-slate-900/30 border border-slate-800/60">
              <p className="text-slate-500 text-sm">No organizations created yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orgs.map((org) => (
                <div
                  key={org.id}
                  className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm flex justify-between items-start shadow-md hover:border-slate-700/80 transition-colors"
                >
                  <div>
                    {org.logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={org.logoUrl} alt="Logo" className="h-8 w-auto mb-3 object-contain rounded" />
                    )}
                    <h3 className="font-bold text-white text-base">{org.name}</h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Created: {new Date(org.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-indigo-400 font-semibold mt-3">
                      Candidates: <span className="text-white">{org._count.users}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteOrg(org.id)}
                    className="text-xs text-rose-500 hover:text-rose-400 transition-colors font-medium"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
