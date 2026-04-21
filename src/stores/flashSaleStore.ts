import { create } from "zustand";
import {
  flashSaleService,
  type CreateFlashSalePayload,
  type FlashSale,
  type UpdateFlashSalePayload,
} from "../services/flashSaleService";
import { runStoreTaskWithFlag } from "./storeAsync";

type FlashSaleState = {
  flashSales: FlashSale[];
  loading: boolean;
  saving: boolean;
  page: number;
  pageSize: number;
  total: number;
  currentOnly: boolean;
  isActiveFilter?: boolean;
  loadFlashSales: (params?: {
    page?: number;
    pageSize?: number;
    currentOnly?: boolean;
    isActiveFilter?: boolean;
  }) => Promise<void>;
  setCurrentOnly: (currentOnly: boolean) => void;
  setIsActiveFilter: (isActiveFilter?: boolean) => void;
  createFlashSale: (payload: CreateFlashSalePayload) => Promise<void>;
  updateFlashSale: (id: string, payload: UpdateFlashSalePayload) => Promise<void>;
  deleteFlashSale: (id: string) => Promise<void>;
};

export const useFlashSaleStore = create<FlashSaleState>((set, get) => ({
  flashSales: [],
  loading: false,
  saving: false,
  page: 1,
  pageSize: 10,
  total: 0,
  currentOnly: false,
  isActiveFilter: undefined,

  loadFlashSales: async (params) => {
    const state = get();
    const nextPage = params?.page ?? state.page;
    const nextPageSize = params?.pageSize ?? state.pageSize;
    const nextCurrentOnly = params?.currentOnly ?? state.currentOnly;
    const nextIsActiveFilter = params?.isActiveFilter ?? state.isActiveFilter;

    await runStoreTaskWithFlag(set, "loading", async () => {
      const result = await flashSaleService.getFlashSales({
        page: nextPage,
        limit: nextPageSize,
        currentOnly: nextCurrentOnly,
        isActive: nextIsActiveFilter,
      });

      set({
        flashSales: result.docs,
        total: result.totalDocs,
        page: result.page,
        pageSize: result.limit,
        currentOnly: nextCurrentOnly,
        isActiveFilter: nextIsActiveFilter,
      });
    });
  },

  setCurrentOnly: (currentOnly) => set({ currentOnly }),
  setIsActiveFilter: (isActiveFilter) => set({ isActiveFilter }),

  createFlashSale: async (payload) => {
    await runStoreTaskWithFlag(set, "saving", async () => {
      await flashSaleService.createFlashSale(payload);
      const state = get();
      await state.loadFlashSales({
        page: state.page,
        pageSize: state.pageSize,
        currentOnly: state.currentOnly,
        isActiveFilter: state.isActiveFilter,
      });
    });
  },

  updateFlashSale: async (id, payload) => {
    await runStoreTaskWithFlag(set, "saving", async () => {
      await flashSaleService.updateFlashSale(id, payload);
      const state = get();
      await state.loadFlashSales({
        page: state.page,
        pageSize: state.pageSize,
        currentOnly: state.currentOnly,
        isActiveFilter: state.isActiveFilter,
      });
    });
  },

  deleteFlashSale: async (id) => {
    await runStoreTaskWithFlag(set, "saving", async () => {
      await flashSaleService.deleteFlashSale(id);
      const state = get();
      await state.loadFlashSales({
        page: state.page,
        pageSize: state.pageSize,
        currentOnly: state.currentOnly,
        isActiveFilter: state.isActiveFilter,
      });
    });
  },
}));


