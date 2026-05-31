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
};

export type TopProductRow = {
  productId: string;
  productName: string;
  slug?: string;
  image?: string;
  categoryName?: string;
  quantitySold: number;
  revenue: number;
  orderCount: number;
  currentStock?: number;
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
    options: { limit?: number; sortBy?: "revenue" | "quantity" } = {},
  ): Promise<TopProductRow[]> {
    const { data } = await apiClient.get<Resp<{ rows: TopProductRow[] }>>(
      `/api/reports/top-products${buildParams(period, { limit: options.limit ?? 20, sortBy: options.sortBy ?? "revenue" })}`,
    );
    return data.data.rows;
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
    granularity: "day" | "week" | "month" = "day",
  ): Promise<RevenueTimeSeriesRow[]> {
    const { data } = await apiClient.get<Resp<{ rows: RevenueTimeSeriesRow[] }>>(
      `/api/reports/revenue-timeseries${buildParams(period, { granularity })}`,
    );
    return data.data.rows;
  },
};
