import { create } from "zustand";
import {
  blogService,
  type BlogPayload,
  type BlogPost,
} from "../services/blogService";
import { runStoreTask, runStoreTaskWithFlag } from "./storeAsync";

export type BlogStatusFilter = "all" | "published" | "unpublished";

type BlogState = {
  blogs: BlogPost[];
  loading: boolean;
  saving: boolean;
  page: number;
  pageSize: number;
  total: number;
  keyword: string;
  statusFilter: BlogStatusFilter;
  loadBlogs: (params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    statusFilter?: BlogStatusFilter;
  }) => Promise<void>;
  setKeyword: (keyword: string) => void;
  setStatusFilter: (statusFilter: BlogStatusFilter) => void;
  createBlog: (payload: BlogPayload) => Promise<void>;
  updateBlog: (id: string, payload: Partial<BlogPayload>) => Promise<void>;
  deleteBlog: (id: string) => Promise<void>;
  uploadBlogImage: (file: File) => Promise<string>;
};

const resolvePublishedFilter = (value: BlogStatusFilter): boolean | "all" => {
  if (value === "published") {
    return true;
  }

  if (value === "unpublished") {
    return false;
  }

  return "all";
};

export const useBlogStore = create<BlogState>((set, get) => ({
  blogs: [],
  loading: false,
  saving: false,
  page: 1,
  pageSize: 10,
  total: 0,
  keyword: "",
  statusFilter: "all",

  loadBlogs: async (params) => {
    const state = get();
    const nextPage = params?.page ?? state.page;
    const nextPageSize = params?.pageSize ?? state.pageSize;
    const nextKeyword = params?.keyword ?? state.keyword;
    const nextStatusFilter = params?.statusFilter ?? state.statusFilter;
    const query = nextKeyword.trim();

    await runStoreTaskWithFlag(set, "loading", async () => {
      const result = await blogService.getBlogs({
        page: nextPage,
        limit: nextPageSize,
        q: query || undefined,
        isPublished: resolvePublishedFilter(nextStatusFilter),
      });

      set({
        blogs: result.docs,
        page: result.page,
        pageSize: result.limit,
        total: result.totalDocs,
        keyword: nextKeyword,
        statusFilter: nextStatusFilter,
      });
    });
  },

  setKeyword: (keyword) => set({ keyword }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),

  createBlog: async (payload) => {
    await runStoreTaskWithFlag(set, "saving", async () => {
      await blogService.createBlog(payload);
    });
  },

  updateBlog: async (id, payload) => {
    await runStoreTaskWithFlag(set, "saving", async () => {
      await blogService.updateBlog(id, payload);
    });
  },

  deleteBlog: async (id) => {
    await runStoreTaskWithFlag(set, "saving", async () => {
      await blogService.deleteBlog(id);
    });
  },

  uploadBlogImage: async (file) => {
    return runStoreTask(() => blogService.uploadBlogImage(file));
  },
}));
