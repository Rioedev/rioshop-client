import { apiClient } from "./apiClient";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type InventoryProductApi = {
  _id: string;
  name: string;
  sku: string;
  slug?: string;
};

type InventoryApiItem = {
  _id?: string;
  id?: string;
  productId: string | InventoryProductApi;
  variantSku: string;
  warehouseId: string;
  warehouseName: string;
  onHand: number;
  reserved: number;
  available: number;
  incoming?: number;
  reorderPoint?: number | null;
  reorderQty?: number | null;
  lowStockAlert?: boolean;
  lastCountAt?: string | null;
  updatedAt?: string;
};

export type InventoryRecord = {
  id: string;
  productId: string;
  product?: InventoryProductApi;
  variantSku: string;
  warehouseId: string;
  warehouseName: string;
  onHand: number;
  reserved: number;
  available: number;
  incoming: number;
  reorderPoint?: number | null;
  reorderQty?: number | null;
  lowStockAlert: boolean;
  lastCountAt?: string | null;
  updatedAt?: string;
};

type PaginatedInventoryApiData = {
  docs: InventoryApiItem[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasPrevPage?: boolean;
  hasNextPage?: boolean;
};

type InventoryBySkuApiData = PaginatedInventoryApiData & {
  summary: {
    onHand: number;
    reserved: number;
    available: number;
    incoming: number;
  };
};

export type PaginatedInventoryData = {
  docs: InventoryRecord[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
};

export type InventoryBySkuData = PaginatedInventoryData & {
  summary: {
    onHand: number;
    reserved: number;
    available: number;
    incoming: number;
  };
};

export type GetLowStockParams = {
  page?: number;
  limit?: number;
  threshold?: number;
};

export type GetInventoryBySkuParams = {
  page?: number;
  limit?: number;
  warehouseId?: string;
};

export type UpdateInventoryPayload = Partial<{
  productId: string;
  warehouseId: string;
  warehouseName: string;
  onHand: number;
  reserved: number;
  incoming: number;
  reorderPoint: number | null;
  reorderQty: number | null;
  lowStockAlert: boolean;
  lastCountAt: string | null;
}>;

const normalizeInventoryRecord = (item: InventoryApiItem): InventoryRecord => {
  const product = typeof item.productId === "object" && item.productId !== null ? item.productId : undefined;

  return {
    id: item.id ?? item._id ?? "",
    productId: typeof item.productId === "string" ? item.productId : item.productId._id,
    product,
    variantSku: item.variantSku,
    warehouseId: item.warehouseId,
    warehouseName: item.warehouseName,
    onHand: item.onHand ?? 0,
    reserved: item.reserved ?? 0,
    available: item.available ?? 0,
    incoming: item.incoming ?? 0,
    reorderPoint: item.reorderPoint ?? null,
    reorderQty: item.reorderQty ?? null,
    lowStockAlert: Boolean(item.lowStockAlert),
    lastCountAt: item.lastCountAt ?? null,
    updatedAt: item.updatedAt,
  };
};

const normalizePaginatedData = (data: PaginatedInventoryApiData): PaginatedInventoryData => ({
  docs: data.docs.map(normalizeInventoryRecord),
  totalDocs: data.totalDocs,
  limit: data.limit,
  page: data.page,
  totalPages: data.totalPages,
  hasPrevPage: Boolean(data.hasPrevPage),
  hasNextPage: Boolean(data.hasNextPage),
});

export const inventoryService = {
  async getLowStockItems(params: GetLowStockParams = {}): Promise<PaginatedInventoryData> {
    const response = await apiClient.get<ApiResponse<PaginatedInventoryApiData>>(
      "/api/inventories",
      {
        params: {
          page: params.page,
          limit: params.limit,
          threshold: params.threshold,
        },
      },
    );

    return normalizePaginatedData(response.data.data);
  },

  async getInventoryByVariantSku(variantSku: string, params: GetInventoryBySkuParams = {}): Promise<InventoryBySkuData> {
    const response = await apiClient.get<ApiResponse<InventoryBySkuApiData>>(
      `/api/inventories/${encodeURIComponent(variantSku)}`,
      {
        params: {
          page: params.page,
          limit: params.limit,
          warehouseId: params.warehouseId,
        },
      },
    );

    const normalized = normalizePaginatedData(response.data.data);
    return {
      ...normalized,
      summary: response.data.data.summary,
    };
  },

  async updateInventory(variantSku: string, payload: UpdateInventoryPayload): Promise<InventoryRecord> {
    const response = await apiClient.put<ApiResponse<InventoryApiItem>>(
      `/api/inventories/${encodeURIComponent(variantSku)}`,
      payload,
    );

    return normalizeInventoryRecord(response.data.data);
  },
};
