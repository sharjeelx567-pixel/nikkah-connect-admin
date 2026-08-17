import { create } from 'zustand';
import api from '../services/api';
import { Admin } from '../types';

interface AuthState {
  admin: Admin | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  admin: null,
  isLoading: true,
  error: null,
  isAuthenticated: false,

  login: async (email, password, rememberMe = false) => {
    set({ isLoading: true, error: null });
    try {
      // Call backend login — backend verifies credentials against Firestore admins collection
      // and returns a custom JWT (no Firebase project dependency)
      const response = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken, admin } = response.data.data;

      if (rememberMe) {
        localStorage.setItem('admin_access_token', accessToken);
        localStorage.setItem('admin_refresh_token', refreshToken);
      } else {
        sessionStorage.setItem('admin_access_token', accessToken);
        sessionStorage.setItem('admin_refresh_token', refreshToken);
        localStorage.setItem('admin_access_token', accessToken);
        localStorage.setItem('admin_refresh_token', refreshToken);
      }

      set({
        admin,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return true;
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error || 'Invalid credentials or connection error';
      set({ isLoading: false, error: errorMsg });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_refresh_token');
    sessionStorage.removeItem('admin_access_token');
    sessionStorage.removeItem('admin_refresh_token');
    set({ admin: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = localStorage.getItem('admin_access_token');
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      const response = await api.get('/auth/me');
      set({
        admin: response.data.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      localStorage.removeItem('admin_access_token');
      localStorage.removeItem('admin_refresh_token');
      set({ admin: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
