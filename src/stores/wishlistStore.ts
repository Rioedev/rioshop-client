import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  toNormalizedPrice,
  toNormalizedProductName,
  toNormalizedSlug,
  toTrimmedOrNull,
} from "./storeItemNormalization";

export type WishlistItemColorSwatch = {
  key: string;
  label: string;
  hex?: string;
  imageUrl?: string;
};

export type WishlistItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  imageUrl?: string;
  colorSwatches?: WishlistItemColorSwatch[];
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
const GUEST_WISHLIST_STATE: Pick<WishlistState, "ownerUserId"> = {
  ownerUserId: null,
};

const toGuestWishlistState = (items: WishlistItem[]) => ({
  items,
  ...GUEST_WISHLIST_STATE,
});

const normalizeColorSwatches = (
  swatches?: WishlistItemColorSwatch[],
): WishlistItemColorSwatch[] | undefined => {
  if (!Array.isArray(swatches) || swatches.length === 0) {
    return undefined;
  }
  const cleaned = swatches
    .map((swatch) => {
      const key = (swatch?.key ?? "").toString().trim();
      if (!key) return null;
      return {
        key,
        label: (swatch?.label ?? "").toString().trim(),
        hex: swatch?.hex?.toString().trim() || undefined,
        imageUrl: swatch?.imageUrl?.toString().trim() || undefined,
      };
    })
    .filter(Boolean) as WishlistItemColorSwatch[];
  return cleaned.length > 0 ? cleaned : undefined;
};

const normalizeWishlistItem = (item: WishlistItem): WishlistItem | null => {
  const productId = toTrimmedOrNull(item.productId);
  if (!productId) {
    return null;
  }

  return {
    productId,
    slug: toNormalizedSlug(item.slug),
    name: toNormalizedProductName(item.name),
    price: toNormalizedPrice(item.price),
    imageUrl: item.imageUrl,
    colorSwatches: normalizeColorSwatches(item.colorSwatches),
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
      ...GUEST_WISHLIST_STATE,

      setItems: (items, ownerUserId) =>
        set((state) => ({
          items: normalizeWishlistItems(items || []),
          ownerUserId: ownerUserId === undefined ? state.ownerUserId : ownerUserId,
        })),

      resetWishlist: () =>
        set(toGuestWishlistState([])),

      addItem: (item) =>
        set((state) => {
          const normalized = normalizeWishlistItem(item);
          if (!normalized) {
            return state;
          }

          if (state.items.some((existing) => existing.productId === normalized.productId)) {
            return toGuestWishlistState(
              state.items.map((existing) =>
                existing.productId === normalized.productId ? normalized : existing,
              ),
            );
          }

          return toGuestWishlistState([...state.items, normalized]);
        }),

      removeItem: (productId) =>
        set((state) => {
          const normalizedProductId = toTrimmedOrNull(productId);
          if (!normalizedProductId) {
            return state;
          }

          return toGuestWishlistState(
            state.items.filter((item) => item.productId !== normalizedProductId),
          );
        }),

      toggleItem: (item) => {
        const normalized = normalizeWishlistItem(item);
        if (!normalized) {
          return;
        }

        const exists = get().items.some((existing) => existing.productId === normalized.productId);
        if (exists) {
          get().removeItem(normalized.productId);
          return;
        }
        get().addItem(normalized);
      },

      clear: () => set(toGuestWishlistState([])),

      hasItem: (productId) => {
        const normalizedProductId = toTrimmedOrNull(productId);
        if (!normalizedProductId) {
          return false;
        }
        return get().items.some((item) => item.productId === normalizedProductId);
      },
    }),
    {
      name: WISHLIST_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items, ownerUserId: state.ownerUserId }),
    },
  ),
);
