import { apiClient } from "./apiClient";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type CouponType = "percent" | "fixed" | "free_ship" | "gift";
export type CouponSource = "campaign" | "referral" | "birthday" | "manual";

type CouponApiItem = {
  _id?: string;
  id?: string;
  code: string;
  name: string;
  description?: string;
  type: CouponType;
  value: number;
  maxDiscount?: number;
  minOrderValue?: number;
  usageLimit?: number;
  perUserLimit?: number;
  usageCount?: number;
  isActive: boolean;
  startsAt: string;
  expiresAt: string;
  source?: CouponSource;
  createdAt?: string;
};

export type Coupon = {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: CouponType;
  value: number;
  maxDiscount?: number;
  minOrderValue?: number;
  usageLimit?: number;
  perUserLimit?: number;
  usageCount: number;
  isActive: boolean;
  startsAt: string;
  expiresAt: string;
  source?: CouponSource;
  createdAt?: string;
};

type PaginatedCouponApiData = {
  docs: CouponApiItem[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasPrevPage?: boolean;
  hasNextPage?: boolean;
};

export type PaginatedCouponData = {
  docs: Coupon[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
};

export type ValidateCouponPayload = {
  code: string;
  orderValue: number;
  shippingFee?: number;
  userId?: string;
  productIds?: string[];
  categoryIds?: string[];
  brandNames?: string[];
};

type CouponValidationApiResult = {
  isValid: boolean;
  reason: string | null;
  coupon: CouponApiItem | null;
  discount: number;
  finalAmount: number;
};

export type CouponValidationResult = {
  isValid: boolean;
  reason: string | null;
  coupon: Coupon | null;
  discount: number;
  finalAmount: number;
};

export type GetAdminCouponsParams = {
  page?: number;
  limit?: number;
  keyword?: string;
  type?: CouponType | "all";
  isActive?: "all" | "active" | "inactive";
};

export type GetActiveCouponsParams = {
  page?: number;
  limit?: number;
};

export type CouponUpsertPayload = {
  code: string;
  name: string;
  description?: string;
  type: CouponType;
  value: number;
  maxDiscount?: number | null;
  minOrderValue?: number | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  isActive?: boolean;
  startsAt: string;
  expiresAt: string;
  source?: CouponSource;
};

export type CouponUpdatePayload = Partial<CouponUpsertPayload>;

const normalizeCoupon = (item: CouponApiItem): Coupon => ({
  id: item.id ?? item._id ?? "",
  code: item.code,
  name: item.name,
  description: item.description,
  type: item.type,
  value: item.value,
  maxDiscount: item.maxDiscount,
  minOrderValue: item.minOrderValue,
  usageLimit: item.usageLimit,
  perUserLimit: item.perUserLimit,
  usageCount: item.usageCount ?? 0,
  isActive: item.isActive,
  startsAt: item.startsAt,
  expiresAt: item.expiresAt,
  source: item.source,
  createdAt: item.createdAt,
});

const normalizePaginatedData = (data: PaginatedCouponApiData): PaginatedCouponData => ({
  docs: data.docs.map(normalizeCoupon),
  totalDocs: data.totalDocs,
  limit: data.limit,
  page: data.page,
  totalPages: data.totalPages,
  hasPrevPage: Boolean(data.hasPrevPage),
  hasNextPage: Boolean(data.hasNextPage),
});

const normalizeValidation = (data: CouponValidationApiResult): CouponValidationResult => ({
  isValid: data.isValid,
  reason: data.reason,
  coupon: data.coupon ? normalizeCoupon(data.coupon) : null,
  discount: data.discount,
  finalAmount: data.finalAmount,
});

export const couponService = {
  async getActiveCoupons(params: GetActiveCouponsParams = {}): Promise<PaginatedCouponData> {
    const response = await apiClient.get<ApiResponse<PaginatedCouponApiData>>("/api/coupons", {
      params: {
        page: params.page,
        limit: params.limit,
      },
    });

    return normalizePaginatedData(response.data.data);
  },

  async getMyAvailableCoupons(params: GetActiveCouponsParams = {}): Promise<PaginatedCouponData> {
    const response = await apiClient.get<ApiResponse<PaginatedCouponApiData>>(
      "/api/coupons/me/available",
      {
        params: {
          page: params.page,
          limit: params.limit,
        },
      },
    );

    return normalizePaginatedData(response.data.data);
  },

  async getAdminCoupons(params: GetAdminCouponsParams = {}): Promise<PaginatedCouponData> {
    const response = await apiClient.get<ApiResponse<PaginatedCouponApiData>>("/api/coupons/admin", {
      params: {
        page: params.page,
        limit: params.limit,
        keyword: params.keyword?.trim() || undefined,
        type: params.type && params.type !== "all" ? params.type : undefined,
        isActive:
          params.isActive === "all" || params.isActive === undefined
            ? undefined
            : params.isActive === "active",
      },
    });

    return normalizePaginatedData(response.data.data);
  },

  async createCoupon(payload: CouponUpsertPayload): Promise<Coupon> {
    const response = await apiClient.post<ApiResponse<CouponApiItem>>("/api/coupons/admin", payload);
    return normalizeCoupon(response.data.data);
  },

  async updateCoupon(id: string, payload: CouponUpdatePayload): Promise<Coupon> {
    const response = await apiClient.put<ApiResponse<CouponApiItem>>(`/api/coupons/admin/${id}`, payload);
    return normalizeCoupon(response.data.data);
  },

  async deleteCoupon(id: string): Promise<Coupon> {
    const response = await apiClient.delete<ApiResponse<CouponApiItem>>(`/api/coupons/admin/${id}`);
    return normalizeCoupon(response.data.data);
  },

  async getCouponByCode(code: string): Promise<Coupon> {
    const response = await apiClient.get<ApiResponse<CouponApiItem>>(
      `/api/coupons/${encodeURIComponent(code.trim())}`,
    );

    return normalizeCoupon(response.data.data);
  },

  async validateCoupon(payload: ValidateCouponPayload): Promise<CouponValidationResult> {
    const response = await apiClient.post<ApiResponse<CouponValidationApiResult>>(
      "/api/coupons/validate",
      payload,
    );

    return normalizeValidation(response.data.data);
  },
};
