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
  quantity: number;
};

type AddCartPayload = Omit<CartItem, "quantity"> & {
  quantity?: number;
};

type CartState = {
  items: CartItem[];
  ownerUserId: string | null;
  setItems: (items: CartItem[], ownerUserId?: string | null) => void;
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
    quantity: toSafeQuantity(item.quantity, 1),
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

    merged.set(key, {
      ...normalized,
      quantity: existing.quantity + normalized.quantity,
    });
  });

  return Array.from(merged.values());
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      ownerUserId: null,

      setItems: (items, ownerUserId) =>
        set((state) => ({
          items: mergeCartItems(items || []),
          ownerUserId: ownerUserId === undefined ? state.ownerUserId : ownerUserId,
        })),

      resetCart: () =>
        set({
          items: [],
          ownerUserId: null,
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

          if (existing) {
            return {
              items: state.items.map((item) =>
                resolveCartItemId(item) === itemId
                  ? { ...item, quantity: toSafeQuantity(item.quantity + quantity, 1) }
                  : item,
              ),
              ownerUserId: null,
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
                quantity,
              },
            ],
            ownerUserId: null,
          };
        }),

      removeItem: (itemId) =>
        set((state) => ({
          items: state.items.filter((item) => resolveCartItemId(item) !== itemId),
          ownerUserId: null,
        })),

      updateQuantity: (itemId, quantity) =>
        set((state) => ({
          items: state.items
            .map((item) =>
              resolveCartItemId(item) === itemId
                ? { ...item, quantity: toSafeQuantity(quantity, 0) }
                : item,
            )
            .filter((item) => item.quantity > 0),
          ownerUserId: null,
        })),

      clearCart: () => set({ items: [], ownerUserId: null }),
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items, ownerUserId: state.ownerUserId }),
    },
  ),
);
