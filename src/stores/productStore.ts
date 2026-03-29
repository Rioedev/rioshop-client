import { create } from "zustand";
import { getErrorMessage } from "../utils/errorMessage";
import { categoryService, type Category } from "../services/categoryService";
import {
  productService,
  type Product,
  type ProductPayload,
  type ProductStatusFilter,
} from "../services/productService";

type CategoryOption = {
  value: string;
  label: string;
};

type CategoryLookupValue = {
  _id: string;
  name: string;
  slug: string;
};

type ProductState = {
  products: Product[];
  categoryOptions: CategoryOption[];
  categoryLookup: Record<string, CategoryLookupValue>;
  loading: boolean;
  categoryLoading: boolean;
  saving: boolean;
  page: number;
  pageSize: number;
  total: number;
  keyword: string;
  categoryId?: string;
  statusFilter: ProductStatusFilter;
  loadProducts: (params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    categoryId?: string;
    statusFilter?: ProductStatusFilter;
  }) => Promise<void>;
  loadCategoryOptions: () => Promise<void>;
  setKeyword: (keyword: string) => void;
  setCategoryId: (categoryId?: string) => void;
  setStatusFilter: (statusFilter: ProductStatusFilter) => void;
  createProduct: (payload: ProductPayload) => Promise<void>;
  updateProduct: (id: string, payload: Partial<ProductPayload>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
};

const buildCategoryData = (
  nodes: Category[],
  level = 0,
  lookup: Record<string, CategoryLookupValue> = {},
): { options: CategoryOption[]; lookup: Record<string, CategoryLookupValue> } => {
  const options = nodes.flatMap((node) => {
    lookup[node._id] = {
      _id: node._id,
      name: node.name,
      slug: node.slug,
    };

    const current: CategoryOption = {
      value: node._id,
      label: `${"-- ".repeat(level)}${node.name}`,
    };

    const children = buildCategoryData(node.children ?? [], level + 1, lookup);
    return [current, ...children.options];
  });

  return { options, lookup };
};

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  categoryOptions: [],
  categoryLookup: {},
  loading: false,
  categoryLoading: false,
  saving: false,
  page: 1,
  pageSize: 10,
  total: 0,
  keyword: "",
  categoryId: undefined,
  statusFilter: "all",

  loadProducts: async (params) => {
    const state = get();
    const nextPage = params?.page ?? state.page;
    const nextPageSize = params?.pageSize ?? state.pageSize;
    const nextKeyword = params?.keyword ?? state.keyword;
    const nextCategoryId = params?.categoryId ?? state.categoryId;
    const nextStatusFilter = params?.statusFilter ?? state.statusFilter;
    const query = nextKeyword.trim();

    set({ loading: true });
    try {
      const result = query
        ? await productService.searchProducts(
            query,
            nextPage,
            nextPageSize,
            nextStatusFilter,
          )
        : await productService.getProducts({
            page: nextPage,
            limit: nextPageSize,
            category: nextCategoryId,
            sort: { createdAt: -1 },
            status: nextStatusFilter,
          });

      set({
        products: result.docs,
        total: result.totalDocs,
        page: result.page,
        pageSize: result.limit,
        keyword: nextKeyword,
        categoryId: query ? undefined : nextCategoryId,
        statusFilter: nextStatusFilter,
      });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ loading: false });
    }
  },

  loadCategoryOptions: async () => {
    set({ categoryLoading: true });
    try {
      const categoryTree = await categoryService.getCategoryTree();
      const { options, lookup } = buildCategoryData(categoryTree);
      set({
        categoryOptions: options,
        categoryLookup: lookup,
      });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ categoryLoading: false });
    }
  },

  setKeyword: (keyword) => set({ keyword }),
  setCategoryId: (categoryId) => set({ categoryId }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),

  createProduct: async (payload) => {
    set({ saving: true });
    try {
      await productService.createProduct(payload);
      await get().loadProducts();
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },

  updateProduct: async (id, payload) => {
    set({ saving: true });
    try {
      await productService.updateProduct(id, payload);
      await get().loadProducts();
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },

  deleteProduct: async (id) => {
    set({ saving: true });
    try {
      await productService.deleteProduct(id);
      await get().loadProducts();
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },
}));


