import { apiClient } from "./apiClient";
import { type ApiResponse } from "./apiTypes";
import { uploadImageToApi } from "./mediaUploadService";

export type ProductStatus = "draft" | "active" | "archived" | "out_of_stock";
export type ProductStatusFilter = ProductStatus | "all";
export type ProductGender = "men" | "women" | "unisex" | "kids";
export type ProductMediaType = "image" | "video" | "360";
export type ProductVariantSize = string;

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
  stock?: number;
  incoming?: number;
  additionalPrice?: number;
  barcode?: string;
  images?: string[];
  isActive?: boolean;
  position?: number;
  effectivePricing?: {
    unitPrice: number;
    listPrice: number;
    priceSource: "regular" | "flash_sale";
    flashSaleId?: string | null;
    flashSaleName?: string | null;
    flashSaleEndsAt?: string | null;
  };
};

export type ProductMedia = {
  url: string;
  type: ProductMediaType;
  altText?: string;
  colorRef?: string;
  isPrimary?: boolean;
  position?: number;
};

export type ProductCollection = {
  _id: string;
  name: string;
  slug?: string;
  image?: string;
  bannerImage?: string;
};

export type ProductSizeChartRow = {
  size: string;
  shoulder?: number | null;
  chest?: number | null;
  waist?: number | null;
  hip?: number | null;
  length?: number | null;
};

export type ProductSizeChart = {
  unit?: "cm";
  rows?: ProductSizeChartRow[];
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
  collections?: ProductCollection[];
  gender?: ProductGender;
  pricing: {
    regularPrice: number;
    compareAtPrice: number;
    /** @deprecated Use regularPrice. Kept for legacy API compatibility. */
    salePrice: number;
    /** @deprecated Use compareAtPrice. Kept for legacy API compatibility. */
    basePrice: number;
    costPrice?: number;
    currency?: string;
  };
  inventorySummary?: {
    total?: number;
    available?: number;
    reserved?: number;
  };
  variants?: ProductVariant[];
  media?: ProductMedia[];
  sizeChart?: ProductSizeChart;
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
  totalSold?: number;
  salesCount?: number;
  salesOrderCount?: number;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
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
  collections?: ProductCollection[];
  pricing: {
    regularPrice: number;
    compareAtPrice?: number;
    /** @deprecated Use regularPrice. */
    salePrice?: number;
    /** @deprecated Use compareAtPrice. */
    basePrice?: number;
    costPrice?: number;
    currency?: string;
  };
  inventorySummary?: {
    total?: number;
    available?: number;
    reserved?: number;
  };
  variants?: ProductVariant[];
  media?: ProductMedia[];
  sizeChart?: ProductSizeChart;
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

export type PaginatedProductData = {
  docs: Product[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
};

export type ProductSort = Record<string, 1 | -1>;
export type ProductImportXlsxError = {
  row?: number;
  sku?: string;
  message: string;
};

export type ProductImportXlsxResult = {
  created: number;
  updated: number;
  failed: number;
  totalErrors?: number;
  errors: ProductImportXlsxError[];
};

export type ProductQueryParams = {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  collection?: string;
  gender?: ProductGender;
  minPrice?: number;
  maxPrice?: number;
  color?: string;
  size?: string;
  sort?: ProductSort;
  status?: ProductStatusFilter;
  ranking?: "best_selling";
  newWithinDays?: number;
};

export type CartProductRecommendation = {
  product: Product;
  score: number;
  signals?: {
    coPurchaseOrders?: number;
    coPurchaseQuantity?: number;
  };
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

  async getProductBySlug(slug: string): Promise<Product> {
    const response = await apiClient.get<ApiResponse<Product>>(`/api/products/${slug}`);
    return response.data.data;
  },

  async getRelatedProducts(id: string): Promise<Product[]> {
    const response = await apiClient.get<ApiResponse<Product[]>>(`/api/products/${id}/related`);
    return response.data.data;
  },

  async getCartRecommendations(
    productIds: string[],
    limit = 4,
  ): Promise<CartProductRecommendation[]> {
    const response = await apiClient.post<ApiResponse<CartProductRecommendation[]>>(
      "/api/products/cart-recommendations",
      { productIds, limit },
    );
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
    return uploadImageToApi("/api/products/upload-image", file);
  },

  async exportProductsXlsx(params: ProductQueryParams = {}): Promise<Blob> {
    const response = await apiClient.get<Blob>("/api/products/export-xlsx", {
      params: {
        ...params,
        sort: params.sort ? JSON.stringify(params.sort) : undefined,
      },
      responseType: "blob",
    });

    return response.data;
  },

  async downloadProductsImportTemplateXlsx(): Promise<Blob> {
    const response = await apiClient.get<Blob>("/api/products/import-template-xlsx", {
      responseType: "blob",
    });

    return response.data;
  },

  async importProductsXlsx(file: File): Promise<ProductImportXlsxResult> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<ApiResponse<ProductImportXlsxResult>>(
      "/api/products/import-xlsx",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data.data;
  },
};
