import { create } from "zustand";
import {
  inventoryService,
  type GetLowStockParams,
  type InventoryRecord,
  type PaginatedInventoryData,
  type UpdateInventoryPayload,
} from "../services/inventoryService";
import { runStoreTask, runStoreTaskWithFlag } from "./storeAsync";

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
  fetchLowStockItems: (params?: GetLowStockParams) => Promise<PaginatedInventoryData>;
};

const EMPTY_SUMMARY: InventorySummary = {
  onHand: 0,
  reserved: 0,
  available: 0,
  incoming: 0,
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

    await runStoreTaskWithFlag(set, "lowStockLoading", async () => {
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
    });
  },

  loadInventoryByVariantSku: async (variantSku, params) => {
    const state = get();
    const nextPage = params?.page ?? state.inventoryPage;
    const nextPageSize = params?.pageSize ?? state.inventoryPageSize;

    await runStoreTaskWithFlag(set, "inventoryLoading", async () => {
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
    });
  },

  setCurrentVariantSku: (variantSku) => set({ currentVariantSku: variantSku }),
  setThreshold: (threshold) => set({ threshold }),

  updateInventory: async (variantSku, payload) => {
    await runStoreTaskWithFlag(set, "saving", async () => {
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
    });
  },

  fetchLowStockItems: async (params = {}) => {
    return runStoreTask(() => inventoryService.getLowStockItems(params));
  },
}));


