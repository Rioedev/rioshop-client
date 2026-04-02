import { apiClient } from "./apiClient";
import { type ApiResponse } from "./apiTypes";
import { uploadImageToApi } from "./mediaUploadService";

export type Collection = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  bannerImage?: string;
  position: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type PaginatedCollectionData = {
  docs: Collection[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
};

export type CollectionQueryParams = {
  page?: number;
  limit?: number;
  isActive?: boolean;
};

export type CollectionPayload = {
  name: string;
  description?: string;
  image?: string;
  bannerImage?: string;
  position?: number;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  seoMeta?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
};

export const collectionService = {
  async getCollections(params: CollectionQueryParams = {}): Promise<PaginatedCollectionData> {
    const response = await apiClient.get<ApiResponse<PaginatedCollectionData>>("/api/collections", {
      params,
    });
    return response.data.data;
  },

  async searchCollections(
    q: string,
    page = 1,
    limit = 10,
    isActive?: boolean,
  ): Promise<PaginatedCollectionData> {
    const response = await apiClient.get<ApiResponse<PaginatedCollectionData>>(
      "/api/collections/search",
      {
        params: { q, page, limit, isActive },
      },
    );
    return response.data.data;
  },

  async createCollection(payload: CollectionPayload): Promise<Collection> {
    const response = await apiClient.post<ApiResponse<Collection>>("/api/collections", payload);
    return response.data.data;
  },

  async updateCollection(id: string, payload: CollectionPayload): Promise<Collection> {
    const response = await apiClient.put<ApiResponse<Collection>>(`/api/collections/${id}`, payload);
    return response.data.data;
  },

  async deleteCollection(id: string): Promise<void> {
    await apiClient.delete(`/api/collections/${id}`);
  },

  async uploadCollectionImage(file: File): Promise<string> {
    return uploadImageToApi("/api/collections/upload-image", file);
  },
};
