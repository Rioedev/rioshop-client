import { apiClient } from "./apiClient";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type CustomerApiItem = {
  _id?: string;
  id?: string;
  email: string;
  phone: string;
  fullName: string;
  status: CustomerStatus;
  isDeleted?: boolean;
  deletedAt?: string | null;
  totalOrders?: number;
  totalSpend?: number;
  loyalty?: {
    tier?: "bronze" | "silver" | "gold" | "platinum";
    points?: number;
    lifetimePoints?: number;
    summary?: {
      currentTier?: "bronze" | "silver" | "gold" | "platinum";
      nextTier?: "bronze" | "silver" | "gold" | "platinum" | null;
      pointsToNextTier?: number;
      progressToNextTier?: number;
    };
  };
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type PaginatedCustomerApiData = {
  docs: CustomerApiItem[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasPrevPage?: boolean;
  hasNextPage?: boolean;
};

export type CustomerStatus = "active" | "banned" | "inactive";
export type CustomerStatusFilter = CustomerStatus | "all";
export type CustomerLoyaltyTier = "bronze" | "silver" | "gold" | "platinum";
export type CustomerLoyaltyTierFilter = CustomerLoyaltyTier | "all";

export type CustomerUser = {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  status: CustomerStatus;
  isDeleted: boolean;
  deletedAt?: string;
  totalOrders: number;
  totalSpend: number;
  loyalty: {
    tier: "bronze" | "silver" | "gold" | "platinum";
    points: number;
    lifetimePoints: number;
    summary?: {
      currentTier: "bronze" | "silver" | "gold" | "platinum";
      nextTier?: "bronze" | "silver" | "gold" | "platinum" | null;
      pointsToNextTier: number;
      progressToNextTier: number;
    };
  };
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PaginatedCustomerData = {
  docs: CustomerUser[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
};

export type CustomerQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: CustomerStatusFilter;
  loyaltyTier?: CustomerLoyaltyTierFilter;
  isDeleted?: boolean;
};

export type CreateCustomerPayload = {
  email: string;
  phone: string;
  password: string;
  fullName: string;
  status?: CustomerStatus;
};

export type UpdateCustomerPayload = Partial<
  Omit<CreateCustomerPayload, "password"> & {
    status: CustomerStatus;
  }
>;

const normalizeCustomer = (item: CustomerApiItem): CustomerUser => ({
  id: item.id ?? item._id ?? "",
  email: item.email,
  phone: item.phone,
  fullName: item.fullName,
  status: item.status,
  isDeleted: item.isDeleted ?? false,
  deletedAt: item.deletedAt ?? undefined,
  totalOrders: item.totalOrders ?? 0,
  totalSpend: item.totalSpend ?? 0,
  loyalty: {
    tier: item.loyalty?.tier ?? "bronze",
    points: Number(item.loyalty?.points ?? 0),
    lifetimePoints: Number(item.loyalty?.lifetimePoints ?? 0),
    summary: item.loyalty?.summary
      ? {
          currentTier: item.loyalty.summary.currentTier ?? item.loyalty.tier ?? "bronze",
          nextTier: item.loyalty.summary.nextTier ?? null,
          pointsToNextTier: Number(item.loyalty.summary.pointsToNextTier ?? 0),
          progressToNextTier: Number(item.loyalty.summary.progressToNextTier ?? 0),
        }
      : undefined,
  },
  lastLoginAt: item.lastLoginAt,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

export const customerUserService = {
  async getCustomers(params: CustomerQueryParams = {}): Promise<PaginatedCustomerData> {
    const response = await apiClient.get<ApiResponse<PaginatedCustomerApiData>>("/api/admins/users", {
      params: {
        page: params.page,
        limit: params.limit,
        search: params.search?.trim() || undefined,
        status: params.status && params.status !== "all" ? params.status : undefined,
        loyaltyTier:
          params.loyaltyTier && params.loyaltyTier !== "all" ? params.loyaltyTier : undefined,
        isDeleted: params.isDeleted,
      },
    });

    return {
      ...response.data.data,
      docs: response.data.data.docs.map(normalizeCustomer),
      hasPrevPage: Boolean(response.data.data.hasPrevPage),
      hasNextPage: Boolean(response.data.data.hasNextPage),
    };
  },

  async getCustomerById(id: string): Promise<CustomerUser> {
    const response = await apiClient.get<ApiResponse<CustomerApiItem>>(`/api/admins/users/${id}`);
    return normalizeCustomer(response.data.data);
  },

  async createCustomer(payload: CreateCustomerPayload): Promise<CustomerUser> {
    const response = await apiClient.post<ApiResponse<CustomerApiItem>>("/api/admins/users", payload);
    return normalizeCustomer(response.data.data);
  },

  async updateCustomer(id: string, payload: UpdateCustomerPayload): Promise<CustomerUser> {
    const response = await apiClient.put<ApiResponse<CustomerApiItem>>(`/api/admins/users/${id}`, payload);
    return normalizeCustomer(response.data.data);
  },

  async updateCustomerStatus(id: string, status: CustomerStatus): Promise<CustomerUser> {
    const response = await apiClient.patch<ApiResponse<CustomerApiItem>>(`/api/admins/users/${id}/status`, {
      status,
    });
    return normalizeCustomer(response.data.data);
  },

  async softDeleteCustomer(id: string): Promise<CustomerUser> {
    const response = await apiClient.delete<ApiResponse<CustomerApiItem>>(`/api/admins/users/${id}`);
    return normalizeCustomer(response.data.data);
  },
};
