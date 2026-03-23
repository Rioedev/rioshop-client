import { apiClient } from "./apiClient";
import type { CartItem } from "../stores/cartStore";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type CartApiItem = {
  itemId?: string;
  productId?: string | { _id?: string };
  productSlug?: string;
  variantSku?: string;
  productName?: string;
  variantLabel?: string;
  image?: string;
  unitPrice?: number;
  availableStock?: number;
  quantity?: number;
};

export type CartSnapshot = {
  items?: CartApiItem[];
  subtotal?: number;
  couponCode?: string;
  couponDiscount?: number;
  updatedAt?: string;
};

type ApplyCouponApiData =
  | CartSnapshot
  | {
      cart?: CartSnapshot;
      discount?: number;
    };

export type CartAddPayload = {
  productId: string;
  variantSku: string;
  quantity?: number;
};

export type CartCouponMeta = {
  couponCode: string | null;
  couponDiscount: number;
};

const DEFAULT_CART_VARIANT_KEY = "__default__";

const toProductId = (value: CartApiItem["productId"]) =>
  typeof value === "string" ? value : value?._id || "";

const toSafeQuantity = (value: number | undefined) => {
  const parsed = Number(value || 1);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }
  return Math.floor(parsed);
};

const toSafeAvailableStock = (value: number | undefined) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.floor(parsed);
};

const toSafeItemId = (item: CartApiItem, productId: string) =>
  item.itemId?.trim() ||
  `${productId}::${item.variantSku?.trim() || DEFAULT_CART_VARIANT_KEY}`;

const normalizeCartSnapshot = (payload: ApplyCouponApiData): CartSnapshot => {
  if (payload && typeof payload === "object" && "cart" in payload && payload.cart) {
    return payload.cart;
  }

  return payload as CartSnapshot;
};

export const toCartCouponMeta = (cart: CartSnapshot): CartCouponMeta => ({
  couponCode: cart.couponCode?.trim() || null,
  couponDiscount: Math.max(0, Number(cart.couponDiscount || 0)),
});

export const toCartStoreItems = (cart: CartSnapshot): CartItem[] =>
  (cart.items || []).reduce<CartItem[]>((acc, item) => {
    const productId = toProductId(item.productId);
    const variantSku = item.variantSku?.trim() || "";
    if (!productId || !variantSku) {
      return acc;
    }

    const variantLabel = item.variantLabel?.trim() || "";
    const baseName = item.productName?.trim() || "San pham";

    acc.push({
      itemId: toSafeItemId(item, productId),
      productId,
      slug: item.productSlug?.trim() || "",
      name: variantLabel ? `${baseName} - ${variantLabel}` : baseName,
      price: Math.max(0, Number(item.unitPrice || 0)),
      imageUrl: item.image || undefined,
      variantSku,
      variantLabel: variantLabel || undefined,
      availableStock: toSafeAvailableStock(item.availableStock),
      quantity: toSafeQuantity(item.quantity),
    });

    return acc;
  }, []);

export const cartService = {
  async getCart(): Promise<CartSnapshot> {
    const response = await apiClient.get<ApiResponse<CartSnapshot>>("/api/carts");
    return response.data.data;
  },

  async addItem(payload: CartAddPayload): Promise<CartSnapshot> {
    const response = await apiClient.post<ApiResponse<CartSnapshot>>("/api/carts/add", payload);
    return response.data.data;
  },

  async updateItem(itemId: string, quantity: number): Promise<CartSnapshot> {
    const response = await apiClient.put<ApiResponse<CartSnapshot>>(`/api/carts/items/${encodeURIComponent(itemId)}`, {
      quantity,
    });
    return response.data.data;
  },

  async removeItem(itemId: string): Promise<CartSnapshot> {
    const response = await apiClient.delete<ApiResponse<CartSnapshot>>(`/api/carts/items/${encodeURIComponent(itemId)}`);
    return response.data.data;
  },

  async clearCart(): Promise<CartSnapshot> {
    const response = await apiClient.delete<ApiResponse<CartSnapshot>>("/api/carts/clear");
    return response.data.data;
  },

  async applyCoupon(code: string): Promise<CartSnapshot> {
    const response = await apiClient.post<ApiResponse<ApplyCouponApiData>>("/api/carts/apply-coupon", {
      code,
    });
    return normalizeCartSnapshot(response.data.data);
  },

  async clearCoupon(): Promise<CartSnapshot> {
    const response = await apiClient.delete<ApiResponse<CartSnapshot>>("/api/carts/coupon");
    return response.data.data;
  },
};
