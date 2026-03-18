import { apiClient } from "./apiClient";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "packing"
  | "shipping"
  | "delivered"
  | "cancelled"
  | "returned";

export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";
export type PaymentMethod = "cod" | "bank_transfer" | "momo" | "vnpay" | "zalopay" | "card";

type OrderApiItem = {
  _id?: string;
  id?: string;
  orderNumber: string;
  customerSnapshot?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  items?: Array<{
    productId?: string;
    variantSku?: string;
    productName?: string;
    variantLabel?: string;
    image?: string;
    unitPrice?: number;
    quantity?: number;
    totalPrice?: number;
  }>;
  pricing?: {
    subtotal?: number;
    discount?: number;
    shippingFee?: number;
    total?: number;
    currency?: string;
  };
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  shippingMethod?: string;
  shippingCarrier?: string;
  shippingAddress?: unknown;
  status: OrderStatus;
  note?: string;
  adminNote?: string;
  timeline?: Array<{
    status?: string;
    note?: string;
    at?: string;
    by?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
};

export type OrderItem = {
  productId?: string;
  variantSku?: string;
  productName?: string;
  variantLabel?: string;
  image?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
};

export type OrderRecord = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: OrderItem[];
  pricing: {
    subtotal: number;
    discount: number;
    shippingFee: number;
    total: number;
    currency: string;
  };
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  shippingMethod?: string;
  shippingCarrier?: string;
  shippingAddress?: unknown;
  status: OrderStatus;
  note?: string;
  adminNote?: string;
  timeline: Array<{
    status?: string;
    note?: string;
    at?: string;
    by?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
};

type PaginatedOrdersApiData = {
  docs: OrderApiItem[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasPrevPage?: boolean;
  hasNextPage?: boolean;
};

export type PaginatedOrdersData = {
  docs: OrderRecord[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
};

export type GetOrdersQueryParams = {
  page?: number;
  limit?: number;
  status?: OrderStatus | "all";
  paymentStatus?: PaymentStatus | "all";
};

export type UpdateOrderStatusPayload = {
  status: OrderStatus;
  note?: string;
  paymentStatus?: PaymentStatus;
};

export type CreateOrderPayload = {
  customerSnapshot?: {
    name: string;
    email?: string;
    phone?: string;
  };
  items: Array<{
    productId: string;
    variantSku: string;
    productName: string;
    variantLabel?: string;
    image: string;
    unitPrice: number;
    quantity: number;
    totalPrice?: number;
  }>;
  shippingAddress: Record<string, unknown>;
  shippingFee?: number;
  pricing?: {
    shippingFee?: number;
    currency?: string;
  };
  couponCode?: string;
  couponDiscount?: number;
  loyaltyPointsUsed?: number;
  loyaltyPointsEarned?: number;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  shippingMethod: "standard" | "express" | "same_day";
  shippingCarrier?: string;
  note?: string;
  source?: "web" | "mobile" | "pos" | "admin";
};

const normalizeOrder = (item: OrderApiItem): OrderRecord => ({
  id: item.id ?? item._id ?? "",
  orderNumber: item.orderNumber,
  customerName: item.customerSnapshot?.name ?? "Khach hang",
  customerEmail: item.customerSnapshot?.email,
  customerPhone: item.customerSnapshot?.phone,
  items: (item.items ?? []).map((line) => ({
    productId: line.productId,
    variantSku: line.variantSku,
    productName: line.productName,
    variantLabel: line.variantLabel,
    image: line.image,
    unitPrice: line.unitPrice ?? 0,
    quantity: line.quantity ?? 0,
    totalPrice: line.totalPrice ?? 0,
  })),
  pricing: {
    subtotal: item.pricing?.subtotal ?? 0,
    discount: item.pricing?.discount ?? 0,
    shippingFee: item.pricing?.shippingFee ?? 0,
    total: item.pricing?.total ?? 0,
    currency: item.pricing?.currency ?? "VND",
  },
  paymentMethod: item.paymentMethod,
  paymentStatus: item.paymentStatus,
  shippingMethod: item.shippingMethod,
  shippingCarrier: item.shippingCarrier,
  shippingAddress: item.shippingAddress,
  status: item.status,
  note: item.note,
  adminNote: item.adminNote,
  timeline: item.timeline ?? [],
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const normalizeOrdersPage = (data: PaginatedOrdersApiData): PaginatedOrdersData => ({
  docs: data.docs.map(normalizeOrder),
  totalDocs: data.totalDocs,
  limit: data.limit,
  page: data.page,
  totalPages: data.totalPages,
  hasPrevPage: Boolean(data.hasPrevPage),
  hasNextPage: Boolean(data.hasNextPage),
});

export const orderService = {
  async getOrders(params: GetOrdersQueryParams = {}): Promise<PaginatedOrdersData> {
    const response = await apiClient.get<ApiResponse<PaginatedOrdersApiData>>("/api/orders", {
      params: {
        page: params.page,
        limit: params.limit,
        status: params.status && params.status !== "all" ? params.status : undefined,
        paymentStatus: params.paymentStatus && params.paymentStatus !== "all" ? params.paymentStatus : undefined,
      },
    });

    return normalizeOrdersPage(response.data.data);
  },

  async getOrderById(id: string): Promise<OrderRecord> {
    const response = await apiClient.get<ApiResponse<OrderApiItem>>(`/api/orders/${id}`);
    return normalizeOrder(response.data.data);
  },

  async createOrder(payload: CreateOrderPayload): Promise<OrderRecord> {
    const response = await apiClient.post<ApiResponse<OrderApiItem>>("/api/orders", payload);
    return normalizeOrder(response.data.data);
  },

  async updateOrderStatus(id: string, payload: UpdateOrderStatusPayload): Promise<OrderRecord> {
    const response = await apiClient.patch<ApiResponse<OrderApiItem>>(`/api/orders/${id}/status`, payload);
    return normalizeOrder(response.data.data);
  },

  async cancelOrder(id: string, note?: string): Promise<OrderRecord> {
    const response = await apiClient.post<ApiResponse<OrderApiItem>>(`/api/orders/${id}/cancel`, { note });
    return normalizeOrder(response.data.data);
  },
};
