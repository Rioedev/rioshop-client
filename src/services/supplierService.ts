import { apiClient } from "./apiClient";
import { type ApiResponse } from "./apiTypes";

export type SupplierType = "internal" | "external";

export const SUPPLIER_TYPE_LABEL: Record<SupplierType, string> = {
  internal: "Sản xuất nội bộ",
  external: "Mua ngoài",
};

export type Supplier = {
  _id: string;
  name: string;
  type: SupplierType;
  phone: string;
  email: string;
  address: string;
  note: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SupplierPayload = {
  name: string;
  type?: SupplierType;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
  isActive?: boolean;
};

type ListResp = {
  docs: Supplier[];
  totalDocs: number;
  page: number;
  limit: number;
  totalPages: number;
};

export const supplierService = {
  async list(params: { page?: number; limit?: number; search?: string; isActive?: boolean; type?: SupplierType } = {}): Promise<ListResp> {
    const sp = new URLSearchParams();
    if (params.page) sp.set("page", String(params.page));
    if (params.limit) sp.set("limit", String(params.limit));
    if (params.search) sp.set("search", params.search);
    if (params.isActive !== undefined) sp.set("isActive", String(params.isActive));
    if (params.type) sp.set("type", params.type);
    const qs = sp.toString();
    const { data } = await apiClient.get<ApiResponse<ListResp>>(`/api/suppliers${qs ? `?${qs}` : ""}`);
    return data.data;
  },

  async create(payload: SupplierPayload): Promise<Supplier> {
    const { data } = await apiClient.post<ApiResponse<Supplier>>("/api/suppliers", payload);
    return data.data;
  },

  async update(id: string, payload: Partial<SupplierPayload>): Promise<Supplier> {
    const { data } = await apiClient.put<ApiResponse<Supplier>>(`/api/suppliers/${id}`, payload);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/api/suppliers/${id}`);
  },
};
