import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/lib/api-client';
import { User, AuthResponse } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: async (email, password) => {
        const response = await apiClient.post<AuthResponse>('/auth/login', { email, password });
        const { user, token } = response.data;
        if (typeof window !== 'undefined') localStorage.setItem('token', token);
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        if (typeof window !== 'undefined') localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    { name: 'auth-storage' }
  )
);
