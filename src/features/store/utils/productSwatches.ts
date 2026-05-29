import { type Product } from "../../../services/productService";

export type StoreColorSwatch = {
  key: string;
  label: string;
  hex?: string;
  imageUrl?: string;
};

const normalizeColorHex = (value?: string) => {
  const hex = (value ?? "").trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex) ? hex : "";
};

const normalizeRef = (value?: string) => (value ?? "").trim().toLowerCase();

const findMediaImagePath = (
  product: Product,
  colorName: string,
  colorHex: string,
): string | undefined => {
  const expected = new Set<string>();
  const n = normalizeRef(colorName);
  const h = normalizeRef(colorHex);
  if (n) expected.add(n);
  if (h) {
    expected.add(h);
    expected.add(h.replace("#", ""));
  }
  return product.media?.find(
    (m) => m?.url && m.type === "image" && expected.has(normalizeRef(m.colorRef)),
  )?.url;
};

const deriveFallbackPath = (product: Product, externalFallback?: string) => {
  const mediaImage =
    product.media?.find((m) => m.type === "image" && m.url)?.url ??
    product.media?.[0]?.url;
  const variantImage = product.variants?.find(
    (v) => (v.images?.length ?? 0) > 0,
  )?.images?.[0];
  return mediaImage || variantImage || externalFallback;
};

// Build color swatches from a product, storing RAW image paths (not resolved
// against API base). Suitable for persisting to wishlist DB so URLs stay valid
// even if VITE_API_BASE_URL changes later. Display code must pass `imageUrl`
// through `resolveStoreImageUrl` before rendering.
export const toStoreColorSwatches = (
  product: Product,
  externalFallback?: string,
  maxCount = 5,
): StoreColorSwatch[] => {
  const swatchMap = new Map<string, StoreColorSwatch>();
  const productFallback = deriveFallbackPath(product, externalFallback);

  (product.variants ?? []).forEach((variant) => {
    if (variant.isActive === false) return;
    const label = (variant.color?.name ?? "").trim();
    const hex = normalizeColorHex(variant.color?.hex);
    const key = (label || hex).toLowerCase();
    if (!key) return;

    const imageUrl =
      variant.color?.imageUrl?.trim() ||
      variant.images?.[0]?.trim() ||
      findMediaImagePath(product, label, hex) ||
      productFallback;

    const existing = swatchMap.get(key);
    if (existing) {
      if (!existing.imageUrl && imageUrl) {
        swatchMap.set(key, { ...existing, imageUrl });
      }
      return;
    }
    swatchMap.set(key, {
      key,
      label: label || hex || "Mặc định",
      hex: hex || undefined,
      imageUrl,
    });
  });

  return Array.from(swatchMap.values()).slice(0, maxCount);
};
