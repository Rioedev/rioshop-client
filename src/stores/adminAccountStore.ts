import { AxiosError } from "axios";
import { create } from "zustand";
import {
  adminAccountService,
  type AdminAccount,
  type CreateAdminAccountPayload,
  type UpdateAdminAccountPayload,
} from "../services/adminAccountService";
import { runStoreTaskWithFlag } from "./storeAsync";

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
    await runStoreTaskWithFlag(set, "loading", async () => {
      try {
        const result = await adminAccountService.getAdminAccounts();
        set({ accounts: result, isForbidden: false });
      } catch (error) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 403) {
          set({ accounts: [], isForbidden: true });
          return;
        }

        throw error;
      }
    });
  },

  createAdminAccount: async (payload) => {
    await runStoreTaskWithFlag(set, "saving", async () => {
      await adminAccountService.createAdminAccount(payload);
      await get().loadAdminAccounts();
    });
  },

  updateAdminAccount: async (id, payload) => {
    await runStoreTaskWithFlag(set, "saving", async () => {
      await adminAccountService.updateAdminAccount(id, payload);
      await get().loadAdminAccounts();
    });
  },

  deleteAdminAccount: async (id) => {
    await runStoreTaskWithFlag(set, "saving", async () => {
      await adminAccountService.deleteAdminAccount(id);
      await get().loadAdminAccounts();
    });
  },
}));


