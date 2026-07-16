'use client';

import { useEffect } from 'react';
import { useAuthStore, UserProfile } from '@/store/auth';
import { api } from '@/services/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { token, login, logout, setLoading, isLoading } = useAuthStore();

  useEffect(() => {
    async function restoreSession() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const user = await api.get<UserProfile>('/auth/me');
        login(token, user);
      } catch (error) {
        console.warn('Invalid token session, logging out.');
        logout();
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, [token, login, logout, setLoading]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-500"></div>
          <p className="text-sm font-medium tracking-wide text-slate-400">Restoring session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
