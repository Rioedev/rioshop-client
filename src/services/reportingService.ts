import { apiClient } from "./apiClient";
import { type ApiResponse } from "./apiTypes";

export type ReportPeriod = {
  from?: string;
  to?: string;
};

export type ReportingOverview = {
  revenue: number;
  orderCount: number;
  itemCount: number;
  uniqueCustomerCount: number;
  avgOrderValue: number;
  cost: number;
  grossProfit: number;
  marginRate: number;
  shippingQuotedFee: number;
  shippingCarrierFee: number;
  shippingCustomerPaid: number;
  shippingSubsidy: number;
  shippingNetCost: number;
  shippingTrackedOrderCount: number;
  shippingUntrackedOrderCount: number;
  profitAfterShipping: number;
  profitAfterShippingMarginRate: number;
};

export type TopProductRow = {
  productId: string;
  productName: string;
  slug?: string;
  image?: string;
  categoryName?: string;
  quantitySold: number;
  revenue: number;
  cost: number;
  grossProfit: number;
  marginRate: number;
  orderCount: number;
  currentStock?: number;
};

export type PurchaseOrderOverview = {
  draft: { count: number; total: number };
  ordered: { count: number; total: number };
  partially_received: { count: number; total: number };
  received: { count: number; total: number };
  cancelled: { count: number; total: number };
  closed: { count: number; total: number };
};

export type RevenueByCategoryRow = {
  categoryId?: string;
  categoryName: string;
  revenue: number;
  quantitySold: number;
};

export type RevenueByCollectionRow = {
  collectionId?: string;
  collectionName: string;
  revenue: number;
  quantitySold: number;
};

export type RevenueTimeSeriesRow = {
  period: string;
  revenue: number;
  orderCount: number;
};

export type RevenueByFlashSaleRow = {
  flashSaleId: string;
  name: string;
  banner?: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  slotCount: number;
  stockLimit: number;
  recordedSold: number;
  productCount: number;
  quantitySold: number;
  orderCount: number;
  revenue: number;
  discountAmount: number;
  cost: number;
  grossProfit: number;
  marginRate: number;
};

export type PaginatedReport<T> = {
  rows: T[];
  totalDocs: number;
  page: number;
  limit: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
};

type Resp<T> = ApiResponse<T>;

const buildParams = (period: ReportPeriod, extra?: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams();
  if (period.from) params.set("from", period.from);
  if (period.to) params.set("to", period.to);
  if (extra) {
    Object.entries(extra).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    });
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

export const reportingService = {
  async getOverview(period: ReportPeriod = {}): Promise<ReportingOverview> {
    const { data } = await apiClient.get<Resp<ReportingOverview>>(`/api/reports/overview${buildParams(period)}`);
    return data.data;
  },

  async getTopProducts(
    period: ReportPeriod = {},
    options: { page?: number; limit?: number; sortBy?: "revenue" | "quantity" | "grossProfit"; search?: string } = {},
  ): Promise<PaginatedReport<TopProductRow>> {
    const { data } = await apiClient.get<Resp<PaginatedReport<TopProductRow>>>(
      `/api/reports/top-products${buildParams(period, {
        page: options.page ?? 1,
        limit: options.limit ?? 10,
        sortBy: options.sortBy ?? "revenue",
        search: options.search,
      })}`,
    );
    return data.data;
  },

  async getRevenueByFlashSale(
    period: ReportPeriod = {},
    options: { page?: number; limit?: number; sortBy?: "revenue" | "quantity" | "grossProfit" } = {},
  ): Promise<PaginatedReport<RevenueByFlashSaleRow>> {
    const { data } = await apiClient.get<Resp<PaginatedReport<RevenueByFlashSaleRow>>>(
      `/api/reports/revenue-by-flash-sale${buildParams(period, {
        page: options.page ?? 1,
        limit: options.limit ?? 10,
        sortBy: options.sortBy ?? "revenue",
      })}`,
    );
    return data.data;
  },

  async getPurchaseOrderOverview(period: ReportPeriod = {}): Promise<PurchaseOrderOverview> {
    const { data } = await apiClient.get<Resp<PurchaseOrderOverview>>(
      `/api/reports/purchase-orders/overview${buildParams(period)}`,
    );
    return data.data;
  },

  async getRevenueByCategory(period: ReportPeriod = {}): Promise<RevenueByCategoryRow[]> {
    const { data } = await apiClient.get<Resp<{ rows: RevenueByCategoryRow[] }>>(
      `/api/reports/revenue-by-category${buildParams(period)}`,
    );
    return data.data.rows;
  },

  async getRevenueByCollection(period: ReportPeriod = {}): Promise<RevenueByCollectionRow[]> {
    const { data } = await apiClient.get<Resp<{ rows: RevenueByCollectionRow[] }>>(
      `/api/reports/revenue-by-collection${buildParams(period)}`,
    );
    return data.data.rows;
  },

  async getRevenueTimeSeries(
    period: ReportPeriod = {},
    granularity: "day" | "week" | "month" | "quarter" = "day",
  ): Promise<RevenueTimeSeriesRow[]> {
    const { data } = await apiClient.get<Resp<{ rows: RevenueTimeSeriesRow[] }>>(
      `/api/reports/revenue-timeseries${buildParams(period, { granularity })}`,
    );
    return data.data.rows;
  },

  async exportSalesReportXlsx(
    period: ReportPeriod = {},
    options: { granularity?: "day" | "week" | "month" | "quarter"; allTime?: boolean } = {},
  ): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      `/api/reports/export-xlsx${buildParams(options.allTime ? {} : period, {
        granularity: options.granularity ?? "month",
        allTime: options.allTime ? "true" : undefined,
      })}`,
      { responseType: "blob" },
    );
    return response.data;
  },
};
