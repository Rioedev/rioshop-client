import type { Coupon } from "../../../services/couponService";
import type { Product } from "../../../services/productService";
import {
  formatStoreCurrency as formatCurrency,
  resolveStoreProductThumbnail,
} from "../utils/storeFormatting";

type ProductVariant = NonNullable<Product["variants"]>[number];

export type ProductRuntime = Product & {
  ratings?: {
    avg?: number;
    count?: number;
    dist?: Record<string, number>;
  };
  totalSold?: number;
};

export const demoColors = [
  { name: "Coral", hex: "#ff7f7f" },
  { name: "Pearl", hex: "#f1f5f9" },
  { name: "Navy", hex: "#1e3a8a" },
  { name: "Onyx", hex: "#0f172a" },
  { name: "Slate", hex: "#64748b" },
];

export const demoSizes = ["XS", "S", "M", "L", "XL", "2XL"];

export const DEFAULT_COLOR_HEX = "#cbd5e1";
export const WISHLIST_FALLBACK_IMAGE =
  "https://dummyimage.com/400x400/e2e8f0/0f172a&text=RIO";

export const normalizeColorValue = (value?: string) =>
  (value ?? "").trim().toLowerCase();

export const getVariantColorName = (variant: ProductVariant) =>
  variant.color?.name?.trim() ||
  (variant.color?.hex?.trim() ? `Màu ${variant.color.hex.trim()}` : "Mặc định");

export const getVariantSizeLabel = (variant: ProductVariant) =>
  variant.sizeLabel?.trim() || variant.size?.trim() || "";

export const toProductCardImage = (item: ProductRuntime, fallback = "RIO") =>
  resolveStoreProductThumbnail(item) ??
  `https://dummyimage.com/800x1000/e2e8f0/0f172a&text=${encodeURIComponent(fallback)}`;

const normalizeColorHex = (value?: string) => {
  const hex = (value || "").trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex) ? hex : DEFAULT_COLOR_HEX;
};

export const getProductColorDots = (item: ProductRuntime) => {
  const variants = (item.variants ?? []).filter((variant) => variant.isActive !== false);
  const map = new Map<string, { name: string; hex: string }>();

  variants.forEach((variant) => {
    const name = variant.color?.name?.trim() || "";
    const hex = normalizeColorHex(variant.color?.hex);
    const key = `${normalizeColorValue(name || hex)}::${hex.toLowerCase()}`;
    if (map.has(key)) {
      return;
    }

    map.set(key, {
      name: name || hex,
      hex,
    });
  });

  return Array.from(map.values()).slice(0, 4);
};

export const generateReviewPercents = (
  dist?: Record<string, number>,
  count = 0,
) => {
  if (dist && count > 0) {
    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      percent: Math.round(((dist[String(star)] ?? 0) / count) * 100),
    }));
  }

  return [
    { star: 5, percent: 78 },
    { star: 4, percent: 15 },
    { star: 3, percent: 4 },
    { star: 2, percent: 2 },
    { star: 1, percent: 1 },
  ];
};

export const formatReviewDate = (value?: string) => {
  if (!value) {
    return "Vừa xong";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Vừa xong";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
  }).format(date);
};

export const formatDetailCouponValue = (coupon: Coupon) => {
  if (coupon.type === "percent") {
    return `Giảm ${coupon.value}%`;
  }

  if (coupon.type === "fixed") {
    return `Giảm ${formatCurrency(coupon.value)}`;
  }

  if (coupon.type === "free_ship") {
    return "Miễn phí vận chuyển";
  }

  return coupon.name;
};

export const formatDetailCouponExpiry = (value?: string) => {
  if (!value) {
    return "Không giới hạn";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Không giới hạn";
  }

  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(date);
};

export const stripHtmlToText = (value?: string) =>
  (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

export const sanitizeProductHtml = (html?: string) => {
  if (!html) {
    return "";
  }

  if (typeof window === "undefined") {
    return html;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    doc.querySelectorAll("script, style, iframe, object, embed, link, meta").forEach((node) => node.remove());

    doc.body.querySelectorAll("*").forEach((node) => {
      Array.from(node.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value;

        if (name.startsWith("on")) {
          node.removeAttribute(attribute.name);
          return;
        }

        if ((name === "href" || name === "src") && /^\s*javascript:/i.test(value)) {
          node.removeAttribute(attribute.name);
          return;
        }

        if (name === "style") {
          const sanitizedStyle = value
            .split(";")
            .map((rule) => rule.trim())
            .filter((rule) => rule && !/expression|url\(/i.test(rule))
            .join("; ");

          if (sanitizedStyle) {
            node.setAttribute("style", sanitizedStyle);
          } else {
            node.removeAttribute("style");
          }
        }
      });
    });

    return doc.body.innerHTML;
  } catch {
    return html;
  }
};
