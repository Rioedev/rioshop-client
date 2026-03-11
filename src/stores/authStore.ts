import { AxiosError } from "axios";
import { create } from "zustand";
import {
  authService,
  type AccountType,
  type AuthUser,
  type LoginPayload,
  type RegisterPayload,
} from "../services/authService";
import { bindAuthTokenGetter } from "../services/apiClient";

type AuthStorage = {
  user: AuthUser;
  token: string;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  accountType: AccountType | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  loginAdmin: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
};

const AUTH_STORAGE_KEY = "rioshop_auth";

const readAuthStorage = (): AuthStorage | null => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthStorage>;
    if (!parsed?.token || !parsed?.user) {
      return null;
    }

    const normalizedUser: AuthUser = {
      id: parsed.user.id,
      email: parsed.user.email,
      fullName: parsed.user.fullName,
      phone: parsed.user.phone,
      role: parsed.user.role ?? "user",
      accountType: parsed.user.accountType ?? "user",
    };

    if (!normalizedUser.id || !normalizedUser.email || !normalizedUser.fullName) {
      return null;
    }

    return { token: parsed.token, user: normalizedUser };
  } catch {
    return null;
  }
};

const writeAuthStorage = (data: AuthStorage) => {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
};

const clearAuthStorage = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const responseMessage = (error.response?.data as { message?: string } | undefined)?.message;
    return responseMessage ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
};

const applyAuthState = (user: AuthUser, token: string) => ({
  user,
  token,
  accountType: user.accountType,
  isAuthenticated: true,
});

export const useAuthStore = create<AuthState>((set, get) => {
  bindAuthTokenGetter(() => get().token);

  return {
    user: null,
    token: null,
    accountType: null,
    isAuthenticated: false,
    isHydrated: false,
    isLoading: false,

    login: async (payload) => {
      set({ isLoading: true });
      try {
        const { user, token } = await authService.login(payload);
        writeAuthStorage({ user, token });
        set({
          ...applyAuthState(user, token),
          isLoading: false,
        });
      } catch (error) {
        set({ isLoading: false });
        throw new Error(getErrorMessage(error));
      }
    },

    loginAdmin: async (payload) => {
      set({ isLoading: true });
      try {
        const { user, token } = await authService.loginAdmin(payload);
        writeAuthStorage({ user, token });
        set({
          ...applyAuthState(user, token),
          isLoading: false,
        });
      } catch (error) {
        set({ isLoading: false });
        throw new Error(getErrorMessage(error));
      }
    },

    register: async (payload) => {
      set({ isLoading: true });
      try {
        const { user, token } = await authService.register(payload);
        writeAuthStorage({ user, token });
        set({
          ...applyAuthState(user, token),
          isLoading: false,
        });
      } catch (error) {
        set({ isLoading: false });
        throw new Error(getErrorMessage(error));
      }
    },

    logout: async () => {
      const hasToken = Boolean(get().token);
      const accountType = get().accountType;

      try {
        if (hasToken && accountType) {
          await authService.logout(accountType);
        }
      } finally {
        clearAuthStorage();
        set({
          user: null,
          token: null,
          accountType: null,
          isAuthenticated: false,
        });
      }
    },

    hydrate: async () => {
      if (get().isHydrated) {
        return;
      }

      const stored = readAuthStorage();

      if (!stored) {
        set({ isHydrated: true });
        return;
      }

      set({
        ...applyAuthState(stored.user, stored.token),
        isHydrated: true,
      });

      try {
        const user = await authService.getCurrentUser(stored.user.accountType);
        writeAuthStorage({ user, token: stored.token });
        set({
          user,
          token: stored.token,
          accountType: stored.user.accountType,
          isAuthenticated: true,
        });
      } catch {
        clearAuthStorage();
        set({
          user: null,
          token: null,
          accountType: null,
          isAuthenticated: false,
        });
      }
    },
  };
});
