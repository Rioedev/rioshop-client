import { AxiosError } from "axios";
import { create } from "zustand";
import { getErrorMessage } from "../utils/errorMessage";
import {
  adminAccountService,
  type AdminAccount,
  type CreateAdminAccountPayload,
  type UpdateAdminAccountPayload,
} from "../services/adminAccountService";

type AdminAccountState = {
  accounts: AdminAccount[];
  loading: boolean;
  saving: boolean;
  isForbidden: boolean;
  loadAdminAccounts: () => Promise<void>;
  createAdminAccount: (payload: CreateAdminAccountPayload) => Promise<void>;
  updateAdminAccount: (id: string, payload: UpdateAdminAccountPayload) => Promise<void>;
  deleteAdminAccount: (id: string) => Promise<void>;
};

export const useAdminAccountStore = create<AdminAccountState>((set, get) => ({
  accounts: [],
  loading: false,
  saving: false,
  isForbidden: false,

  loadAdminAccounts: async () => {
    set({ loading: true });
    try {
      const result = await adminAccountService.getAdminAccounts();
      set({ accounts: result, isForbidden: false });
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 403) {
        set({ accounts: [], isForbidden: true });
        return;
      }
      throw new Error(getErrorMessage(error));
    } finally {
      set({ loading: false });
    }
  },

  createAdminAccount: async (payload) => {
    set({ saving: true });
    try {
      await adminAccountService.createAdminAccount(payload);
      await get().loadAdminAccounts();
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },

  updateAdminAccount: async (id, payload) => {
    set({ saving: true });
    try {
      await adminAccountService.updateAdminAccount(id, payload);
      await get().loadAdminAccounts();
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },

  deleteAdminAccount: async (id) => {
    set({ saving: true });
    try {
      await adminAccountService.deleteAdminAccount(id);
      await get().loadAdminAccounts();
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },
}));


