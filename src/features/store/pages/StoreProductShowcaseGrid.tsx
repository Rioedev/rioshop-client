import { StarFilled } from "@ant-design/icons";
import { StoreProductGridCard } from "../components/StoreProductGridCard";
import {
  formatStoreCurrency as formatCurrency,
  resolveStoreImageUrl,
} from "../utils/storeFormatting";
import {
  toProductCardImage,
  type ProductRuntime,
} from "../shared/productDetail";

type StoreProductShowcaseGridProps = {
  items: ProductRuntime[];
};

type ProductCardColorSwatch = {
  key: string;
  label: string;
  hex?: string;
  imageUrl?: string;
};

const normalizeColorHex = (value?: string) => {
  const hex = (value ?? "").trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex) ? hex : "";
};

const normalizeColorRef = (value?: string) => (value ?? "").trim().toLowerCase();

const findMediaColorImage = (item: ProductRuntime, colorName: string, colorHex: string) => {
  const expectedRefs = new Set<string>();
  const normalizedName = normalizeColorRef(colorName);
  const normalizedHex = normalizeColorRef(colorHex);

  if (normalizedName) {
    expectedRefs.add(normalizedName);
  }

  if (normalizedHex) {
    expectedRefs.add(normalizedHex);
    expectedRefs.add(normalizedHex.replace("#", ""));
  }

  const match = (item.media ?? []).find((mediaItem) => {
    if (!mediaItem?.url || mediaItem.type !== "image") {
      return false;
    }

    const mediaRef = normalizeColorRef(mediaItem.colorRef);
    if (!mediaRef) {
      return false;
    }

    return expectedRefs.has(mediaRef);
  });

  return resolveStoreImageUrl(match?.url);
};

const toProductCardColorSwatches = (
  item: ProductRuntime,
  fallbackImage?: string,
): ProductCardColorSwatch[] => {
  const swatchMap = new Map<string, ProductCardColorSwatch>();

  (item.variants ?? []).forEach((variant) => {
    if (variant.isActive === false) {
      return;
    }

    const label = (variant.color?.name ?? "").trim();
    const hex = normalizeColorHex(variant.color?.hex);
    const normalizedKey = (label || hex).toLowerCase();

    if (!normalizedKey) {
      return;
    }

    const imageUrl =
      resolveStoreImageUrl(variant.color?.imageUrl) ??
      resolveStoreImageUrl(variant.images?.[0]) ??
      findMediaColorImage(item, label, hex) ??
      fallbackImage;

    const existing = swatchMap.get(normalizedKey);
    if (existing) {
      if (!existing.imageUrl && imageUrl) {
        swatchMap.set(normalizedKey, { ...existing, imageUrl });
      }
      return;
    }

    swatchMap.set(normalizedKey, {
      key: normalizedKey,
      label: label || hex || "Mặc định",
      hex: hex || undefined,
      imageUrl,
    });
  });

  return Array.from(swatchMap.values()).slice(0, 5);
};

export function StoreProductShowcaseGrid({ items }: StoreProductShowcaseGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item, index) => {
        const image = toProductCardImage(item, `RIO-${index + 1}`);
        const colorSwatches = toProductCardColorSwatches(item, image);
        const hasDiscount = item.pricing.basePrice > item.pricing.salePrice;
        const discountLabel = hasDiscount
          ? `-${Math.round(((item.pricing.basePrice - item.pricing.salePrice) / item.pricing.basePrice) * 100)}%`
          : undefined;
        const ratingText = Number(item.ratings?.avg ?? 0) > 0 ? Number(item.ratings?.avg ?? 0).toFixed(1) : "4.8";
        const soldText =
          typeof item.totalSold === "number" && item.totalSold > 0
            ? `${item.totalSold.toLocaleString("vi-VN")} đã bán`
            : "Mới cập nhật";

        return (
          <StoreProductGridCard
            key={item._id}
            href={`/products/${item.slug}`}
            imageUrl={image}
            name={item.name}
            price={formatCurrency(item.pricing.salePrice)}
            originalPrice={hasDiscount ? formatCurrency(item.pricing.basePrice) : undefined}
            categoryLabel={item.category?.name ?? "Sản phẩm"}
            badge={discountLabel}
            colorSwatches={colorSwatches}
            footer={
              <div className="store-home-v3-product-foot">
                <span className="inline-flex items-center gap-1 text-amber-500">
                  <StarFilled />
                  {ratingText}
                </span>
                <span>{soldText}</span>
              </div>
            }
          />
        );
      })}
    </div>
  );
}
