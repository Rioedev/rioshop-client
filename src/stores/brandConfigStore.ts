import { AxiosError } from "axios";
import { create } from "zustand";
import {
  brandConfigService,
  type BrandConfig,
  type UpdateBrandConfigPayload,
} from "../services/brandConfigService";
import { runStoreTaskWithFlag } from "./storeAsync";

type BrandConfigState = {
  config: BrandConfig | null;
  loading: boolean;
  saving: boolean;
  notFound: boolean;
  loadBrandConfig: (brandKey: string) => Promise<void>;
  updateBrandConfig: (brandKey: string, payload: UpdateBrandConfigPayload) => Promise<void>;
};

export const useBrandConfigStore = create<BrandConfigState>((set) => ({
  config: null,
  loading: false,
  saving: false,
  notFound: false,

  loadBrandConfig: async (brandKey) => {
    await runStoreTaskWithFlag(set, "loading", async () => {
      try {
        const result = await brandConfigService.getBrandConfig(brandKey);
        set({ config: result, notFound: false });
      } catch (error) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 404) {
          set({ config: null, notFound: true });
          return;
        }
        throw error;
      }
    });
  },

  updateBrandConfig: async (brandKey, payload) => {
    await runStoreTaskWithFlag(set, "saving", async () => {
      const result = await brandConfigService.updateBrandConfig(brandKey, payload);
      set({ config: result, notFound: false });
    });
  },
}));


