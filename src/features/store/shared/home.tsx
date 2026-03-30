import {
  ReloadOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  TruckOutlined,
} from "@ant-design/icons";
import {
  type StorefrontHomeContent,
  type StorefrontHomeValueProp,
} from "../../../services/brandConfigService";
import { type Coupon } from "../../../services/couponService";
import { type Product } from "../../../services/productService";
import {
  formatStoreCurrency as formatCurrency,
  resolveStoreProductThumbnail,
} from "../utils/storeFormatting";

export const SAVED_COUPON_STORAGE_KEY = "rioshop_saved_coupons";

export const FALLBACK_CATEGORY_IMAGES = [
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1622470953794-aa9c70b0fb9d?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=900&q=80",
];

export const FALLBACK_PRODUCT_IMAGES = [
  "https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1593032465171-8bd40f88d5f8?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1595341888016-a392ef81b7de?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1571731956672-f2b94d7dd0cb?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1603251578711-3290ca1a0181?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=900&q=80",
];

export type ProductRuntime = Product & {
  ratings?: {
    avg?: number;
    count?: number;
  };
  totalSold?: number;
  viewCount?: number;
};

export type HomeCategory = {
  id: string;
  name: string;
  count: string;
  slug: string;
  image: string;
};

export type HomeProduct = {
  id: string;
  name: string;
  slug: string;
  category: string;
  categoryId?: string;
  categoryName?: string;
  categorySlug?: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  rating: number;
  sold: string;
  image: string;
  colors?: Array<{ name: string; hex: string }>;
};

export type FlashDeal = {
  id: string;
  title: string;
  slug: string;
  salePrice: number;
  basePrice: number;
  soldPercent: number;
  timeLeft: string;
};

export type ResolvedHomeContent = {
  hero: {
    kicker: string;
    titleLine1: string;
    titleLine2: string;
    description: string;
    primaryCtaLabel: string;
    secondaryCtaLabel: string;
    dealDescription: string;
    sideKicker: string;
    sideTitleLine1: string;
    sideTitleLine2: string;
    sideDescription: string;
    dealCtaLabel: string;
    sideCtaLabel: string;
    metrics: Array<{ value: string; label: string }>;
  };
  sections: {
    categoriesMiniTitle: string;
    categoriesTitle: string;
    categoriesLinkLabel: string;
    categoryMosaicKicker: string;
    showcaseKicker: string;
    showcaseTitle: string;
    showcaseDescription: string;
    flashSaleMiniTitle: string;
    flashSaleTitle: string;
    flashSaleLinkLabel: string;
    productsMiniTitle: string;
    productsTitle: string;
    productsLinkLabel: string;
    curatedKicker: string;
    curatedTitle: string;
    curatedDescription: string;
    curatedLinkLabel: string;
    collectionKicker: string;
    collectionLinkLabel: string;
    couponKicker: string;
    couponTitle: string;
    couponLinkLabel: string;
  };
  labels: {
    flashDeal: string;
    soldPercentPrefix: string;
    soldOutSoon: string;
    dealFallbackTitle: string;
    buyDeal: string;
    exploreNow: string;
    noCategories: string;
    noFlashSales: string;
    noProducts: string;
    loadingCategories: string;
    loadingFlashSales: string;
    loadingProducts: string;
    loadingHome: string;
    heroPriceLabel: string;
    heroSignalLabel: string;
    heroSlideSecondaryLabel: string;
    updatingLabel: string;
    productOpenLabel: string;
    shoppingCategoryLabel: string;
    activeDealLabel: string;
    sameDayFulfillmentLabel: string;
    topCategoryBadgeLabel: string;
    categoryDefaultBadge: string;
    categoryBestSellerBadge: string;
    categoryNewBadge: string;
    categoryPromotionBadge: string;
    soldUpdatedLabel: string;
    couponSavedLabel: string;
    couponSaveLabel: string;
    couponAlreadySavedMessage: string;
    couponSavedAndCopiedMessage: string;
    couponSavedMessage: string;
    viewCategoryLabel: string;
  };
  valueProps: Array<{
    title: string;
    text: string;
    iconKey: string;
  }>;
  journal: {
    kicker: string;
    titleLine1: string;
    titleLine2: string;
    description: string;
    ctaLabel: string;
  };
  member: {
    kicker: string;
    title: string;
    description: string;
    emailPlaceholder: string;
    ctaLabel: string;
    loggedInTitle: string;
    loggedInDescription: string;
    loggedInCtaLabel: string;
  };
  apiNotice: string;
};

