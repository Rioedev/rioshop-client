import { apiClient } from "./apiClient";

export type ProductStatus = "draft" | "active" | "archived" | "out_of_stock";
export type ProductStatusFilter = ProductStatus | "all";
export type ProductGender = "men" | "women" | "unisex" | "kids";
export type ProductMediaType = "image" | "video" | "360";
export type ProductVariantSize = "XS" | "S" | "M" | "L" | "XL" | "2XL" | "3XL";

export type ProductVariant = {
  variantId: string;
  sku: string;
  color?: {
    name?: string;
    hex?: string;
    imageUrl?: string;
  };
  size: ProductVariantSize;
  sizeLabel?: string;
  additionalPrice?: number;
  barcode?: string;
  images?: string[];
  isActive?: boolean;
  position?: number;
};

export type ProductMedia = {
  url: string;
  type: ProductMediaType;
  altText?: string;
  colorRef?: string;
  isPrimary?: boolean;
  position?: number;
};

export type Product = {
  _id: string;
  sku: string;
  slug: string;
  name: string;
  brand: string;
  description?: string;
  shortDescription?: string;
  category?: {
    _id: string;
    name: string;
    slug?: string;
  } | null;
  gender?: ProductGender;
  pricing: {
    basePrice: number;
    salePrice: number;
    currency?: string;
  };
  inventorySummary?: {
    total?: number;
    available?: number;
    reserved?: number;
  };
  variants?: ProductVariant[];
  media?: ProductMedia[];
  tags?: string[];
  ageGroup?: "adult" | "teen" | "kids" | "baby";
  material?: string[];
  care?: string[];
  seoMeta?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  isFeatured?: boolean;
  isNew?: boolean;
  isBestseller?: boolean;
  status: ProductStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductPayload = {
  sku: string;
  slug: string;
  name: string;
  brand: string;
  description?: string;
  shortDescription?: string;
  category: {
    _id: string;
    name: string;
    slug?: string;
  };
  pricing: {
    basePrice: number;
    salePrice: number;
    currency?: string;
  };
  inventorySummary?: {
    total?: number;
    available?: number;
    reserved?: number;
  };
  variants?: ProductVariant[];
  media?: ProductMedia[];
  status?: ProductStatus;
  tags?: string[];
  gender?: ProductGender;
  ageGroup?: "adult" | "teen" | "kids" | "baby";
  material?: string[];
  care?: string[];
  seoMeta?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  isFeatured?: boolean;
  isNew?: boolean;
  isBestseller?: boolean;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type PaginatedProductData = {
  docs: Product[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
};

export type ProductSort = Record<string, 1 | -1>;

export type ProductQueryParams = {
  page?: number;
  limit?: number;
  category?: string;
  gender?: ProductGender;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
  status?: ProductStatusFilter;
};

export const productService = {
  async getProducts(params: ProductQueryParams = {}): Promise<PaginatedProductData> {
    const response = await apiClient.get<ApiResponse<PaginatedProductData>>("/api/products", {
      params: {
        ...params,
        sort: params.sort ? JSON.stringify(params.sort) : undefined,
      },
    });

    return response.data.data;
  },

  async searchProducts(
    q: string,
    page = 1,
    limit = 10,
    status?: ProductStatusFilter,
  ): Promise<PaginatedProductData> {
    const response = await apiClient.get<ApiResponse<PaginatedProductData>>("/api/products/search", {
      params: { q, page, limit, status },
    });

    return response.data.data;
  },

  async createProduct(payload: ProductPayload): Promise<Product> {
    const response = await apiClient.post<ApiResponse<Product>>("/api/products", payload);
    return response.data.data;
  },

  async updateProduct(id: string, payload: Partial<ProductPayload>): Promise<Product> {
    const response = await apiClient.put<ApiResponse<Product>>(`/api/products/${id}`, payload);
    return response.data.data;
  },

  async deleteProduct(id: string): Promise<void> {
    await apiClient.delete(`/api/products/${id}`);
  },

  async uploadProductImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<ApiResponse<{ url: string }>>(
      "/api/products/upload-image",
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
