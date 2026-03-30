import type {
  CreateFlashSalePayload,
  FlashSale,
} from "../../../services/flashSaleService";
import type { ProductVariant } from "../../../services/productService";

export type FlashSaleFormValues = {
  name: string;
  banner?: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  slots: Array<{
    productId: string;
    variantSku?: string;
    salePrice?: number;
    stockLimit?: number;
    sold?: number;
  }>;
};

export type ActiveFilter = "all" | "active" | "inactive";

export const ACTIVE_FILTER_OPTIONS: { value: ActiveFilter; label: string }[] = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "active", label: "Đang bật" },
  { value: "inactive", label: "Đang tắt" },
];

export const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export const createDefaultSlot = () => ({
  productId: "",
  variantSku: undefined as string | undefined,
  salePrice: 199000,
  stockLimit: 100,
  sold: 0,
});

export const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

export const getFlashSalePhase = (sale: FlashSale) => {
  const now = Date.now();
  const startsAt = new Date(sale.startsAt).getTime();
  const endsAt = new Date(sale.endsAt).getTime();

  if (Number.isNaN(startsAt) || Number.isNaN(endsAt)) {
    return { label: "Không xác định", color: "default" as const };
  }
  if (startsAt > now) {
    return { label: "Sắp diễn ra", color: "blue" as const };
  }
  if (endsAt < now) {
    return { label: "Đã kết thúc", color: "default" as const };
  }
  return { label: "Đang diễn ra", color: "green" as const };
};

export const buildPayload = (
  values: FlashSaleFormValues,
  adminId?: string,
): CreateFlashSalePayload => {
  const normalizedSlots = (values.slots || []).map((slot, index) => {
    const productId = slot.productId?.trim() || "";
    const variantSku = slot.variantSku?.trim() || undefined;
    const salePrice = Number(slot.salePrice);
    const stockLimit = Number(slot.stockLimit);
    const sold = Number(slot.sold ?? 0);

    if (!OBJECT_ID_PATTERN.test(productId)) {
      throw new Error(`Dòng ${index + 1}: sản phẩm chưa hợp lệ.`);
    }
    if (!Number.isFinite(salePrice) || salePrice < 0) {
      throw new Error(`Dòng ${index + 1}: giá flash sale chưa hợp lệ.`);
    }
    if (!Number.isFinite(stockLimit) || stockLimit < 0) {
      throw new Error(`Dòng ${index + 1}: số lượng giới hạn chưa hợp lệ.`);
    }
    if (!Number.isFinite(sold) || sold < 0) {
      throw new Error(`Dòng ${index + 1}: số lượng đã bán chưa hợp lệ.`);
    }
    if (sold > stockLimit) {
      throw new Error(`Dòng ${index + 1}: số lượng đã bán không thể lớn hơn giới hạn.`);
    }

    return {
      productId,
      variantSku,
      salePrice,
      stockLimit,
      sold,
    };
  });

  if (normalizedSlots.length === 0) {
    throw new Error("Vui lòng thêm ít nhất 1 slot flash sale.");
  }

  return {
    name: values.name.trim(),
    banner: values.banner?.trim() || null,
    startsAt: new Date(values.startsAt).toISOString(),
    endsAt: new Date(values.endsAt).toISOString(),
    isActive: values.isActive,
    createdBy: adminId,
    slots: normalizedSlots,
  };
};

export const toDateTimeLocalValue = (value?: string) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

export const getVariantDisplayLabel = (variant: ProductVariant) => {
  const color = variant.color?.name?.trim() || "Mặc định";
  const size = variant.sizeLabel?.trim() || variant.size?.trim() || "Free";
  const stock = Math.max(0, Number(variant.stock || 0));
  return `${variant.sku} • ${color} / ${size} • Tồn ${stock}`;
};