export const DEFAULT_HOME_CONTENT: ResolvedHomeContent = {
  hero: {
    kicker: "Bộ sưu tập Xuân Hè 2026",
    titleLine1: "Mua sắm hiện đại,",
    titleLine2: "rõ ràng về chất, đơn nhanh.",
    description:
      "Trang chủ RioShop được thiết kế theo luồng mua sắm thực tế: chiến dịch nổi bật, danh mục dễ duyệt, ưu đãi trong ngày, sản phẩm bán chạy và nút hành động rõ ràng để khách vào là biết nên mua gì.",
    primaryCtaLabel: "Mua ngay",
    secondaryCtaLabel: "Xem bộ sưu tập",
    dealDescription: "Giá tốt trong khung giờ vàng, số lượng giới hạn và được làm nổi bật để khách dễ quyết định hơn.",
    sideKicker: "Cập nhật mỗi tuần",
    sideTitleLine1: "Nhiều sản phẩm mới",
    sideTitleLine2: "cho tủ đồ mùa này",
    sideDescription:
      "Tập trung vào form dễ mặc, chất liệu thoáng và bảng màu trung tính để phối nhanh mỗi ngày.",
    dealCtaLabel: "Mua ưu đãi này",
    sideCtaLabel: "Khám phá ngay",
    metrics: [
      { value: "4.9/5", label: "Đánh giá trung bình từ khách hàng mua sắm" },
      { value: "24h", label: "Xử lý đơn hàng nhanh trong ngày trên toàn hệ thống" },
      { value: "60 ngày", label: "Đổi trả linh hoạt nếu sản phẩm chưa vừa ý" },
    ],
  },
  sections: {
    categoriesMiniTitle: "Danh mục mua nhiều",
    categoriesTitle: "Chọn nhanh theo nhu cầu",
    categoriesLinkLabel: "Xem thêm",
    categoryMosaicKicker: "Khám phá theo danh mục",
    showcaseKicker: "Mua nhanh hôm nay",
    showcaseTitle: "Sản phẩm dễ chọn, dễ mua và đúng nhu cầu đang xem",
    showcaseDescription:
      "Gợi ý nổi bật trong danh mục đang được xem, ưu tiên sản phẩm có giá tốt, phom dễ mặc và tỷ lệ chuyển đổi cao hơn cho khu vực đầu trang.",
    flashSaleMiniTitle: "Ưu đãi hôm nay",
    flashSaleTitle: "Khuyến mại giờ vàng",
    flashSaleLinkLabel: "Tất cả ưu đãi",
    productsMiniTitle: "Bán chạy",
    productsTitle: "Sản phẩm nổi bật tuần này",
    productsLinkLabel: "Xem tất cả",
    curatedKicker: "Chọn sẵn cho bạn",
    curatedTitle: "Phối nhanh, mua gọn, hợp nhiều tình huống sử dụng",
    curatedDescription:
      "",
    curatedLinkLabel: "Khám phá thêm",
    collectionKicker: "Danh mục nổi bật",
    collectionLinkLabel: "Xem danh mục",
    couponKicker: "Ưu đãi đang chạy",
    couponTitle: "Lưu nhanh mã giảm giá trước khi thanh toán",
    couponLinkLabel: "Áp mã tại giỏ hàng",
  },
  labels: {
    flashDeal: "Ưu đãi nổi bật",
    soldPercentPrefix: "Đã bán",
    soldOutSoon: "Sắp hết hàng",
    dealFallbackTitle: "Ưu đãi trong ngày",
    buyDeal: "Mua ưu đãi này",
    exploreNow: "Khám phá ngay",
    noCategories: "Chưa có danh mục phù hợp để hiển thị.",
    noFlashSales: "Hiện chưa có chương trình ưu đãi đang diễn ra.",
    noProducts: "Chưa có sản phẩm nổi bật để hiển thị.",
    loadingCategories: "Đang tải danh mục...",
    loadingFlashSales: "Đang tải ưu đãi...",
    loadingProducts: "Đang tải sản phẩm nổi bật...",
    loadingHome: "Đang tải dữ liệu trang chủ...",
    heroPriceLabel: "Giá nổi bật",
    heroSignalLabel: "Tín hiệu mua sắm",
    heroSlideSecondaryLabel: "Xem danh mục",
    updatingLabel: "Đang cập nhật",
    productOpenLabel: "Sản phẩm đang mở bán",
    shoppingCategoryLabel: "Danh mục mua sắm",
    activeDealLabel: "Ưu đãi đang chạy",
    sameDayFulfillmentLabel: "Xử lý đơn trong ngày",
    topCategoryBadgeLabel: "Nổi bật",
    categoryDefaultBadge: "Nổi bật",
    categoryBestSellerBadge: "Bán chạy",
    categoryNewBadge: "Mới về",
    categoryPromotionBadge: "Ưu đãi",
    soldUpdatedLabel: "Mới cập nhật",
    couponSavedLabel: "Đã lưu",
    couponSaveLabel: "Lưu mã",
    couponAlreadySavedMessage: "Mã {code} đã có trong ví ưu đãi của bạn.",
    couponSavedAndCopiedMessage: "Đã lưu và sao chép mã {code}.",
    couponSavedMessage: "Đã lưu mã {code}.",
    viewCategoryLabel: "Xem danh mục",
  },
  valueProps: [
    {
      title: "Giao nhanh 2h nội thành",
      text: "Hỗ trợ giao nhanh tại Hà Nội và TP.HCM với đơn hàng đặt trước 16:00.",
      iconKey: "truck",
    },
    {
      title: "Đổi trả 60 ngày",
      text: "Đổi cỡ, đổi màu hoặc hoàn tiền linh hoạt nếu sản phẩm chưa vừa ý.",
      iconKey: "return",
    },
    {
      title: "Cam kết chính hãng",
      text: "Hoàn 200% nếu phát hiện sản phẩm không đúng chất lượng đã công bố.",
      iconKey: "shield",
    },
  ],
  journal: {
    kicker: "Tạp chí Rio",
    titleLine1: "Mặc đẹp mỗi ngày,",
    titleLine2: "đơn giản hơn.",
    description: "Gợi ý outfit theo tình huống thực tế: đi làm, đi chơi, tập luyện và du lịch cuối tuần.",
    ctaLabel: "Xem lookbook",
  },
  member: {
    kicker: "Rio Member",
    title: "Nhận ưu đãi 10% cho đơn đầu",
    description: "Đăng ký để nhận mã giảm giá, thông báo deal mới và các đợt mở bán sớm cho thành viên.",
    emailPlaceholder: "Nhập email của bạn",
    ctaLabel: "Đăng ký",
    loggedInTitle: "Bạn đã là Rio Member",
    loggedInDescription: "Tài khoản của bạn đang ở trạng thái thành viên. Hãy lưu mã giảm giá và mua sắm để nhận thêm ưu đãi.",
    loggedInCtaLabel: "Mua sắm ngay",
  },
  apiNotice:
    "Một phần dữ liệu trang chủ đang tạm thời dùng phương án dự phòng do API chưa phản hồi đầy đủ.",
};

