import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  toNormalizedPrice,
  toNormalizedProductName,
  toNormalizedSlug,
  toTrimmedOrNull,
  toTrimmedOrUndefined,
} from "./storeItemNormalization";

export type CartItem = {
  itemId?: string;
  productId: string;
  slug: string;
  name: string;
  price: number;
  imageUrl?: string;
  variantSku?: string;
  variantLabel?: string;
  availableStock?: number;
  quantity: number;
};

type AddCartPayload = Omit<CartItem, "quantity"> & {
  quantity?: number;
};

type CartState = {
  items: CartItem[];
  ownerUserId: string | null;
  couponCode: string | null;
  couponDiscount: number;
  setItems: (
    items: CartItem[],
    ownerUserId?: string | null,
    couponCode?: string | null,
    couponDiscount?: number,
  ) => void;
  setCoupon: (couponCode?: string | null, couponDiscount?: number) => void;
  resetCart: () => void;
  addItem: (payload: AddCartPayload) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
};

const CART_STORAGE_KEY = "rioshop_cart";
export const CART_DEFAULT_VARIANT_KEY = "__default__";
const EMPTY_CART_META_STATE: Pick<CartState, "ownerUserId" | "couponCode" | "couponDiscount"> = {
  ownerUserId: null,
  couponCode: null,
  couponDiscount: 0,
};

const toDetachedCartState = (items: CartItem[]) => ({
  items,
  ...EMPTY_CART_META_STATE,
});

export const buildCartItemId = (payload: { productId: string; variantSku?: string }) =>
  `${payload.productId}::${payload.variantSku?.trim() || CART_DEFAULT_VARIANT_KEY}`;

const resolveCartItemId = (item: CartItem) =>
  item.itemId || buildCartItemId({ productId: item.productId, variantSku: item.variantSku });

const toSafeQuantity = (value: number | undefined, minimum = 1) => {
  const parsed = Number(value ?? minimum);
  if (!Number.isFinite(parsed)) {
    return minimum;
  }

  return Math.max(minimum, Math.floor(parsed));
};

const toSafeAvailableStock = (value: number | undefined) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.floor(parsed);
};

const toSafeCouponCode = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return normalized || null;
};

const toSafeCouponDiscount = (value: number | undefined) => {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return parsed;
};

const clampQuantityByStock = (quantity: number, availableStock?: number, minimum = 1) => {
  const normalizedQuantity = toSafeQuantity(quantity, minimum);
  if (!availableStock || availableStock < minimum) {
    return normalizedQuantity;
  }
  return Math.min(normalizedQuantity, availableStock);
};

const normalizeCartItem = (item: CartItem): CartItem | null => {
  const productId = toTrimmedOrNull(item.productId);
  const variantSku = toTrimmedOrNull(item.variantSku);
  if (!productId || !variantSku) {
    return null;
  }

  return {
    itemId: toTrimmedOrNull(item.itemId) || buildCartItemId({ productId, variantSku }),
    productId,
    slug: toNormalizedSlug(item.slug),
    name: toNormalizedProductName(item.name),
    price: toNormalizedPrice(item.price),
    imageUrl: item.imageUrl,
    variantSku,
    variantLabel: toTrimmedOrUndefined(item.variantLabel),
    availableStock: toSafeAvailableStock(item.availableStock),
    quantity: clampQuantityByStock(item.quantity, toSafeAvailableStock(item.availableStock), 1),
  };
};

const mergeCartItems = (items: CartItem[]) => {
  const merged = new Map<string, CartItem>();

  items.forEach((item) => {
    const normalized = normalizeCartItem(item);
    if (!normalized) {
      return;
    }

    const key = resolveCartItemId(normalized);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, normalized);
      return;
    }

    const nextStock = normalized.availableStock;
    const maxStock =
      existing.availableStock && nextStock
        ? Math.min(existing.availableStock, nextStock)
        : existing.availableStock || nextStock;

    merged.set(key, {
      ...normalized,
      availableStock: maxStock,
      quantity: clampQuantityByStock(existing.quantity + normalized.quantity, maxStock, 1),
    });
  });

  return Array.from(merged.values());
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      ...EMPTY_CART_META_STATE,

      setItems: (items, ownerUserId, couponCode, couponDiscount) =>
        set((state) => ({
          items: mergeCartItems(items || []),
          ownerUserId: ownerUserId === undefined ? state.ownerUserId : ownerUserId,
          couponCode:
            couponCode === undefined ? state.couponCode : toSafeCouponCode(couponCode),
          couponDiscount:
            couponDiscount === undefined
              ? state.couponDiscount
              : toSafeCouponDiscount(couponDiscount),
        })),

      setCoupon: (couponCode, couponDiscount) =>
        set((state) => ({
          couponCode:
            couponCode === undefined ? state.couponCode : toSafeCouponCode(couponCode),
          couponDiscount:
            couponDiscount === undefined
              ? state.couponDiscount
              : toSafeCouponDiscount(couponDiscount),
        })),

      resetCart: () => set(toDetachedCartState([])),

      addItem: (payload) =>
        set((state) => {
          const variantSku = toTrimmedOrNull(payload.variantSku);
          const productId = toTrimmedOrNull(payload.productId);
          if (!productId || !variantSku) {
            return state;
          }

          const quantity = toSafeQuantity(payload.quantity, 1);
          const itemId = buildCartItemId({ productId, variantSku });
          const existing = state.items.find((item) => resolveCartItemId(item) === itemId);
          const availableStock = toSafeAvailableStock(payload.availableStock);

          if (existing) {
            const maxStock = existing.availableStock || availableStock;
            return toDetachedCartState(
              state.items.map((item) =>
                resolveCartItemId(item) === itemId
                  ? {
                      ...item,
                      availableStock: maxStock,
                      quantity: clampQuantityByStock(item.quantity + quantity, maxStock, 1),
                    }
                  : item,
              ),
            );
          }

          return toDetachedCartState([
            ...state.items,
            {
              productId,
              slug: toNormalizedSlug(payload.slug),
              name: toNormalizedProductName(payload.name),
              price: toNormalizedPrice(payload.price),
              imageUrl: payload.imageUrl,
              variantSku,
              variantLabel: toTrimmedOrUndefined(payload.variantLabel),
              itemId,
              availableStock,
              quantity: clampQuantityByStock(quantity, availableStock, 1),
            },
          ]);
        }),

      removeItem: (itemId) =>
        set((state) =>
          toDetachedCartState(state.items.filter((item) => resolveCartItemId(item) !== itemId)),
        ),

      updateQuantity: (itemId, quantity) =>
        set((state) =>
          toDetachedCartState(
            state.items
              .map((item) =>
                resolveCartItemId(item) !== itemId
                  ? item
                  : {
                      ...item,
                      quantity:
                        toSafeQuantity(quantity, 0) === 0
                          ? 0
                          : clampQuantityByStock(quantity, item.availableStock, 1),
                    },
              )
              .filter((item) => item.quantity > 0),
          ),
        ),

      clearCart: () => set(toDetachedCartState([])),
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        ownerUserId: state.ownerUserId,
        couponCode: state.couponCode,
        couponDiscount: state.couponDiscount,
      }),
    },
  ),
);
