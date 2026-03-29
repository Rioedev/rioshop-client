import { Typography } from "antd";
import {
  type Product,
  type ProductGender,
  type ProductStatus,
  type ProductStatusFilter,
  type ProductVariant,
  type ProductVariantSize,
} from "../../../services/productService";
import {
  buildVariantSku,
  makeUniqueSku,
  normalizeSkuInput,
} from "../utils/productSku";

export const { Paragraph, Title, Text } = Typography;
export const REQUIRED_RULE = [{ required: true, message: "Trường bắt buộc" }];

export type VariantImageFormValue = {
  url: string;
  pendingFileId?: string;
};

export type VariantFormValue = {
  variantId: string;
  sku: string;
  size: ProductVariantSize;
  sizeLabel?: string;
  stock?: number;
  additionalPrice?: number;
  isActive?: boolean;
  colorName?: string;
  colorHex?: string;
  imageItems?: VariantImageFormValue[];
};

export type VariantSizeFormValue = {
  variantId?: string;
  sku?: string;
  size: ProductVariantSize;
  sizeLabel?: string;
  stock?: number;
  additionalPrice?: number;
  isActive?: boolean;
};

export type VariantGroupFormValue = {
  colorName?: string;
  colorHex?: string;
  imageItems?: VariantImageFormValue[];
  sizes: VariantSizeFormValue[];
  bulkSizesText?: string;
};

export type ProductFormValues = {
  sku: string;
  name: string;
  brand: string;
  categoryId: string;
  gender?: ProductGender;
  ageGroup?: "adult" | "teen" | "kids" | "baby";
  basePrice: number;
  salePrice: number;
  status: ProductStatus;
  description?: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  materialText?: string;
  careText?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywordsText?: string;
  variantGroups: VariantGroupFormValue[];
};

export const STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Nháp",
  active: "Đang bán",
  archived: "Lưu trữ",
  out_of_stock: "Hết hàng",
};

export const STATUS_COLORS: Record<ProductStatus, string> = {
  draft: "gold",
  active: "green",
  archived: "default",
  out_of_stock: "red",
};

export const STATUS_FILTER_OPTIONS: { value: ProductStatusFilter; label: string }[] = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "active", label: "Đang bán" },
  { value: "draft", label: "Nháp" },
  { value: "archived", label: "Lưu trữ" },
  { value: "out_of_stock", label: "Hết hàng" },
];

export const PRODUCT_STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "active", label: "Đang bán" },
  { value: "draft", label: "Nháp" },
  { value: "out_of_stock", label: "Hết hàng" },
  { value: "archived", label: "Lưu trữ" },
];

export const VARIANT_SIZE_OPTIONS: { value: ProductVariantSize; label: ProductVariantSize }[] = [
  { value: "XS", label: "XS" },
  { value: "S", label: "S" },
  { value: "M", label: "M" },
  { value: "L", label: "L" },
  { value: "XL", label: "XL" },
  { value: "2XL", label: "2XL" },
  { value: "3XL", label: "3XL" },
  { value: "38", label: "38" },
  { value: "39", label: "39" },
  { value: "40", label: "40" },
  { value: "41", label: "41" },
  { value: "42", label: "42" },
  { value: "43", label: "43" },
];

export const GENDER_OPTIONS: { value: ProductGender; label: string }[] = [
  { value: "men", label: "Nam" },
  { value: "women", label: "Nữ" },
  { value: "unisex", label: "Unisex" },
  { value: "kids", label: "Trẻ em" },
];

export const AGE_GROUP_OPTIONS: { value: "adult" | "teen" | "kids" | "baby"; label: string }[] = [
  { value: "adult", label: "Người lớn" },
  { value: "teen", label: "Thanh thiếu niên" },
  { value: "kids", label: "Thiếu nhi" },
  { value: "baby", label: "Em bé" },
];

export const formatCurrency = new Intl.NumberFormat("vi-VN");

export const toSlug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const toList = (value?: string) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const defaultVariantSize = (size: ProductVariantSize = "M"): VariantSizeFormValue => ({
  variantId: "",
  sku: "",
  size,
  sizeLabel: size,
  stock: 0,
  additionalPrice: 0,
  isActive: true,
});

export const defaultVariantGroup = (): VariantGroupFormValue => ({
  colorName: "",
  colorHex: "",
  imageItems: [],
  sizes: [defaultVariantSize("M")],
  bulkSizesText: "",
});

export const buildVariantGroupKey = (colorName?: string, colorHex?: string) =>
  `${(colorName ?? "").trim().toLowerCase()}|${(colorHex ?? "").trim().toLowerCase()}`;

export const getUniqueVariantId = (baseVariantId: string, reservedVariantIds: Set<string>) => {
  let candidate = baseVariantId;
  let counter = 2;

  while (reservedVariantIds.has(candidate)) {
    candidate = `${baseVariantId}-${counter}`;
    counter += 1;
  }

  reservedVariantIds.add(candidate);
  return candidate;
};