export const iconByKey = {
  truck: <TruckOutlined />,
  return: <ReloadOutlined />,
  shield: <SafetyCertificateOutlined />,
  flash: <ThunderboltOutlined />,
};

export const getProductImage = (product: ProductRuntime, fallbackIndex = 0) => {
  const primaryImage = resolveStoreProductThumbnail(product);
  return (
    primaryImage ??
    FALLBACK_PRODUCT_IMAGES[fallbackIndex % FALLBACK_PRODUCT_IMAGES.length]
  );
};

export const getDiscountBadge = (price: number, originalPrice?: number) => {
  if (!originalPrice || originalPrice <= price) {
    return undefined;
  }

  const percent = Math.round(((originalPrice - price) / originalPrice) * 100);
  return `-${percent}%`;
};

export const getCategoryBadge = (product: ProductRuntime, labels: ResolvedHomeContent["labels"]) => {
  if (product.isBestseller) {
    return labels.categoryBestSellerBadge;
  }

  if (product.isNew) {
    return labels.categoryNewBadge;
  }

  if (product.pricing.basePrice > product.pricing.salePrice) {
    return labels.categoryPromotionBadge;
  }

  return product.category?.name ?? labels.categoryDefaultBadge;
};

export const formatSoldText = (value: number | undefined, labels: ResolvedHomeContent["labels"]) => {
  if (!value || value <= 0) {
    return labels.soldUpdatedLabel;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k ${labels.soldPercentPrefix}`;
  }

  return `${value} ${labels.soldPercentPrefix}`;
};

export const normalizeColorHex = (value?: string) => {
  const hex = (value ?? "").trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex) ? hex : "#cbd5e1";
};

export const getProductColorSwatches = (product: ProductRuntime) => {
  const variants = (product.variants ?? []).filter((variant) => variant.isActive !== false);
  const seen = new Set<string>();
  const results: Array<{ name: string; hex: string }> = [];

  variants.forEach((variant) => {
    const rawHex = normalizeColorHex(variant.color?.hex);
    const name = (variant.color?.name ?? "").trim() || rawHex;
    const key = `${name.toLowerCase()}-${rawHex.toLowerCase()}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    results.push({ name, hex: rawHex });
  });

  return results.slice(0, 4);
};

