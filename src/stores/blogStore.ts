import { create } from "zustand";
import {
  blogService,
  type BlogPayload,
  type BlogPost,
} from "../services/blogService";
import { getErrorMessage } from "../utils/errorMessage";

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

    set({ loading: true });
    try {
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
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ loading: false });
    }
  },

  setKeyword: (keyword) => set({ keyword }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),

  createBlog: async (payload) => {
    set({ saving: true });
    try {
      await blogService.createBlog(payload);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },

  updateBlog: async (id, payload) => {
    set({ saving: true });
    try {
      await blogService.updateBlog(id, payload);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },

  deleteBlog: async (id) => {
    set({ saving: true });
    try {
      await blogService.deleteBlog(id);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },

  uploadBlogImage: async (file) => {
    try {
      return await blogService.uploadBlogImage(file);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
}));

