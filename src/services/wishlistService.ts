import { apiClient } from "./apiClient";
import { type ApiResponse } from "./apiTypes";
import type { WishlistItem, WishlistItemColorSwatch } from "../stores/wishlistStore";

type WishlistApiColorSwatch = {
  key?: string;
  label?: string;
  hex?: string;
  imageUrl?: string;
};

type WishlistApiItem = {
  productId?: string | { _id?: string };
  productSlug?: string;
  variantSku?: string;
  name?: string;
  image?: string;
  price?: number;
  colorSwatches?: WishlistApiColorSwatch[];
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
  colorSwatches?: WishlistItemColorSwatch[];
};

const toProductId = (value: WishlistApiItem["productId"]) =>
  typeof value === "string" ? value : value?._id || "";

const normalizeColorSwatches = (
  swatches?: WishlistApiColorSwatch[],
): WishlistItemColorSwatch[] | undefined => {
  if (!Array.isArray(swatches) || swatches.length === 0) {
    return undefined;
  }
  const cleaned = swatches
    .map((swatch) => {
      const key = swatch?.key?.toString().trim() || "";
      if (!key) return null;
      return {
        key,
        label: swatch?.label?.toString().trim() || "",
        hex: swatch?.hex?.toString().trim() || undefined,
        imageUrl: swatch?.imageUrl?.toString().trim() || undefined,
      };
    })
    .filter(Boolean) as WishlistItemColorSwatch[];
  return cleaned.length > 0 ? cleaned : undefined;
};

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
    colorSwatches: normalizeColorSwatches(item.colorSwatches),
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