export const formatTimeLeft = (endsAt: string) => {
  const diff = new Date(endsAt).getTime() - Date.now();

  if (!Number.isFinite(diff) || diff <= 0) {
    return "00:00:00";
  }

  const totalSeconds = Math.floor(diff / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
};

export const readSavedCouponCodes = () => {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const raw = localStorage.getItem(SAVED_COUPON_STORAGE_KEY);
    if (!raw) {
      return [] as string[];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [] as string[];
    }

    return parsed
      .map((entry) => (typeof entry === "string" ? entry.trim().toUpperCase() : ""))
      .filter(Boolean);
  } catch {
    return [] as string[];
  }
};

export const writeSavedCouponCodes = (codes: string[]) => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(SAVED_COUPON_STORAGE_KEY, JSON.stringify(codes));
};

export const formatCouponValue = (coupon: Coupon) => {
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

export const formatCouponCondition = (coupon: Coupon) => {
  const conditions: string[] = [];

  if (Number(coupon.minOrderValue || 0) > 0) {
    conditions.push(`Đơn tối thiểu ${formatCurrency(Number(coupon.minOrderValue))}`);
  }

  if (Number(coupon.maxDiscount || 0) > 0) {
    conditions.push(`Giảm tối đa ${formatCurrency(Number(coupon.maxDiscount))}`);
  }

  if (Number(coupon.perUserLimit || 0) > 0) {
    conditions.push(`Mỗi khách dùng tối đa ${coupon.perUserLimit} lần`);
  }

  return conditions.length > 0 ? conditions.join(" • ") : "Áp dụng theo điều kiện chương trình";
};

export const formatCouponExpiry = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Hạn dùng đang cập nhật";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const formatBlogDate = (value?: string) => {
  if (!value) {
    return "Cập nhật gần đây";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Cập nhật gần đây";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

export const buildTemplateMessage = (
  template: string,
  values: Record<string, string>,
) => Object.keys(values).reduce(
  (messageText, key) => messageText.replaceAll(`{${key}}`, values[key]),
  template,
);

export const mapHomeProduct = (
  product: ProductRuntime,
  index: number,
  labels: ResolvedHomeContent["labels"],
): HomeProduct => ({
  id: product._id,
  name: product.name,
  slug: product.slug,
  category: getCategoryBadge(product, labels),
  categoryId: product.category?._id,
  categoryName: product.category?.name,
  categorySlug: product.category?.slug,
  price: product.pricing.salePrice,
  originalPrice: product.pricing.basePrice > product.pricing.salePrice ? product.pricing.basePrice : undefined,
  badge: getDiscountBadge(product.pricing.salePrice, product.pricing.basePrice),
  rating:
    typeof product.ratings?.avg === "number" && product.ratings.avg > 0
      ? Number(product.ratings.avg.toFixed(1))
      : 4.8,
  sold: formatSoldText(product.totalSold, labels),
  image: getProductImage(product, index),
  colors: getProductColorSwatches(product),
});

export const VIETNAMESE_DIACRITIC_REGEX = /[\u00C0-\u024F\u1E00-\u1EFF]/;
export const HAS_LETTER_REGEX = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/;

export const resolveLocalizedText = (source: string, fallback: string) => {
  const value = source.trim();
  if (!value) {
    return fallback;
  }

  if (!HAS_LETTER_REGEX.test(value)) {
    return value;
  }

  const fallbackHasDiacritic = VIETNAMESE_DIACRITIC_REGEX.test(fallback);
  const valueHasDiacritic = VIETNAMESE_DIACRITIC_REGEX.test(value);

  if (fallbackHasDiacritic && !valueHasDiacritic) {
    return fallback;
  }

  return value;
};

export const mergeStringMap = <T extends Record<string, string>>(
  defaults: T,
  source?: Partial<Record<keyof T, string | null>>,
): T => {
  const result: Record<string, string> = { ...defaults };

  if (!source) {
    return result as T;
  }

  (Object.keys(defaults) as Array<keyof T>).forEach((key) => {
    const value = source[key];
    result[key as string] = typeof value === "string"
      ? resolveLocalizedText(value, defaults[key])
      : defaults[key];
  });

  return result as T;
};

export const mergeHomeContent = (apiHome?: StorefrontHomeContent): ResolvedHomeContent => {
  if (!apiHome) {
    return DEFAULT_HOME_CONTENT;
  }

  const heroText = mergeStringMap(
    {
      kicker: DEFAULT_HOME_CONTENT.hero.kicker,
      titleLine1: DEFAULT_HOME_CONTENT.hero.titleLine1,
      titleLine2: DEFAULT_HOME_CONTENT.hero.titleLine2,
      description: DEFAULT_HOME_CONTENT.hero.description,
      primaryCtaLabel: DEFAULT_HOME_CONTENT.hero.primaryCtaLabel,
      secondaryCtaLabel: DEFAULT_HOME_CONTENT.hero.secondaryCtaLabel,
      dealDescription: DEFAULT_HOME_CONTENT.hero.dealDescription,
      sideKicker: DEFAULT_HOME_CONTENT.hero.sideKicker,
      sideTitleLine1: DEFAULT_HOME_CONTENT.hero.sideTitleLine1,
      sideTitleLine2: DEFAULT_HOME_CONTENT.hero.sideTitleLine2,
      sideDescription: DEFAULT_HOME_CONTENT.hero.sideDescription,
      dealCtaLabel: DEFAULT_HOME_CONTENT.hero.dealCtaLabel,
      sideCtaLabel: DEFAULT_HOME_CONTENT.hero.sideCtaLabel,
    },
    apiHome.hero,
  );

  return {
    hero: {
      ...heroText,
      metrics: apiHome.hero?.metrics?.length
        ? apiHome.hero.metrics
            .map((metric, index) => {
              const fallbackMetric = DEFAULT_HOME_CONTENT.hero.metrics[index];
              const value = resolveLocalizedText(
                metric.value?.trim() || "",
                fallbackMetric?.value ?? "",
              );
              const label = resolveLocalizedText(
                metric.label?.trim() || "",
                fallbackMetric?.label ?? "",
              );

              return { value, label };
            })
            .filter((metric) => metric.value && metric.label)
        : DEFAULT_HOME_CONTENT.hero.metrics,
    },
    sections: mergeStringMap(DEFAULT_HOME_CONTENT.sections, apiHome.sections),
    labels: mergeStringMap(DEFAULT_HOME_CONTENT.labels, apiHome.labels),
    valueProps: (apiHome.valueProps?.length ? apiHome.valueProps : DEFAULT_HOME_CONTENT.valueProps).map(
      (item: StorefrontHomeValueProp, index) => {
        const fallback = DEFAULT_HOME_CONTENT.valueProps[index];
        return {
          title: resolveLocalizedText(item.title, fallback?.title ?? item.title),
          text: resolveLocalizedText(item.text, fallback?.text ?? item.text),
          iconKey: item.iconKey ?? "shield",
        };
      },
    ),
    journal: mergeStringMap(DEFAULT_HOME_CONTENT.journal, apiHome.journal),
    member: mergeStringMap(DEFAULT_HOME_CONTENT.member, apiHome.member),
    apiNotice:
      typeof apiHome.apiNotice === "string" && apiHome.apiNotice.trim()
        ? resolveLocalizedText(apiHome.apiNotice, DEFAULT_HOME_CONTENT.apiNotice)
        : DEFAULT_HOME_CONTENT.apiNotice,
  };
};




