import { AxiosError } from "axios";
import { create } from "zustand";
import {
  brandConfigService,
  type BrandConfig,
  type UpdateBrandConfigPayload,
} from "../services/brandConfigService";

type BrandConfigState = {
  config: BrandConfig | null;
  loading: boolean;
  saving: boolean;
  notFound: boolean;
  loadBrandConfig: (brandKey: string) => Promise<void>;
  updateBrandConfig: (brandKey: string, payload: UpdateBrandConfigPayload) => Promise<void>;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof AxiosError) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Yêu cầu thất bại";
};

export const useBrandConfigStore = create<BrandConfigState>((set) => ({
  config: null,
  loading: false,
  saving: false,
  notFound: false,

  loadBrandConfig: async (brandKey) => {
    set({ loading: true });
    try {
      const result = await brandConfigService.getBrandConfig(brandKey);
      set({ config: result, notFound: false });
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        set({ config: null, notFound: true });
        return;
      }
      throw new Error(getErrorMessage(error));
    } finally {
      set({ loading: false });
    }
  },

  updateBrandConfig: async (brandKey, payload) => {
    set({ saving: true });
    try {
      const result = await brandConfigService.updateBrandConfig(brandKey, payload);
      set({ config: result, notFound: false });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },
}));
