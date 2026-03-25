import { apiClient } from "./apiClient";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

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
  isPublished?: boolean;
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
};
