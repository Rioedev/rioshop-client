const storeCurrencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const storeApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000").replace(/\/$/, "");

export const formatStoreCurrency = (value: number) => storeCurrencyFormatter.format(value);

export const resolveStoreImageUrl = (url?: string): string | undefined => {
  if (!url) {
    return undefined;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const normalizedPath = url.startsWith("/") ? url : `/${url}`;
  return `${storeApiBaseUrl}${normalizedPath}`;
};

type StoreProductImageSource = {
  media?: Array<{ type?: string; url?: string }>;
  variants?: Array<{ images?: string[] }>;
};

type StoreProductColorSource = {
  variants?: Array<{
    isActive?: boolean;
    color?: {
      name?: string;
      hex?: string;
    };
  }>;
};

export type StoreProductColorChip = {
  name: string;
  hex: string;
};

const DEFAULT_STORE_COLOR_HEX = "#cbd5e1";

const normalizeStoreColorHex = (value?: string) => {
  const hex = (value ?? "").trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex) ? hex : DEFAULT_STORE_COLOR_HEX;
};

export const resolveStoreProductThumbnail = (
  product?: StoreProductImageSource | null,
): string | undefined => {
  if (!product) {
    return undefined;
  }

  const mediaImage =
    product.media?.find((item) => item.type === "image" && item.url)?.url ??
    product.media?.[0]?.url;
  const variantImage = product.variants?.find((variant) => (variant.images?.length ?? 0) > 0)?.images?.[0];

  return resolveStoreImageUrl(mediaImage || variantImage);
};

export const resolveStoreProductColors = (
  product?: StoreProductColorSource | null,
): StoreProductColorChip[] => {
  if (!product) {
    return [];
  }

  const colorMap = new Map<string, StoreProductColorChip>();

  (product.variants ?? [])
    .filter((variant) => variant.isActive !== false)
    .forEach((variant) => {
      const hex = normalizeStoreColorHex(variant.color?.hex);
      const name = (variant.color?.name ?? "").trim() || hex;
      const key = `${name.toLowerCase()}::${hex.toLowerCase()}`;

      if (!colorMap.has(key)) {
        colorMap.set(key, {
          name,
          hex,
        });
      }
    });

  return Array.from(colorMap.values());
};
