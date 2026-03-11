import { AxiosError } from "axios";
import { create } from "zustand";
import { categoryService, type Category, type CategoryPayload } from "../services/categoryService";

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

    set({ loading: true });
    try {
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
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ loading: false });
    }
  },

  loadCategoryTree: async () => {
    const result = await categoryService.getCategoryTree();
    set({ treeData: result });
  },

  setKeyword: (keyword) => set({ keyword }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),

  createCategory: async (payload) => {
    set({ saving: true });
    try {
      await categoryService.createCategory(payload);
      await Promise.all([get().loadCategories(), get().loadCategoryTree()]);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },

  updateCategory: async (id, payload) => {
    set({ saving: true });
    try {
      await categoryService.updateCategory(id, payload);
      await Promise.all([get().loadCategories(), get().loadCategoryTree()]);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },

  deleteCategory: async (id) => {
    set({ saving: true });
    try {
      await categoryService.deleteCategory(id);
      await Promise.all([get().loadCategories(), get().loadCategoryTree()]);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },
}));

