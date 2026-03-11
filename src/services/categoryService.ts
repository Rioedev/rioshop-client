import { apiClient } from "./apiClient";

export type CategoryParent = {
  _id: string;
  name: string;
  slug: string;
};

export type Category = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string | CategoryParent | null;
  level: number;
  path: string;
  image?: string;
  icon?: string;
  position: number;
  isActive: boolean;
  children?: Category[];
  createdAt?: string;
  updatedAt?: string;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type PaginatedCategoryData = {
  docs: Category[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
};

export type CategoryQueryParams = {
  page?: number;
  limit?: number;
  parentId?: string;
  level?: number;
  isActive?: boolean;
};

export type CategoryPayload = {
  name: string;
  description?: string;
  parentId?: string | null;
  image?: string;
  icon?: string;
  position?: number;
  isActive?: boolean;
  seoMeta?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
};

export const categoryService = {
  async getCategories(params: CategoryQueryParams = {}): Promise<PaginatedCategoryData> {
    const response = await apiClient.get<ApiResponse<PaginatedCategoryData>>("/api/categories", {
      params,
    });
    return response.data.data;
  },

  async searchCategories(
    q: string,
    page = 1,
    limit = 10,
    isActive?: boolean,
  ): Promise<PaginatedCategoryData> {
    const response = await apiClient.get<ApiResponse<PaginatedCategoryData>>(
      "/api/categories/search",
      {
        params: { q, page, limit, isActive },
      },
    );
    return response.data.data;
  },

  async getCategoryTree(): Promise<Category[]> {
    const response = await apiClient.get<ApiResponse<Category[]>>("/api/categories/tree");
    return response.data.data;
  },

  async createCategory(payload: CategoryPayload): Promise<Category> {
    const response = await apiClient.post<ApiResponse<Category>>("/api/categories", payload);
    return response.data.data;
  },

  async updateCategory(id: string, payload: CategoryPayload): Promise<Category> {
    const response = await apiClient.put<ApiResponse<Category>>(`/api/categories/${id}`, payload);
    return response.data.data;
  },

  async deleteCategory(id: string): Promise<void> {
    await apiClient.delete(`/api/categories/${id}`);
  },

  async uploadCategoryImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<ApiResponse<{ url: string }>>(
      "/api/categories/upload-image",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data.data.url;
  },
};
