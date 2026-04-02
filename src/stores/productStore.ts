import { create } from "zustand";
import { getErrorMessage } from "../utils/errorMessage";
import { categoryService, type Category } from "../services/categoryService";
import { collectionService } from "../services/collectionService";
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

type CollectionOption = {
  value: string;
  label: string;
};

type CategoryLookupValue = {
  _id: string;
  name: string;
  slug: string;
};

type CollectionLookupValue = {
  _id: string;
  name: string;
  slug: string;
  image?: string;
};

type ProductState = {
  products: Product[];
  categoryOptions: CategoryOption[];
  collectionOptions: CollectionOption[];
  categoryLookup: Record<string, CategoryLookupValue>;
  collectionLookup: Record<string, CollectionLookupValue>;
  loading: boolean;
  categoryLoading: boolean;
  collectionLoading: boolean;
  saving: boolean;
  page: number;
  pageSize: number;
  total: number;
  keyword: string;
  categoryId?: string;
  collectionId?: string;
  statusFilter: ProductStatusFilter;
  loadProducts: (params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    categoryId?: string;
    collectionId?: string;
    statusFilter?: ProductStatusFilter;
  }) => Promise<void>;
  loadCategoryOptions: () => Promise<void>;
  loadCollectionOptions: () => Promise<void>;
  setKeyword: (keyword: string) => void;
  setCategoryId: (categoryId?: string) => void;
  setCollectionId: (collectionId?: string) => void;
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
  collectionOptions: [],
  categoryLookup: {},
  collectionLookup: {},
  loading: false,
  categoryLoading: false,
  collectionLoading: false,
  saving: false,
  page: 1,
  pageSize: 10,
  total: 0,
  keyword: "",
  categoryId: undefined,
  collectionId: undefined,
  statusFilter: "all",

  loadProducts: async (params) => {
    const state = get();
    const nextPage = params?.page ?? state.page;
    const nextPageSize = params?.pageSize ?? state.pageSize;
    const nextKeyword = params?.keyword ?? state.keyword;
    const nextCategoryId = params?.categoryId ?? state.categoryId;
    const nextCollectionId = params?.collectionId ?? state.collectionId;
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
            collection: nextCollectionId,
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
        collectionId: query ? undefined : nextCollectionId,
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

  loadCollectionOptions: async () => {
    set({ collectionLoading: true });
    try {
      const firstPage = await collectionService.getCollections({ page: 1, limit: 100 });
      const allCollections = [...firstPage.docs];

      if (firstPage.totalPages > 1) {
        const pageRequests: Promise<Awaited<ReturnType<typeof collectionService.getCollections>>>[] = [];
        for (let pageIndex = 2; pageIndex <= firstPage.totalPages; pageIndex += 1) {
          pageRequests.push(collectionService.getCollections({ page: pageIndex, limit: 100 }));
        }

        const pageResults = await Promise.allSettled(pageRequests);
        pageResults.forEach((result) => {
          if (result.status === "fulfilled") {
            allCollections.push(...result.value.docs);
          }
        });
      }

      const nextLookup = allCollections.reduce<Record<string, CollectionLookupValue>>((acc, item) => {
        acc[item._id] = {
          _id: item._id,
          name: item.name,
          slug: item.slug,
          image: item.image,
        };
        return acc;
      }, {});

      set({
        collectionLookup: nextLookup,
        collectionOptions: allCollections.map((item) => ({
          value: item._id,
          label: item.name,
        })),
      });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ collectionLoading: false });
    }
  },

  setKeyword: (keyword) => set({ keyword }),
  setCategoryId: (categoryId) => set({ categoryId }),
  setCollectionId: (collectionId) => set({ collectionId }),
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


