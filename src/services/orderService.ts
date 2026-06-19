import { apiClient } from "./apiClient";
import { type ApiResponse } from "./apiTypes";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "packing"
  | "ready_to_ship"
  | "shipping"
  | "delivered"
  | "completed"
  | "cancelled"
  | "returned";

export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";
export type PaymentMethod = "cod" | "bank_transfer" | "momo" | "vnpay" | "zalopay" | "card";
export type ReturnRequestType = "return" | "exchange";
export type ReturnRequestStatus = "pending" | "approved" | "rejected" | "completed";
export type ReturnDisposition = "restock" | "quarantine";

export type ExchangeItemRecord = {
  productId: string;
  productName: string;
  originalVariantSku: string;
  originalVariantLabel: string;
  replacementVariantSku: string;
  replacementVariantLabel: string;
  quantity: number;
  returnDisposition: ReturnDisposition;
};

export type ReturnRequestRecord = {
  type: ReturnRequestType;
  reason: string;
  note?: string;
  images: string[];
  status: ReturnRequestStatus;
  requestedAt?: string;
  completedAt?: string;
  replacementOrderId?: string;
  replacementOrderNumber?: string;
  exchangeItems?: ExchangeItemRecord[];
};

export type ExchangeMetaRecord = {
  isReplacement: boolean;
  parentOrderId?: string;
  parentOrderNumber?: string;
};

export type CustomerOrderStatus =
  | "pending_confirmation"
  | "confirmed"
  | "packing"
  | "waiting_pickup"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled"
  | "return_in_progress"
  | "returned"
  | "issue";

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
    returnedQty?: number;
    availableVariants?: Array<{
      sku: string;
      label: string;
      size?: string;
      colorName?: string;
      stock: number;
    }>;
  }>;
  pricing?: {
    subtotal?: number;
    discount?: number;
    shippingFee?: number;
    shippingQuotedFee?: number;
    shippingCarrierFee?: number;
    shippingCustomerPaid?: number;
    shippingSubsidy?: number;
    shippingFeeStatus?: "estimated" | "confirmed" | "legacy";
    total?: number;
    currency?: string;
  };
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  shippingMethod?: string;
  shippingCarrier?: string;
  shipmentId?:
    | string
    | {
        _id?: string;
        id?: string;
        trackingCode?: string;
        status?: string;
        carrierStatus?: string;
      };
  shippingAddress?: unknown;
  status: OrderStatus;
  orderStatus?: OrderStatus;
  carrierStatus?: string;
  customerStatus?: CustomerOrderStatus;
  note?: string;
  adminNote?: string;
  timeline?: Array<{
    status?: string;
    note?: string;
    at?: string;
    by?: string;
  }>;
  returnRequest?: {
    type?: ReturnRequestType;
    reason?: string;
    note?: string;
    images?: string[];
    status?: ReturnRequestStatus;
    requestedAt?: string;
    completedAt?: string;
    replacementOrderId?: string;
    replacementOrderNumber?: string;
    exchangeItems?: ExchangeItemRecord[];
  };
  exchangeMeta?: {
    isReplacement?: boolean;
    parentOrderId?: string;
    parentOrderNumber?: string;
  };
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
  returnedQty?: number;
  availableVariants?: Array<{
    sku: string;
    label: string;
    size?: string;
    colorName?: string;
    stock: number;
  }>;
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
    shippingQuotedFee: number;
    shippingCarrierFee: number;
    shippingCustomerPaid: number;
    shippingSubsidy: number;
    shippingFeeStatus: "estimated" | "confirmed" | "legacy";
    total: number;
    currency: string;
  };
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  shippingMethod?: string;
  shippingCarrier?: string;
  shipmentId?: string;
  trackingCode?: string;
  shippingAddress?: unknown;
  status: OrderStatus;
  orderStatus?: OrderStatus;
  carrierStatus?: string;
  customerStatus?: CustomerOrderStatus;
  note?: string;
  adminNote?: string;
  timeline: Array<{
    status?: string;
    note?: string;
    at?: string;
    by?: string;
  }>;
  returnRequest?: ReturnRequestRecord;
  exchangeMeta?: ExchangeMetaRecord;
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

export type SubmitReturnRequestPayload = {
  type: "exchange";
  reason: string;
  note?: string;
  images?: string[];
};

export type UpdateReturnRequestStatusPayload = {
  status: ReturnRequestStatus;
  note?: string;
  exchangeItems?: Array<{
    productId: string;
    originalVariantSku: string;
    replacementVariantSku: string;
    quantity: number;
    returnDisposition: ReturnDisposition;
  }>;
};

export type SyncShipmentResult = {
  updated: boolean;
  reason?: string;
  trackingCode?: string;
  shipmentStatus?: string;
  carrierStatus?: string;
};

