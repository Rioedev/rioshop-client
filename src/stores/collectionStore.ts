import { create } from "zustand";
import {
  collectionService,
  type Collection,
  type CollectionPayload,
} from "../services/collectionService";
import { runStoreTask, runStoreTaskWithFlag } from "./storeAsync";

export type CollectionStatusFilter = "all" | "active" | "inactive";

type CollectionState = {
  collections: Collection[];
  loading: boolean;
  saving: boolean;
  page: number;
  pageSize: number;
  total: number;
  keyword: string;
  statusFilter: CollectionStatusFilter;
  loadCollections: (params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    statusFilter?: CollectionStatusFilter;
  }) => Promise<void>;
  setKeyword: (keyword: string) => void;
  setStatusFilter: (statusFilter: CollectionStatusFilter) => void;
  createCollection: (payload: CollectionPayload) => Promise<void>;
  updateCollection: (id: string, payload: CollectionPayload) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  uploadCollectionImage: (file: File) => Promise<string>;
};

const toIsActive = (statusFilter: CollectionStatusFilter): boolean | undefined => {
  if (statusFilter === "active") {
    return true;
  }
  if (statusFilter === "inactive") {
    return false;
  }
  return undefined;
};

export const useCollectionStore = create<CollectionState>((set, get) => ({
  collections: [],
  loading: false,
  saving: false,
  page: 1,
  pageSize: 10,
  total: 0,
  keyword: "",
  statusFilter: "all",

  loadCollections: async (params) => {
    const state = get();
    const nextPage = params?.page ?? state.page;
    const nextPageSize = params?.pageSize ?? state.pageSize;
    const nextKeyword = params?.keyword ?? state.keyword;
    const nextStatus = params?.statusFilter ?? state.statusFilter;
    const isActive = toIsActive(nextStatus);

    await runStoreTaskWithFlag(set, "loading", async () => {
      const query = nextKeyword.trim();
      const result = query
        ? await collectionService.searchCollections(query, nextPage, nextPageSize, isActive)
        : await collectionService.getCollections({
            page: nextPage,
            limit: nextPageSize,
            isActive,
          });

      set({
        collections: result.docs,
        total: result.totalDocs,
        page: result.page,
        pageSize: result.limit,
        keyword: nextKeyword,
        statusFilter: nextStatus,
      });
    });
  },

  setKeyword: (keyword) => set({ keyword }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),

  createCollection: async (payload) => {
    await runStoreTaskWithFlag(set, "saving", async () => {
      await collectionService.createCollection(payload);
      await get().loadCollections();
    });
  },

  updateCollection: async (id, payload) => {
    await runStoreTaskWithFlag(set, "saving", async () => {
      await collectionService.updateCollection(id, payload);
      await get().loadCollections();
    });
  },

  deleteCollection: async (id) => {
    await runStoreTaskWithFlag(set, "saving", async () => {
      await collectionService.deleteCollection(id);
      await get().loadCollections();
    });
  },

  uploadCollectionImage: async (file) => {
    return runStoreTask(() => collectionService.uploadCollectionImage(file));
  },
}));
