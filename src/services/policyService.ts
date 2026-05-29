import { apiClient } from "./apiClient";
import { type ApiResponse } from "./apiTypes";

export type PolicyKind = "strip" | "page";

export type Policy = {
  _id: string;
  kind: PolicyKind;
  title: string;
  slug: string;
  iconKey: string;
  summary: string;
  content: string;
  position: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PolicyPayload = {
  kind: PolicyKind;
  title: string;
  slug?: string;
  iconKey?: string;
  summary?: string;
  content?: string;
  position?: number;
  isActive?: boolean;
};

export type PolicyUpdatePayload = Partial<Omit<PolicyPayload, "kind">>;

type PolicyListResponse = {
  docs: Policy[];
  totalDocs?: number;
  totalPages?: number;
  page?: number;
  limit?: number;
};

export const policyService = {
  async listActiveByKind(kind: PolicyKind): Promise<Policy[]> {
    const response = await apiClient.get<ApiResponse<Policy[]>>(
      `/api/policies/active/${kind}`,
    );
    return response.data.data ?? [];
  },

  async getActivePageBySlug(slug: string): Promise<Policy> {
    const response = await apiClient.get<ApiResponse<Policy>>(
      `/api/policies/pages/${encodeURIComponent(slug)}`,
    );
    return response.data.data;
  },

  async list(params: {
    kind?: PolicyKind;
    isActive?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<PolicyListResponse> {
    const response = await apiClient.get<ApiResponse<PolicyListResponse>>(
      "/api/policies",
      { params },
    );
    return response.data.data;
  },

  async create(payload: PolicyPayload): Promise<Policy> {
    const response = await apiClient.post<ApiResponse<Policy>>(
      "/api/policies",
      payload,
    );
    return response.data.data;
  },

  async update(id: string, payload: PolicyUpdatePayload): Promise<Policy> {
    const response = await apiClient.put<ApiResponse<Policy>>(
      `/api/policies/${id}`,
      payload,
    );
    return response.data.data;
  },

  async remove(id: string): Promise<Policy> {
    const response = await apiClient.delete<ApiResponse<Policy>>(
      `/api/policies/${id}`,
    );
    return response.data.data;
  },
};
