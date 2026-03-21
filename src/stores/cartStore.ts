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
  addItem: (payload: AddCartPayload) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
};

const CART_STORAGE_KEY = "rioshop_cart";
const CART_DEFAULT_VARIANT_KEY = "__default__";

const buildCartItemId = (payload: { productId: string; variantSku?: string }) =>
  `${payload.productId}::${payload.variantSku?.trim() || CART_DEFAULT_VARIANT_KEY}`;

const resolveCartItemId = (item: CartItem) =>
  item.itemId || buildCartItemId({ productId: item.productId, variantSku: item.variantSku });

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (payload) =>
        set((state) => {
          const quantity = payload.quantity ?? 1;
          const itemId = buildCartItemId(payload);
          const existing = state.items.find((item) => resolveCartItemId(item) === itemId);

          if (existing) {
            return {
              items: state.items.map((item) =>
                resolveCartItemId(item) === itemId
                  ? { ...item, quantity: item.quantity + quantity }
                  : item,
              ),
            };
          }

          return {
            items: [
              ...state.items,
              {
                ...payload,
                itemId,
                quantity,
              },
            ],
          };
        }),

      removeItem: (itemId) =>
        set((state) => ({
          items: state.items.filter((item) => resolveCartItemId(item) !== itemId),
        })),

      updateQuantity: (itemId, quantity) =>
        set((state) => ({
          items: state.items
            .map((item) =>
              resolveCartItemId(item) === itemId
                ? { ...item, quantity: Math.max(1, Math.floor(quantity)) }
                : item,
            )
            .filter((item) => item.quantity > 0),
        })),

      clearCart: () => set({ items: [] }),
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
