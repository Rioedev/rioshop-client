import { apiClient } from "./apiClient";
import { type ApiResponse } from "./apiTypes";
import { uploadImageToApi } from "./mediaUploadService";

export type BlogPost = {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  coverImage?: string;
  tags?: string[];
  authorName?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PaginatedBlogData = {
  docs: BlogPost[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
};

export type BlogQueryParams = {
  page?: number;
  limit?: number;
  q?: string;
  tag?: string;
  featured?: boolean;
  isPublished?: boolean | "all";
};

export type BlogPayload = {
  title: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  coverImage?: string;
  tags?: string[];
  authorName?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  publishedAt?: string;
};

export const blogService = {
  async getBlogs(params: BlogQueryParams = {}): Promise<PaginatedBlogData> {
    const response = await apiClient.get<ApiResponse<PaginatedBlogData>>("/api/blogs", {
      params,
    });

    return response.data.data;
  },

  async getBlogBySlug(slug: string): Promise<BlogPost> {
    const response = await apiClient.get<ApiResponse<BlogPost>>(`/api/blogs/${encodeURIComponent(slug)}`);
    return response.data.data;
  },

  async createBlog(payload: BlogPayload): Promise<BlogPost> {
    const response = await apiClient.post<ApiResponse<BlogPost>>("/api/blogs", payload);
    return response.data.data;
  },

  async updateBlog(id: string, payload: Partial<BlogPayload>): Promise<BlogPost> {
    const response = await apiClient.put<ApiResponse<BlogPost>>(`/api/blogs/${id}`, payload);
    return response.data.data;
  },

  async deleteBlog(id: string): Promise<void> {
    await apiClient.delete(`/api/blogs/${id}`);
  },

  async uploadBlogImage(file: File): Promise<string> {
    return uploadImageToApi("/api/blogs/upload-image", file);
  },
};
