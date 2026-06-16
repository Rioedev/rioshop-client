import { apiClient } from "./apiClient";
import type { ApiResponse } from "./apiTypes";

export type DefectiveInventoryStatus =
  | "pending_inspection"
  | "under_repair"
  | "restocked"
  | "returned_supplier"
  | "destroyed";

export type DefectiveInventoryRecord = {
  _id: string;
  sourceOrderId?: { _id?: string; orderNumber?: string } | string | null;
  sourceOrderNumber: string;
  productId?: { _id?: string; name?: string; media?: Array<{ url?: string }> } | string | null;
  productNameSnapshot: string;
  variantSku: string;
  variantLabelSnapshot: string;
  image?: string;
  quantity: number;
  reason?: string;
  evidenceImages?: string[];
  status: DefectiveInventoryStatus;
  warehouseName: string;
  locationLabel: string;
  resolutionNote?: string;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type DefectiveInventoryList = {
  docs: DefectiveInventoryRecord[];
  totalDocs: number;
  page: number;
  limit: number;
  totalPages: number;
};

export const defectiveInventoryService = {
  async list(params: { page?: number; limit?: number; status?: DefectiveInventoryStatus; q?: string } = {}) {
    const response = await apiClient.get<ApiResponse<DefectiveInventoryList>>("/api/defective-inventory", {
      params,
    });
    return response.data.data;
  },

  async updateStatus(
    id: string,
    payload: { status: DefectiveInventoryStatus; note?: string },
  ) {
    const response = await apiClient.patch<ApiResponse<DefectiveInventoryRecord>>(
      `/api/defective-inventory/${id}/status`,
      payload,
    );
    return response.data.data;
  },
};