export type SyncActiveShipmentsResult = {
  total: number;
  updated: number;
  unchanged: number;
  failed: number;
  items: Array<{
    shipmentId: string;
    trackingCode?: string;
    updated: boolean;
    reason?: string;
    error?: string;
    shipmentStatus?: string;
    carrierStatus?: string;
  }>;
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

const normalizeOrder = (item: OrderApiItem): OrderRecord => {
  const toOptionalString = (value: unknown): string | undefined => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed || undefined;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }

    if (value && typeof value === "object") {
      const objectValue = value as { _id?: unknown; id?: unknown; toString?: () => string };
      if (objectValue._id !== undefined && objectValue._id !== value) {
        return toOptionalString(objectValue._id);
      }
      if (objectValue.id !== undefined && objectValue.id !== value) {
        return toOptionalString(objectValue.id);
      }
      if (typeof objectValue.toString === "function") {
        const text = objectValue.toString().trim();
        if (text && text !== "[object Object]") {
          return text;
        }
      }
    }

    return undefined;
  };

  const rawShipment =
    item.shipmentId && typeof item.shipmentId === "object" ? item.shipmentId : null;
  const shipmentId =
    (typeof item.shipmentId === "string" && item.shipmentId) ||
    rawShipment?._id ||
    rawShipment?.id ||
    undefined;

  return {
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
      returnedQty: line.returnedQty ?? 0,
      availableVariants: line.availableVariants ?? [],
    })),
    pricing: {
      subtotal: item.pricing?.subtotal ?? 0,
      discount: item.pricing?.discount ?? 0,
      shippingFee: item.pricing?.shippingFee ?? 0,
      shippingQuotedFee: item.pricing?.shippingQuotedFee ?? 0,
      shippingCarrierFee: item.pricing?.shippingCarrierFee ?? 0,
      shippingCustomerPaid: item.pricing?.shippingCustomerPaid ?? 0,
      shippingSubsidy: item.pricing?.shippingSubsidy ?? 0,
      shippingFeeStatus: item.pricing?.shippingFeeStatus ?? "legacy",
      total: item.pricing?.total ?? 0,
      currency: item.pricing?.currency ?? "VND",
    },
    paymentMethod: item.paymentMethod,
    paymentStatus: item.paymentStatus,
    shippingMethod: item.shippingMethod,
    shippingCarrier: item.shippingCarrier,
    shipmentId,
    trackingCode: rawShipment?.trackingCode,
    shippingAddress: item.shippingAddress,
    status: item.status,
    orderStatus: item.orderStatus,
    carrierStatus: item.carrierStatus || rawShipment?.carrierStatus || undefined,
    customerStatus: item.customerStatus,
    note: item.note,
    adminNote: item.adminNote,
    timeline: item.timeline ?? [],
    returnRequest: item.returnRequest
      ? {
          type: item.returnRequest.type ?? "exchange",
          reason: item.returnRequest.reason ?? "",
          note: item.returnRequest.note,
          images: item.returnRequest.images ?? [],
          status: item.returnRequest.status ?? "pending",
          requestedAt: item.returnRequest.requestedAt,
          completedAt: item.returnRequest.completedAt,
          replacementOrderId: toOptionalString(item.returnRequest.replacementOrderId),
          replacementOrderNumber: item.returnRequest.replacementOrderNumber,
          exchangeItems: item.returnRequest.exchangeItems ?? [],
        }
      : undefined,
    exchangeMeta: item.exchangeMeta
      ? {
          isReplacement: Boolean(item.exchangeMeta.isReplacement),
          parentOrderId: toOptionalString(item.exchangeMeta.parentOrderId),
          parentOrderNumber: item.exchangeMeta.parentOrderNumber,
        }
      : undefined,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

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

  async submitReturnRequest(id: string, payload: SubmitReturnRequestPayload): Promise<OrderRecord> {
    const response = await apiClient.post<ApiResponse<OrderApiItem>>(
      `/api/orders/${id}/return-request`,
      payload,
    );
    return normalizeOrder(response.data.data);
  },

  async updateReturnRequestStatus(
    id: string,
    payload: UpdateReturnRequestStatusPayload,
  ): Promise<OrderRecord> {
    const response = await apiClient.patch<ApiResponse<OrderApiItem>>(
      `/api/orders/${id}/return-request/status`,
      payload,
    );
    return normalizeOrder(response.data.data);
  },

  async uploadReturnRequestImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<ApiResponse<{ url: string }>>(
      "/api/orders/upload-return-image",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data.data.url;
  },

  async syncShipmentFromGhn(shipmentId: string): Promise<SyncShipmentResult> {
    const response = await apiClient.post<ApiResponse<SyncShipmentResult>>(
      `/api/shipments/${shipmentId}/sync-ghn`,
      {},
    );
    return response.data.data;
  },

  async syncActiveGhnShipments(limit = 20): Promise<SyncActiveShipmentsResult> {
    const response = await apiClient.post<ApiResponse<SyncActiveShipmentsResult>>(
      "/api/shipments/ghn/sync-active",
      { limit },
    );
    return response.data.data;
  },
};
