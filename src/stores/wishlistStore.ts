import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type WishlistItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  imageUrl?: string;
};

type WishlistState = {
  items: WishlistItem[];
  addItem: (item: WishlistItem) => void;
  removeItem: (productId: string) => void;
  toggleItem: (item: WishlistItem) => void;
  clear: () => void;
  hasItem: (productId: string) => boolean;
};

const WISHLIST_STORAGE_KEY = "rioshop_wishlist";

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          if (state.items.some((existing) => existing.productId === item.productId)) {
            return state;
          }

          return { items: [...state.items, item] };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        })),

      toggleItem: (item) => {
        const exists = get().items.some((existing) => existing.productId === item.productId);
        if (exists) {
          get().removeItem(item.productId);
          return;
        }
        get().addItem(item);
      },

      clear: () => set({ items: [] }),

      hasItem: (productId) => get().items.some((item) => item.productId === productId),
    }),
    {
      name: WISHLIST_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

