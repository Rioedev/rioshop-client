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
  ownerUserId: string | null;
  setItems: (items: WishlistItem[], ownerUserId?: string | null) => void;
  resetWishlist: () => void;
  addItem: (item: WishlistItem) => void;
  removeItem: (productId: string) => void;
  toggleItem: (item: WishlistItem) => void;
  clear: () => void;
  hasItem: (productId: string) => boolean;
};

const WISHLIST_STORAGE_KEY = "rioshop_wishlist";

const normalizeWishlistItem = (item: WishlistItem): WishlistItem | null => {
  const productId = item.productId?.trim();
  if (!productId) {
    return null;
  }

  return {
    productId,
    slug: item.slug?.trim() || "",
    name: item.name?.trim() || "San pham",
    price: Math.max(0, Number(item.price || 0)),
    imageUrl: item.imageUrl,
  };
};

const normalizeWishlistItems = (items: WishlistItem[]) => {
  const merged = new Map<string, WishlistItem>();
  items.forEach((item) => {
    const normalized = normalizeWishlistItem(item);
    if (!normalized) {
      return;
    }
    merged.set(normalized.productId, normalized);
  });

  return Array.from(merged.values());
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      ownerUserId: null,

      setItems: (items, ownerUserId) =>
        set((state) => ({
          items: normalizeWishlistItems(items || []),
          ownerUserId: ownerUserId === undefined ? state.ownerUserId : ownerUserId,
        })),

      resetWishlist: () =>
        set({
          items: [],
          ownerUserId: null,
        }),

      addItem: (item) =>
        set((state) => {
          const normalized = normalizeWishlistItem(item);
          if (!normalized) {
            return state;
          }

          if (state.items.some((existing) => existing.productId === normalized.productId)) {
            return {
              items: state.items.map((existing) =>
                existing.productId === normalized.productId ? normalized : existing,
              ),
              ownerUserId: null,
            };
          }

          return { items: [...state.items, normalized], ownerUserId: null };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
          ownerUserId: null,
        })),

      toggleItem: (item) => {
        const exists = get().items.some((existing) => existing.productId === item.productId);
        if (exists) {
          get().removeItem(item.productId);
          return;
        }
        get().addItem(item);
      },

      clear: () => set({ items: [], ownerUserId: null }),

      hasItem: (productId) => get().items.some((item) => item.productId === productId),
    }),
    {
      name: WISHLIST_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items, ownerUserId: state.ownerUserId }),
    },
  ),
);
