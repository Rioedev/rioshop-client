import { apiClient } from "./apiClient";
import { type ApiResponse } from "./apiTypes";

export type AdjustReason = "stocktake_diff" | "damaged" | "lost" | "other" | "purchase_receipt";

export const ADJUST_REASON_LABEL: Record<AdjustReason, string> = {
  purchase_receipt: "Nhập từ PO",
  stocktake_diff: "Kiểm kê lệch",
  damaged: "Hư hỏng",
  lost: "Mất hàng",
  other: "Khác",
};

export const ADJUST_REASON_COLOR: Record<AdjustReason, string> = {
  purchase_receipt: "green",
  stocktake_diff: "blue",
  damaged: "orange",
  lost: "red",
  other: "default",
};

export type AdjustmentRow = {
  _id: string;
  batchId: string;
  productId: { _id: string; name?: string; slug?: string; media?: Array<{ url?: string }> } | string;
  productNameSnapshot: string;
  variantSku: string;
  variantLabelSnapshot: string;
  qtyDelta: number;
  unitCost: number;
  stockBefore: number;
  stockAfter: number;
  costBefore: number;
  costAfter: number;
  reason: AdjustReason;
  purchaseOrderId?: { _id: string; poNumber: string } | string | null;
  supplierId?: { _id: string; name: string; type?: "internal" | "external" } | string | null;
  supplierName: string;
  note: string;
  createdBy?: { _id: string; fullName?: string; email?: string } | string | null;
  createdByName: string;
  createdAt: string;
};

export type AdjustPayload = {
  productId: string;
  reason: Exclude<AdjustReason, "purchase_receipt">;
  note?: string;
  lines: Array<{ variantSku: string; qtyDelta: number }>;
};

type ListResp = {
  docs: AdjustmentRow[];
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

export const inventoryAdjustmentService = {
  async adjust(payload: AdjustPayload) {
    const { data } = await apiClient.post<
      ApiResponse<{ batchId: string; productId: string; reason: AdjustReason; lineCount: number }>
    >("/api/inventory-adjustments", payload);
    return data.data;
  },

  async list(params: {
    page?: number;
    limit?: number;
    productId?: string;
    reason?: AdjustReason;
    from?: string;
    to?: string;
  } = {}): Promise<ListResp> {
    const { data } = await apiClient.get<ApiResponse<ListResp>>(
      `/api/inventory-adjustments${buildQs(params)}`,
    );
    return data.data;
  },
};
