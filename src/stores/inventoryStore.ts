import { AxiosError } from "axios";
import { create } from "zustand";
import {
  inventoryService,
  type InventoryRecord,
  type UpdateInventoryPayload,
} from "../services/inventoryService";

type InventorySummary = {
  onHand: number;
  reserved: number;
  available: number;
  incoming: number;
};

type InventoryState = {
  lowStockItems: InventoryRecord[];
  lowStockLoading: boolean;
  lowStockPage: number;
  lowStockPageSize: number;
  lowStockTotal: number;
  threshold?: number;
  currentVariantSku: string;
  inventoryItems: InventoryRecord[];
  inventorySummary: InventorySummary;
  inventoryLoading: boolean;
  inventoryPage: number;
  inventoryPageSize: number;
  inventoryTotal: number;
  saving: boolean;
  loadLowStockItems: (params?: { page?: number; pageSize?: number; threshold?: number }) => Promise<void>;
  loadInventoryByVariantSku: (variantSku: string, params?: { page?: number; pageSize?: number }) => Promise<void>;
  setCurrentVariantSku: (variantSku: string) => void;
  setThreshold: (threshold?: number) => void;
  updateInventory: (variantSku: string, payload: UpdateInventoryPayload) => Promise<void>;
};

const EMPTY_SUMMARY: InventorySummary = {
  onHand: 0,
  reserved: 0,
  available: 0,
  incoming: 0,
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

export const useInventoryStore = create<InventoryState>((set, get) => ({
  lowStockItems: [],
  lowStockLoading: false,
  lowStockPage: 1,
  lowStockPageSize: 10,
  lowStockTotal: 0,
  threshold: undefined,
  currentVariantSku: "",
  inventoryItems: [],
  inventorySummary: EMPTY_SUMMARY,
  inventoryLoading: false,
  inventoryPage: 1,
  inventoryPageSize: 10,
  inventoryTotal: 0,
  saving: false,

  loadLowStockItems: async (params) => {
    const state = get();
    const nextPage = params?.page ?? state.lowStockPage;
    const nextPageSize = params?.pageSize ?? state.lowStockPageSize;
    const nextThreshold = params?.threshold ?? state.threshold;

    set({ lowStockLoading: true });
    try {
      const result = await inventoryService.getLowStockItems({
        page: nextPage,
        limit: nextPageSize,
        threshold: nextThreshold,
      });

      set({
        lowStockItems: result.docs,
        lowStockTotal: result.totalDocs,
        lowStockPage: result.page,
        lowStockPageSize: result.limit,
        threshold: nextThreshold,
      });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ lowStockLoading: false });
    }
  },

  loadInventoryByVariantSku: async (variantSku, params) => {
    const state = get();
    const nextPage = params?.page ?? state.inventoryPage;
    const nextPageSize = params?.pageSize ?? state.inventoryPageSize;

    set({ inventoryLoading: true });
    try {
      const result = await inventoryService.getInventoryByVariantSku(variantSku, {
        page: nextPage,
        limit: nextPageSize,
      });

      set({
        currentVariantSku: variantSku,
        inventoryItems: result.docs,
        inventorySummary: result.summary,
        inventoryTotal: result.totalDocs,
        inventoryPage: result.page,
        inventoryPageSize: result.limit,
      });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ inventoryLoading: false });
    }
  },

  setCurrentVariantSku: (variantSku) => set({ currentVariantSku: variantSku }),
  setThreshold: (threshold) => set({ threshold }),

  updateInventory: async (variantSku, payload) => {
    set({ saving: true });
    try {
      await inventoryService.updateInventory(variantSku, payload);

      const state = get();
      await state.loadLowStockItems({
        page: state.lowStockPage,
        pageSize: state.lowStockPageSize,
        threshold: state.threshold,
      });

      const targetVariantSku = state.currentVariantSku || variantSku;
      if (targetVariantSku) {
        await state.loadInventoryByVariantSku(targetVariantSku, {
          page: state.inventoryPage,
          pageSize: state.inventoryPageSize,
        });
      }
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },
}));
