import { apiClient } from "./apiClient";
import { type ApiResponse } from "./apiTypes";

export type POStatus =
  | "draft"
  | "ordered"
  | "partially_received"
  | "received"
  | "cancelled"
  | "closed";

export const PO_STATUS_LABEL: Record<POStatus, string> = {
  draft: "Nháp",
  ordered: "Đã đặt",
  partially_received: "Nhận một phần",
  received: "Đã nhận đủ",
  cancelled: "Đã hủy",
  closed: "Đã đóng (nhận một phần)",
};

export const PO_STATUS_COLOR: Record<POStatus, string> = {
  draft: "default",
  ordered: "blue",
  partially_received: "gold",
  received: "green",
  cancelled: "red",
  closed: "default",
};

export type POLine = {
  productId: string;
  productNameSnapshot: string;
  variantSku: string;
  variantLabelSnapshot: string;
  orderedQty: number;
  receivedQty: number;
  unitCost: number;
  lineTotal: number;
};

export type POReceiptLine = {
  variantSku: string;
  qty: number;
  unitCost: number;
};

export type POReceipt = {
  receivedAt: string;
  receivedByName: string;
  lines: POReceiptLine[];
  note: string;
};

export type POTimelineEntry = {
  status: string;
  note: string;
  at: string;
  byName: string;
};

export type PurchaseOrder = {
  _id: string;
  poNumber: string;
  supplierId:
    | string
    | { _id: string; name: string; type: "internal" | "external"; phone?: string; email?: string };
  supplierNameSnapshot: string;
  supplierType: "internal" | "external";
  status: POStatus;
  expectedDeliveryDate?: string | null;
  orderedAt?: string | null;
  receivedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string;
  lines: POLine[];
  receipts: POReceipt[];
  subtotal: number;
  tax: number;
  total: number;
  note: string;
  createdByName: string;
  timeline: POTimelineEntry[];
  createdAt: string;
  updatedAt: string;
};

export type POCreatePayload = {
  supplierId: string;
  expectedDeliveryDate?: string | null;
  note?: string;
  lines: Array<{
    productId: string;
    variantSku: string;
    orderedQty: number;
    unitCost: number;
  }>;
};

export type POReceivePayload = {
  note?: string;
  lines: Array<{ variantSku: string; qty: number; unitCost?: number }>;
};

type ListResp = {
  docs: PurchaseOrder[];
  totalDocs: number;
  page: number;
  limit: number;
  totalPages: number;
};

const buildQs = (params: Record<string, string | number | undefined>) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      sp.set(key, String(value));
    }
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
};

export const purchaseOrderService = {
  async list(params: {
    page?: number;
    limit?: number;
    status?: POStatus;
    supplierId?: string;
    search?: string;
    from?: string;
    to?: string;
  } = {}): Promise<ListResp> {
    const { data } = await apiClient.get<ApiResponse<ListResp>>(
      `/api/purchase-orders${buildQs(params)}`,
    );
    return data.data;
  },

  async getById(id: string): Promise<PurchaseOrder> {
    const { data } = await apiClient.get<ApiResponse<PurchaseOrder>>(`/api/purchase-orders/${id}`);
    return data.data;
  },

  async create(payload: POCreatePayload): Promise<PurchaseOrder> {
    const { data } = await apiClient.post<ApiResponse<PurchaseOrder>>(
      "/api/purchase-orders",
      payload,
    );
    return data.data;
  },

  async update(id: string, payload: Partial<POCreatePayload>): Promise<PurchaseOrder> {
    const { data } = await apiClient.put<ApiResponse<PurchaseOrder>>(
      `/api/purchase-orders/${id}`,
      payload,
    );
    return data.data;
  },

  async confirm(id: string): Promise<PurchaseOrder> {
    const { data } = await apiClient.post<ApiResponse<PurchaseOrder>>(
      `/api/purchase-orders/${id}/confirm`,
    );
    return data.data;
  },

  async cancel(id: string, reason?: string): Promise<PurchaseOrder> {
    const { data } = await apiClient.post<ApiResponse<PurchaseOrder>>(
      `/api/purchase-orders/${id}/cancel`,
      { reason },
    );
    return data.data;
  },

  async receive(id: string, payload: POReceivePayload): Promise<PurchaseOrder> {
    const { data } = await apiClient.post<ApiResponse<PurchaseOrder>>(
      `/api/purchase-orders/${id}/receive`,
      payload,
    );
    return data.data;
  },
};
