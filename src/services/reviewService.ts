import { apiClient } from "./apiClient";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type ReviewStatus = "pending" | "approved" | "rejected";
export type ReviewFit = "true_to_size" | "runs_small" | "runs_large";

type ReviewUserApi = {
  _id: string;
  fullName?: string;
  avatar?: string;
};

type ReviewProductApi = {
  _id: string;
  name?: string;
  slug?: string;
};

type ReviewAdminReplyApi = {
  body: string;
  repliedAt?: string;
  adminId?: string;
};

type ReviewApiItem = {
  _id?: string;
  id?: string;
  productId: string | ReviewProductApi | null;
  userId: string | ReviewUserApi | null;
  orderId?: string;
  variantSku?: string;
  rating: number;
  title?: string;
  body: string;
  media?: string[];
  fit?: ReviewFit;
  quality?: number;
  status: ReviewStatus;
  helpfulCount?: number;
  reported?: boolean;
  adminReply?: ReviewAdminReplyApi;
  createdAt?: string;
  updatedAt?: string;
};

type ReviewStats = {
  count: number;
  avg: number;
  dist: Record<1 | 2 | 3 | 4 | 5, number>;
};

type PaginatedReviewsApiData = {
  docs: ReviewApiItem[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasPrevPage?: boolean;
  hasNextPage?: boolean;
  stats?: ReviewStats;
};

export type ReviewUser = {
  id: string;
  fullName?: string;
  avatar?: string;
};

export type ReviewProduct = {
  id: string;
  name?: string;
  slug?: string;
};

export type ReviewItem = {
  id: string;
  productId: string;
  product?: ReviewProduct;
  userId: string;
  user?: ReviewUser;
  orderId?: string;
  variantSku?: string;
  rating: number;
  title?: string;
  body: string;
  media: string[];
  fit?: ReviewFit;
  quality?: number;
  status: ReviewStatus;
  helpfulCount: number;
  reported: boolean;
  adminReply?: ReviewAdminReplyApi;
  createdAt?: string;
  updatedAt?: string;
};

export type PaginatedReviewData = {
  docs: ReviewItem[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  stats: ReviewStats;
};

export type GetReviewsQueryParams = {
  page?: number;
  limit?: number;
  productId?: string;
  includePending?: boolean;
  includeRejected?: boolean;
  search?: string;
};

export type CreateReviewPayload = {
  productId: string;
  orderId?: string;
  variantSku?: string;
  rating: number;
  title?: string;
  body: string;
  media?: string[];
  fit?: ReviewFit;
  quality?: number;
};

export type UpdateReviewPayload = Partial<{
  rating: number;
  title: string;
  body: string;
  media: string[];
  fit: ReviewFit;
  quality: number;
  status: ReviewStatus;
  reported: boolean;
  adminReply: {
    body: string;
    repliedAt?: string;
    adminId?: string;
  };
}>;

const EMPTY_STATS: ReviewStats = {
  count: 0,
  avg: 0,
  dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

const normalizeReview = (item: ReviewApiItem): ReviewItem => {
  const product = typeof item.productId === "object" && item.productId !== null ? item.productId : undefined;
  const user = typeof item.userId === "object" && item.userId !== null ? item.userId : undefined;
  const normalizedProductId = typeof item.productId === "string" ? item.productId : product?._id ?? "";
  const normalizedUserId = typeof item.userId === "string" ? item.userId : user?._id ?? "";

  return {
    id: item.id ?? item._id ?? "",
    productId: normalizedProductId,
    product: product ? { id: product._id, name: product.name, slug: product.slug } : undefined,
    userId: normalizedUserId,
    user: user ? { id: user._id, fullName: user.fullName, avatar: user.avatar } : undefined,
    orderId: item.orderId,
    variantSku: item.variantSku,
    rating: item.rating,
    title: item.title,
    body: item.body,
    media: item.media ?? [],
    fit: item.fit,
    quality: item.quality,
    status: item.status,
    helpfulCount: item.helpfulCount ?? 0,
    reported: Boolean(item.reported),
    adminReply: item.adminReply,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

const normalizeReviewPage = (data: PaginatedReviewsApiData): PaginatedReviewData => ({
  docs: data.docs.map(normalizeReview),
  totalDocs: data.totalDocs,
  limit: data.limit,
  page: data.page,
  totalPages: data.totalPages,
  hasPrevPage: Boolean(data.hasPrevPage),
  hasNextPage: Boolean(data.hasNextPage),
  stats: data.stats ?? EMPTY_STATS,
});

export const reviewService = {
  async getReviews(params: GetReviewsQueryParams = {}): Promise<PaginatedReviewData> {
    const response = await apiClient.get<ApiResponse<PaginatedReviewsApiData>>("/api/reviews", {
      params: {
        page: params.page,
        limit: params.limit,
        productId: params.productId,
        includePending: params.includePending,
        includeRejected: params.includeRejected,
        search: params.search,
      },
    });

    return normalizeReviewPage(response.data.data);
  },

  async getReviewsForProduct(productId: string, params: GetReviewsQueryParams = {}): Promise<PaginatedReviewData> {
    const response = await apiClient.get<ApiResponse<PaginatedReviewsApiData>>(
      `/api/reviews/product/${productId}`,
      {
        params: {
          page: params.page,
          limit: params.limit,
          includePending: params.includePending,
          includeRejected: params.includeRejected,
        },
      },
    );

    return normalizeReviewPage(response.data.data);
  },

  async createReview(payload: CreateReviewPayload): Promise<ReviewItem> {
    const response = await apiClient.post<ApiResponse<ReviewApiItem>>("/api/reviews", payload);
    return normalizeReview(response.data.data);
  },

  async updateReview(id: string, payload: UpdateReviewPayload): Promise<ReviewItem> {
    const response = await apiClient.put<ApiResponse<ReviewApiItem>>(`/api/reviews/${id}`, payload);
    return normalizeReview(response.data.data);
  },

  async deleteReview(id: string): Promise<ReviewItem> {
    const response = await apiClient.delete<ApiResponse<ReviewApiItem>>(`/api/reviews/${id}`);
    return normalizeReview(response.data.data);
  },
};
