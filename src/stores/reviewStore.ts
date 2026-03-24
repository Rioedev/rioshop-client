import { AxiosError } from "axios";
import { create } from "zustand";
import {
  reviewService,
  type ReviewItem,
  type ReviewStatus,
  type UpdateReviewPayload,
} from "../services/reviewService";

type ReviewStats = {
  count: number;
  avg: number;
  dist: Record<1 | 2 | 3 | 4 | 5, number>;
};

type ReviewState = {
  productId: string;
  reviews: ReviewItem[];
  stats: ReviewStats;
  loading: boolean;
  saving: boolean;
  page: number;
  pageSize: number;
  total: number;
  includePending: boolean;
  includeRejected: boolean;
  loadReviews: (params?: {
    productId?: string;
    page?: number;
    pageSize?: number;
    includePending?: boolean;
    includeRejected?: boolean;
    search?: string;
  }) => Promise<void>;
  setProductId: (productId: string) => void;
  setIncludePending: (value: boolean) => void;
  setIncludeRejected: (value: boolean) => void;
  updateReview: (id: string, payload: UpdateReviewPayload) => Promise<void>;
  updateReviewStatus: (id: string, status: ReviewStatus) => Promise<void>;
  replyReview: (id: string, body: string) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
};

const EMPTY_STATS: ReviewStats = {
  count: 0,
  avg: 0,
  dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
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

export const useReviewStore = create<ReviewState>((set, get) => ({
  productId: "",
  reviews: [],
  stats: EMPTY_STATS,
  loading: false,
  saving: false,
  page: 1,
  pageSize: 10,
  total: 0,
  includePending: true,
  includeRejected: true,

  loadReviews: async (params) => {
    const state = get();
    const nextProductId = params?.productId ?? state.productId;
    const nextPage = params?.page ?? state.page;
    const nextPageSize = params?.pageSize ?? state.pageSize;
    const nextIncludePending = params?.includePending ?? state.includePending;
    const nextIncludeRejected = params?.includeRejected ?? state.includeRejected;
    const nextSearch = params?.search ?? "";

    set({ loading: true });
    try {
      const result = await reviewService.getReviews({
        page: nextPage,
        limit: nextPageSize,
        productId: nextProductId.trim() || undefined,
        includePending: nextIncludePending,
        includeRejected: nextIncludeRejected,
        search: nextSearch.trim() || undefined,
      });

      set({
        productId: nextProductId.trim(),
        reviews: result.docs,
        stats: result.stats,
        total: result.totalDocs,
        page: result.page,
        pageSize: result.limit,
        includePending: nextIncludePending,
        includeRejected: nextIncludeRejected,
      });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ loading: false });
    }
  },

  setProductId: (productId) => set({ productId }),
  setIncludePending: (value) => set({ includePending: value }),
  setIncludeRejected: (value) => set({ includeRejected: value }),

  updateReview: async (id, payload) => {
    set({ saving: true });
    try {
      await reviewService.updateReview(id, payload);
      const state = get();
      await state.loadReviews({
        productId: state.productId,
        page: state.page,
        pageSize: state.pageSize,
        includePending: state.includePending,
        includeRejected: state.includeRejected,
      });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },

  updateReviewStatus: async (id, status) => {
    await get().updateReview(id, { status });
  },

  replyReview: async (id, body) => {
    await get().updateReview(id, { adminReply: { body } });
  },

  deleteReview: async (id) => {
    set({ saving: true });
    try {
      await reviewService.deleteReview(id);
      const state = get();
      await state.loadReviews({
        productId: state.productId,
        page: state.page,
        pageSize: state.pageSize,
        includePending: state.includePending,
        includeRejected: state.includeRejected,
      });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },
}));
