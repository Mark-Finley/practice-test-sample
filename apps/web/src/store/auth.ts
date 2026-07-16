import { create } from 'zustand';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
  avatarUrl?: string | null;
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  setUser: (user: UserProfile | null) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Safe extraction of token from localStorage (running only in client context)
  const getInitialToken = (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  return {
    token: getInitialToken(),
    user: null,
    isAuthenticated: false,
    isLoading: true,

    login: (token, user) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
      }
      set({ token, user, isAuthenticated: true, isLoading: false });
    },

    logout: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
    },

    setUser: (user) => {
      set({ user, isAuthenticated: !!user });
    },

    setLoading: (isLoading) => {
      set({ isLoading });
    },
  };
});
