import { apiClient } from "./apiClient";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type FlashSaleProductApi = {
  _id: string;
  name?: string;
  slug?: string;
};

type FlashSaleSlotApi = {
  productId: string | FlashSaleProductApi | null;
  variantSku?: string;
  salePrice: number;
  stockLimit: number;
  sold?: number;
};

type FlashSaleApiItem = {
  _id?: string;
  id?: string;
  name: string;
  banner?: string;
  startsAt: string;
  endsAt: string;
  slots?: FlashSaleSlotApi[];
  isActive?: boolean;
  createdBy?: string;
  createdAt?: string;
};

export type FlashSaleSlot = {
  productId: string;
  product?: {
    id: string;
    name?: string;
    slug?: string;
  };
  variantSku?: string;
  salePrice: number;
  stockLimit: number;
  sold: number;
};

export type FlashSale = {
  id: string;
  name: string;
  banner?: string;
  startsAt: string;
  endsAt: string;
  slots: FlashSaleSlot[];
  isActive: boolean;
  createdBy?: string;
  createdAt?: string;
};

type PaginatedFlashSaleApiData = {
  docs: FlashSaleApiItem[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasPrevPage?: boolean;
  hasNextPage?: boolean;
};

export type PaginatedFlashSaleData = {
  docs: FlashSale[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
};

export type GetFlashSalesQueryParams = {
  page?: number;
  limit?: number;
  currentOnly?: boolean;
  isActive?: boolean;
};

export type CreateFlashSalePayload = {
  name: string;
  banner?: string | null;
  startsAt: string;
  endsAt: string;
  isActive?: boolean;
  createdBy?: string;
  slots: Array<{
    productId: string;
    variantSku?: string;
    salePrice: number;
    stockLimit: number;
    sold?: number;
  }>;
};

export type UpdateFlashSalePayload = Partial<CreateFlashSalePayload>;

const normalizeFlashSale = (item: FlashSaleApiItem): FlashSale => ({
  id: item.id ?? item._id ?? "",
  name: item.name,
  banner: item.banner,
  startsAt: item.startsAt,
  endsAt: item.endsAt,
  slots: (item.slots ?? []).reduce<FlashSaleSlot[]>((acc, slot) => {
    const rawProductId = slot.productId;
    const product =
      typeof rawProductId === "object" && rawProductId !== null
        ? rawProductId
        : undefined;
    const normalizedProductId =
      typeof rawProductId === "string"
        ? rawProductId.trim()
        : product?._id?.toString().trim() || "";

    acc.push({
      productId: normalizedProductId,
      product:
        product && product._id
          ? { id: product._id, name: product.name, slug: product.slug }
          : undefined,
      variantSku: slot.variantSku,
      salePrice: slot.salePrice,
      stockLimit: slot.stockLimit,
      sold: slot.sold ?? 0,
    });

    return acc;
  }, []),
  isActive: item.isActive ?? true,
  createdBy: item.createdBy,
  createdAt: item.createdAt,
});

const normalizeFlashSalePage = (data: PaginatedFlashSaleApiData): PaginatedFlashSaleData => ({
  docs: data.docs.map(normalizeFlashSale),
  totalDocs: data.totalDocs,
  limit: data.limit,
  page: data.page,
  totalPages: data.totalPages,
  hasPrevPage: Boolean(data.hasPrevPage),
  hasNextPage: Boolean(data.hasNextPage),
});

export const flashSaleService = {
  async getFlashSales(params: GetFlashSalesQueryParams = {}): Promise<PaginatedFlashSaleData> {
    const response = await apiClient.get<ApiResponse<PaginatedFlashSaleApiData>>(
      "/api/flash-sales",
      {
        params: {
          page: params.page,
          limit: params.limit,
          currentOnly: params.currentOnly,
          isActive: params.isActive,
        },
      },
    );

    return normalizeFlashSalePage(response.data.data);
  },

  async getFlashSaleById(id: string): Promise<FlashSale> {
    const response = await apiClient.get<ApiResponse<FlashSaleApiItem>>(`/api/flash-sales/${id}`);
    return normalizeFlashSale(response.data.data);
  },

  async createFlashSale(payload: CreateFlashSalePayload): Promise<FlashSale> {
    const response = await apiClient.post<ApiResponse<FlashSaleApiItem>>("/api/flash-sales", payload);
    return normalizeFlashSale(response.data.data);
  },

  async updateFlashSale(id: string, payload: UpdateFlashSalePayload): Promise<FlashSale> {
    const response = await apiClient.put<ApiResponse<FlashSaleApiItem>>(`/api/flash-sales/${id}`, payload);
    return normalizeFlashSale(response.data.data);
  },

  async deleteFlashSale(id: string): Promise<FlashSale> {
    const response = await apiClient.delete<ApiResponse<FlashSaleApiItem>>(`/api/flash-sales/${id}`);
    return normalizeFlashSale(response.data.data);
  },
};