export const normalizeVariants = (variantValues: VariantFormValue[]): ProductVariant[] => {
  const reservedVariantIds = new Set<string>();

  return variantValues.reduce<ProductVariant[]>((acc, item, index) => {
    const size = item.size?.trim();
    if (!size) {
      return acc;
    }

    const rawVariantId = item.variantId?.trim();
    const variantId = rawVariantId
      ? getUniqueVariantId(rawVariantId, reservedVariantIds)
      : getUniqueVariantId(`variant-${index + 1}`, reservedVariantIds);

    acc.push({
      variantId,
      sku: item.sku?.trim() || "",
      size,
      sizeLabel: item.sizeLabel?.trim() || size,
      stock: Math.max(0, Number(item.stock ?? 0)),
      additionalPrice: item.additionalPrice ?? 0,
      isActive: item.isActive ?? true,
      position: index,
      color:
        item.colorName || item.colorHex
          ? { name: item.colorName?.trim() || "", hex: item.colorHex?.trim() || "" }
          : undefined,
      images: (item.imageItems ?? [])
        .map((imageItem) => imageItem.url?.trim())
        .filter(Boolean),
    });

    return acc;
  }, []);
};

export type ParsedSizeEntry = {
  size: string;
  stock?: number;
};

export const normalizeVariantComboKey = (colorName?: string, colorHex?: string, size?: string) =>
  `${(colorName ?? "").trim().toLowerCase()}|${(colorHex ?? "").trim().toLowerCase()}|${(size ?? "")
    .trim()
    .toLowerCase()}`;

export const parseBulkSizeEntries = (raw: string): ParsedSizeEntry[] => {
  const seen = new Set<string>();

  return raw
    .split(/[\n,;]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .reduce<ParsedSizeEntry[]>((acc, token) => {
      const match = token.match(/^(.+?)(?:\s*[:=]\s*(\d+))?$/);
      if (!match) {
        return acc;
      }

      const nextSize = (match[1] ?? "").trim();
      if (!nextSize) {
        return acc;
      }

      const dedupeKey = nextSize.toLowerCase();
      if (seen.has(dedupeKey)) {
        return acc;
      }
      seen.add(dedupeKey);

      const nextStock = match[2] === undefined ? undefined : Number(match[2]);
      acc.push({
        size: nextSize,
        stock: Number.isFinite(nextStock) ? nextStock : undefined,
      });
      return acc;
    }, []);
};

export const mapVariantsToGroups = (variants: ProductVariant[] = []): VariantGroupFormValue[] => {
  const groupMap = new Map<string, VariantGroupFormValue>();

  variants.forEach((variant) => {
    const colorName = variant.color?.name?.trim() || "";
    const colorHex = variant.color?.hex?.trim() || "";
    const key = buildVariantGroupKey(colorName, colorHex);

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        colorName,
        colorHex,
        imageItems: (variant.images ?? []).map((url) => ({ url })),
        sizes: [],
        bulkSizesText: "",
      });
    }

    const group = groupMap.get(key);
    if (!group) {
      return;
    }

    if ((group.imageItems?.length ?? 0) === 0 && (variant.images?.length ?? 0) > 0) {
      group.imageItems = (variant.images ?? []).map((url) => ({ url }));
    }

    group.sizes.push({
      variantId: variant.variantId,
      sku: variant.sku,
      size: variant.size,
      sizeLabel: variant.sizeLabel || variant.size,
      stock: variant.stock ?? 0,
      additionalPrice: variant.additionalPrice ?? 0,
      isActive: variant.isActive ?? true,
    });
  });

  const groups = Array.from(groupMap.values()).map((group) => ({
    ...group,
    sizes: group.sizes.length > 0 ? group.sizes : [defaultVariantSize("M")],
  }));

  return groups.length > 0 ? groups : [defaultVariantGroup()];
};

export const flattenVariantGroups = (variantGroups: VariantGroupFormValue[]): VariantFormValue[] =>
  variantGroups.flatMap((group, groupIndex) => {
    const imageItems = (group.imageItems ?? []).map((item) => ({ ...item }));

    return (group.sizes ?? []).map((sizeItem, sizeIndex) => ({
      variantId: sizeItem.variantId?.trim() || `variant-${groupIndex + 1}-${sizeIndex + 1}`,
      sku: sizeItem.sku?.trim() || "",
      size: sizeItem.size,
      sizeLabel: sizeItem.sizeLabel?.trim() || sizeItem.size,
      stock: sizeItem.stock ?? 0,
      additionalPrice: sizeItem.additionalPrice ?? 0,
      isActive: sizeItem.isActive ?? true,
      colorName: group.colorName?.trim() || "",
      colorHex: group.colorHex?.trim() || "",
      imageItems,
    }));
  });

export const buildVariantSkuPreviewMatrix = (
  variantGroups: VariantGroupFormValue[] = [],
  productSku = "",
) => {
  const matrix: string[][] = [];
  const reservedSkus = new Set<string>();
  const normalizedProductSku = normalizeSkuInput(productSku);

  if (normalizedProductSku) {
    reservedSkus.add(normalizedProductSku);
  }

  let globalIndex = 0;
  variantGroups.forEach((group, groupIndex) => {
    matrix[groupIndex] = [];
    (group.sizes ?? []).forEach((sizeItem, sizeIndex) => {
      const explicitSku = normalizeSkuInput(sizeItem.sku ?? "");
      const requestedSku =
        explicitSku ||
        buildVariantSku({
          productSku,
          colorName: group.colorName ?? "",
          size: sizeItem.size ?? "",
          index: globalIndex,
        });

      matrix[groupIndex][sizeIndex] = makeUniqueSku(requestedSku, reservedSkus);
      globalIndex += 1;
    });
  });

  return matrix;
};

export const getPrimaryImage = (product: Product) =>
  product.media?.find((item) => item.isPrimary)?.url ??
  product.media?.[0]?.url ??
  product.variants?.find((variant) => (variant.images?.length ?? 0) > 0)?.images?.[0];

export const getStock = (product: Product) =>
  product.inventorySummary?.available ?? product.inventorySummary?.total ?? 0;

