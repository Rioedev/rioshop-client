import { apiClient } from "./apiClient";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type AnalyticsEventType =
  | "page_view"
  | "product_view"
  | "add_to_cart"
  | "purchase"
  | "search"
  | "click";

type AnalyticsUserApi = {
  _id: string;
  fullName?: string;
  email?: string;
};

type AnalyticsProductApi = {
  _id: string;
  name?: string;
  slug?: string;
};

type AnalyticsOrderApi = {
  _id: string;
  orderNumber?: string;
  status?: string;
  pricing?: {
    total?: number;
  };
};

type AnalyticsEventApiItem = {
  _id?: string;
  id?: string;
  event: AnalyticsEventType;
  userId?: string | AnalyticsUserApi;
  sessionId: string;
  productId?: string | AnalyticsProductApi;
  orderId?: string | AnalyticsOrderApi;
  properties?: Record<string, unknown>;
  device?: {
    type?: string;
    os?: string;
    browser?: string;
  };
  ip?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  createdAt?: string;
};

export type AnalyticsEvent = {
  id: string;
  event: AnalyticsEventType;
  user?: {
    id: string;
    fullName?: string;
    email?: string;
  };
  sessionId: string;
  product?: {
    id: string;
    name?: string;
    slug?: string;
  };
  order?: {
    id: string;
    orderNumber?: string;
    status?: string;
    total?: number;
  };
  properties?: Record<string, unknown>;
  device?: {
    type?: string;
    os?: string;
    browser?: string;
  };
  ip?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  createdAt?: string;
};

type PaginatedAnalyticsEventApiData = {
  docs: AnalyticsEventApiItem[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasPrevPage?: boolean;
  hasNextPage?: boolean;
};

export type PaginatedAnalyticsEventData = {
  docs: AnalyticsEvent[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
};

export type AnalyticsRevenueByDatePoint = {
  date: string;
  label: string;
  revenue: number;
  orders: number;
};

export type AnalyticsOrdersByDatePoint = {
  date: string;
  label: string;
  total: number;
  pending: number;
  completed: number;
  cancelled: number;
};

export type AnalyticsStatusBreakdown = {
  status: string;
  count: number;
};

export type AnalyticsPaymentMethodBreakdown = {
  method: string;
  count: number;
  revenue: number;
};

export type AnalyticsTopProductRevenue = {
  productId: string;
  name?: string;
  slug?: string;
  revenue: number;
  quantity: number;
  orders: number;
};

export type AnalyticsTopCategoryRevenue = {
  categoryId: string;
  name: string;
  revenue: number;
  quantity: number;
  orders: number;
};

export type AnalyticsDashboardData = {
  range: {
    startDate?: string;
    endDate?: string;
  };
  totals: {
    events: number;
    orders: number;
    revenue: number;
    grossRevenue?: number;
    netRevenue?: number;
  };
  summary?: {
    averageOrderValue: number;
    cancellationRate: number;
    returnRate: number;
    pendingOver24hOrders: number;
    newCustomers: number;
    returningCustomers: number;
  };
  eventsByType: Record<string, number>;
  ordersByStatus: Record<string, number>;
  statusBreakdown?: AnalyticsStatusBreakdown[];
  paymentMethods?: AnalyticsPaymentMethodBreakdown[];
  revenueByDate?: AnalyticsRevenueByDatePoint[];
  ordersByDate?: AnalyticsOrdersByDatePoint[];
  topProducts: Array<{
    _id: string;
    views: number;
    name?: string;
    slug?: string;
  }>;
  topProductsByRevenue?: AnalyticsTopProductRevenue[];
  topCategoriesByRevenue?: AnalyticsTopCategoryRevenue[];
  conversion: {
    purchases: number;
    pageViews: number;
    productViews?: number;
    addToCarts?: number;
    addToCartRate?: number;
    purchaseToViewRate: number;
    cartToPurchaseRate?: number;
  };
};

export type GetAnalyticsEventsQueryParams = {
  page?: number;
  limit?: number;
  event?: AnalyticsEventType;
  userId?: string;
  sessionId?: string;
  productId?: string;
  orderId?: string;
  startDate?: string;
  endDate?: string;
};

const normalizeEvent = (item: AnalyticsEventApiItem): AnalyticsEvent => {
  const user = typeof item.userId === "object" && item.userId !== null ? item.userId : undefined;
  const product = typeof item.productId === "object" && item.productId !== null ? item.productId : undefined;
  const order = typeof item.orderId === "object" && item.orderId !== null ? item.orderId : undefined;

  return {
    id: item.id ?? item._id ?? "",
    event: item.event,
    user: user ? { id: user._id, fullName: user.fullName, email: user.email } : undefined,
    sessionId: item.sessionId,
    product: product ? { id: product._id, name: product.name, slug: product.slug } : undefined,
    order: order ? { id: order._id, orderNumber: order.orderNumber, status: order.status, total: order.pricing?.total } : undefined,
    properties: item.properties,
    device: item.device,
    ip: item.ip,
    utm: item.utm,
    createdAt: item.createdAt,
  };
};

const normalizeEventPage = (data: PaginatedAnalyticsEventApiData): PaginatedAnalyticsEventData => ({
  docs: data.docs.map(normalizeEvent),
  totalDocs: data.totalDocs,
  limit: data.limit,
  page: data.page,
  totalPages: data.totalPages,
  hasPrevPage: Boolean(data.hasPrevPage),
  hasNextPage: Boolean(data.hasNextPage),
});

export const analyticsEventService = {
  async getAnalyticsEvents(params: GetAnalyticsEventsQueryParams = {}): Promise<PaginatedAnalyticsEventData> {
    const response = await apiClient.get<ApiResponse<PaginatedAnalyticsEventApiData>>(
      "/api/analytics/events",
      {
        params,
      },
    );

    return normalizeEventPage(response.data.data);
  },

  async getAnalyticsDashboard(params?: { startDate?: string; endDate?: string }): Promise<AnalyticsDashboardData> {
    const response = await apiClient.get<ApiResponse<AnalyticsDashboardData>>(
      "/api/analytics/dashboard",
      {
        params,
      },
    );

    return response.data.data;
  },
};
