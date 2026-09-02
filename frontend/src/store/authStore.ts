import { create } from "zustand";
import api from "../services/api";
import { Admin, AdminPermission } from "../types";

/**
 * `login` no longer resolves to a plain boolean: an admin with two-factor
 * authentication enabled gets a short-lived challenge token instead of a
 * session, and must complete `verifyTwoFactor` before any token is stored.
 */
export type LoginResult =
  | { status: "success" }
  | { status: "2fa_required" }
  | { status: "error" };

interface AuthState {
  admin: Admin | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  /** Held in memory only — never persisted; it is not a session token. */
  challengeToken: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<LoginResult>;
  verifyTwoFactor: (code: string, rememberMe?: boolean) => Promise<boolean>;
  cancelTwoFactor: () => void;
  logout: () => void;
  clearError: () => void;
  checkAuth: () => Promise<void>;
  hasPermission: (permission: AdminPermission) => boolean;
  isSuperAdmin: () => boolean;
}

function persistSession(
  data: { accessToken: string; refreshToken: string },
  rememberMe: boolean
) {
  const store = rememberMe ? localStorage : sessionStorage;
  store.setItem("admin_access_token", data.accessToken);
  store.setItem("admin_refresh_token", data.refreshToken);
  // The API client reads from localStorage first, so mirror there either way.
  localStorage.setItem("admin_access_token", data.accessToken);
  localStorage.setItem("admin_refresh_token", data.refreshToken);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  admin: null,
  isLoading: true,
  error: null,
  isAuthenticated: false,
  challengeToken: null,

  clearError: () => set({ error: null }),

  hasPermission: (permission: AdminPermission) => {
    const admin = get().admin;
    if (!admin) return false;
    if (admin.role === 'super_admin') return true;
    const perms = admin.effectivePermissions || admin.permissions || [];
    if (perms.includes('*')) return true;
    return perms.includes(permission);
  },

  isSuperAdmin: () => {
    const admin = get().admin;
    return admin?.role === 'super_admin';
  },

  login: async (email, password, rememberMe = true) => {
    set({ isLoading: true, error: null, challengeToken: null });
    try {
      const response = await api.post("/auth/login", { email, password });
      const data = response.data.data;

      // Correct password, but a second factor is required. No session exists
      // yet — hold the challenge token in memory and let the UI collect a code.
      if (data?.requires2FA) {
        set({ isLoading: false, challengeToken: data.challengeToken, error: null });
        return { status: "2fa_required" };
      }

      persistSession(data, rememberMe);
      set({ admin: data.admin, isAuthenticated: true, isLoading: false, error: null });
      return { status: "success" };
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error || error.response?.data?.message || "Invalid credentials or connection error";
      set({ isLoading: false, error: errorMsg });
      return { status: "error" };
    }
  },

  verifyTwoFactor: async (code, rememberMe = true) => {
    const challengeToken = get().challengeToken;
    if (!challengeToken) {
      set({ error: "Your sign-in session expired. Please enter your password again." });
      return false;
    }
    set({ isLoading: true, error: null });
    try {
      const response = await api.post("/auth/login/2fa", { challengeToken, code });
      const data = response.data.data;
      persistSession(data, rememberMe);
      set({
        admin: data.admin,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        challengeToken: null,
      });
      return true;
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error || "That code was not accepted. Please try again.";
      set({ isLoading: false, error: errorMsg });
      return false;
    }
  },

  cancelTwoFactor: () => set({ challengeToken: null, error: null }),

  logout: () => {
    localStorage.removeItem("admin_access_token");
    localStorage.removeItem("admin_refresh_token");
    sessionStorage.removeItem("admin_access_token");
    sessionStorage.removeItem("admin_refresh_token");
    set({ admin: null, isAuthenticated: false, challengeToken: null });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = localStorage.getItem("admin_access_token") || sessionStorage.getItem("admin_access_token");
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      const response = await api.get("/auth/me");
      set({
        admin: response.data.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      localStorage.removeItem("admin_access_token");
      localStorage.removeItem("admin_refresh_token");
      sessionStorage.removeItem("admin_access_token");
      sessionStorage.removeItem("admin_refresh_token");
      set({ admin: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
