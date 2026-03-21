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

export const resolveStoreProductThumbnail = (
  product?: StoreProductImageSource | null,
): string | undefined => {
  if (!product) {
    return undefined;
  }

  const variantImage = product.variants?.find((variant) => (variant.images?.length ?? 0) > 0)?.images?.[0];
  const mediaImage =
    product.media?.find((item) => item.type === "image" && item.url)?.url ??
    product.media?.[0]?.url;

  return resolveStoreImageUrl(variantImage || mediaImage);
};
