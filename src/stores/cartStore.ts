import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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
  const productId = item.productId?.trim();
  const variantSku = item.variantSku?.trim();
  if (!productId || !variantSku) {
    return null;
  }

  return {
    itemId: item.itemId?.trim() || buildCartItemId({ productId, variantSku }),
    productId,
    slug: item.slug?.trim() || "",
    name: item.name?.trim() || "San pham",
    price: Math.max(0, Number(item.price || 0)),
    imageUrl: item.imageUrl,
    variantSku,
    variantLabel: item.variantLabel?.trim() || undefined,
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
      ownerUserId: null,
      couponCode: null,
      couponDiscount: 0,

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

      resetCart: () =>
        set({
          items: [],
          ownerUserId: null,
          couponCode: null,
          couponDiscount: 0,
        }),

      addItem: (payload) =>
        set((state) => {
          const variantSku = payload.variantSku?.trim();
          const productId = payload.productId?.trim();
          if (!productId || !variantSku) {
            return state;
          }

          const quantity = toSafeQuantity(payload.quantity, 1);
          const itemId = buildCartItemId({ productId, variantSku });
          const existing = state.items.find((item) => resolveCartItemId(item) === itemId);
          const availableStock = toSafeAvailableStock(payload.availableStock);

          if (existing) {
            const maxStock = existing.availableStock || availableStock;
            return {
              items: state.items.map((item) =>
                resolveCartItemId(item) === itemId
                  ? {
                      ...item,
                      availableStock: maxStock,
                      quantity: clampQuantityByStock(item.quantity + quantity, maxStock, 1),
                    }
                  : item,
              ),
              ownerUserId: null,
              couponCode: null,
              couponDiscount: 0,
            };
          }

          return {
            items: [
              ...state.items,
              {
                ...payload,
                productId,
                variantSku,
                itemId,
                availableStock,
                quantity: clampQuantityByStock(quantity, availableStock, 1),
              },
            ],
            ownerUserId: null,
            couponCode: null,
            couponDiscount: 0,
          };
        }),

      removeItem: (itemId) =>
        set((state) => ({
          items: state.items.filter((item) => resolveCartItemId(item) !== itemId),
          ownerUserId: null,
          couponCode: null,
          couponDiscount: 0,
        })),

      updateQuantity: (itemId, quantity) =>
        set((state) => ({
          items: state.items
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
          ownerUserId: null,
          couponCode: null,
          couponDiscount: 0,
        })),

      clearCart: () =>
        set({
          items: [],
          ownerUserId: null,
          couponCode: null,
          couponDiscount: 0,
        }),
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
