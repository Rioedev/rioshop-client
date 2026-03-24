import { apiClient } from "./apiClient";
import type { WishlistItem } from "../stores/wishlistStore";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type WishlistApiItem = {
  productId?: string | { _id?: string };
  productSlug?: string;
  variantSku?: string;
  name?: string;
  image?: string;
  price?: number;
  addedAt?: string;
};

type WishlistSnapshot = {
  items?: WishlistApiItem[];
  updatedAt?: string;
};

export type WishlistAddPayload = {
  productId: string;
  productSlug?: string;
  variantSku?: string;
  name: string;
  image: string;
  price: number;
};

const toProductId = (value: WishlistApiItem["productId"]) =>
  typeof value === "string" ? value : value?._id || "";

const normalizeItem = (item: WishlistApiItem): WishlistItem | null => {
  const productId = toProductId(item.productId);
  if (!productId) {
    return null;
  }

  return {
    productId,
    slug: item.productSlug?.trim() || "",
    name: item.name?.trim() || "San pham",
    price: Math.max(0, Number(item.price || 0)),
    imageUrl: item.image?.trim() || undefined,
  };
};

export const toWishlistStoreItems = (snapshot: WishlistSnapshot): WishlistItem[] =>
  (snapshot.items || []).reduce<WishlistItem[]>((acc, item) => {
    const normalized = normalizeItem(item);
    if (!normalized) {
      return acc;
    }
    acc.push(normalized);
    return acc;
  }, []);

export const wishlistService = {
  async getWishlist(): Promise<WishlistSnapshot> {
    const response = await apiClient.get<ApiResponse<WishlistSnapshot>>("/api/wishlists");
    return response.data.data;
  },

  async addItem(payload: WishlistAddPayload): Promise<WishlistSnapshot> {
    const response = await apiClient.post<ApiResponse<WishlistSnapshot>>("/api/wishlists/add", payload);
    return response.data.data;
  },

  async removeItem(productId: string, variantSku?: string): Promise<WishlistSnapshot> {
    const response = await apiClient.delete<ApiResponse<WishlistSnapshot>>(
      `/api/wishlists/${encodeURIComponent(productId)}`,
      {
        params: {
          variantSku: variantSku?.trim() || undefined,
        },
      },
    );
    return response.data.data;
  },

  async clearWishlist(): Promise<WishlistSnapshot> {
    const response = await apiClient.delete<ApiResponse<WishlistSnapshot>>("/api/wishlists/clear");
    return response.data.data;
  },
};
