import { create } from "zustand";
import { categoryService, type Category, type CategoryPayload } from "../services/categoryService";
import { runStoreTask, runStoreTaskWithFlag } from "./storeAsync";

export type CategoryStatusFilter = "all" | "active" | "inactive";

type CategoryState = {
  categories: Category[];
  treeData: Category[];
  loading: boolean;
  saving: boolean;
  page: number;
  pageSize: number;
  total: number;
  keyword: string;
  statusFilter: CategoryStatusFilter;
  loadCategories: (params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    statusFilter?: CategoryStatusFilter;
  }) => Promise<void>;
  loadCategoryTree: () => Promise<void>;
  setKeyword: (keyword: string) => void;
  setStatusFilter: (statusFilter: CategoryStatusFilter) => void;
  createCategory: (payload: CategoryPayload) => Promise<void>;
  updateCategory: (id: string, payload: CategoryPayload) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  uploadCategoryImage: (file: File) => Promise<string>;
};

const toIsActive = (statusFilter: CategoryStatusFilter): boolean | undefined => {
  if (statusFilter === "active") {
    return true;
  }

  if (statusFilter === "inactive") {
    return false;
  }

  return undefined;
};

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  treeData: [],
  loading: false,
  saving: false,
  page: 1,
  pageSize: 10,
  total: 0,
  keyword: "",
  statusFilter: "all",

  loadCategories: async (params) => {
    const state = get();
    const nextPage = params?.page ?? state.page;
    const nextPageSize = params?.pageSize ?? state.pageSize;
    const nextKeyword = params?.keyword ?? state.keyword;
    const nextStatus = params?.statusFilter ?? state.statusFilter;
    const isActive = toIsActive(nextStatus);

    await runStoreTaskWithFlag(set, "loading", async () => {
      const query = nextKeyword.trim();
      const result = query
        ? await categoryService.searchCategories(query, nextPage, nextPageSize, isActive)
        : await categoryService.getCategories({
            page: nextPage,
            limit: nextPageSize,
            isActive,
          });

      set({
        categories: result.docs,
        total: result.totalDocs,
        page: result.page,
        pageSize: result.limit,
        keyword: nextKeyword,
        statusFilter: nextStatus,
      });
    });
  },

  loadCategoryTree: async () => {
    const result = await categoryService.getCategoryTree();
    set({ treeData: result });
  },

  setKeyword: (keyword) => set({ keyword }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),

  createCategory: async (payload) => {
    await runStoreTaskWithFlag(set, "saving", async () => {
      await categoryService.createCategory(payload);
      await Promise.all([get().loadCategories(), get().loadCategoryTree()]);
    });
  },

  updateCategory: async (id, payload) => {
    await runStoreTaskWithFlag(set, "saving", async () => {
      await categoryService.updateCategory(id, payload);
      await Promise.all([get().loadCategories(), get().loadCategoryTree()]);
    });
  },

  deleteCategory: async (id) => {
    await runStoreTaskWithFlag(set, "saving", async () => {
      await categoryService.deleteCategory(id);
      await Promise.all([get().loadCategories(), get().loadCategoryTree()]);
    });
  },

  uploadCategoryImage: async (file) => {
    return runStoreTask(() => categoryService.uploadCategoryImage(file));
  },
}));



