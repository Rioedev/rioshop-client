import {
  ClockCircleOutlined,
  FireOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  StarFilled,
  ThunderboltOutlined,
  TruckOutlined,
} from "@ant-design/icons";
import { Button, Progress, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  brandConfigService,
  type StorefrontHomeContent,
  type StorefrontHomeValueProp,
} from "../../../services/brandConfigService";
import { categoryService, type Category } from "../../../services/categoryService";
import { blogService, type BlogPost } from "../../../services/blogService";
import { couponService, type Coupon } from "../../../services/couponService";
import { flashSaleService } from "../../../services/flashSaleService";
import { productService, type Product } from "../../../services/productService";
import {
  formatStoreCurrency as formatCurrency,
  resolveStoreImageUrl as resolveImageUrl,
  resolveStoreProductThumbnail,
} from "../utils/storeFormatting";
import { useAuthStore } from "../../../stores/authStore";

const STORE_BRAND_KEY = "rioshop-default";
const SAVED_COUPON_STORAGE_KEY = "rioshop_saved_coupons";

const FALLBACK_CATEGORY_IMAGES = [
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1622470953794-aa9c70b0fb9d?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=900&q=80",
];

const FALLBACK_PRODUCT_IMAGES = [
  "https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1593032465171-8bd40f88d5f8?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1595341888016-a392ef81b7de?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1571731956672-f2b94d7dd0cb?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1603251578711-3290ca1a0181?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=900&q=80",
];

type ProductRuntime = Product & {
  ratings?: {
    avg?: number;
    count?: number;
  };
  totalSold?: number;
  viewCount?: number;
};

type HomeCategory = {
  id: string;
  name: string;
  count: string;
  slug: string;
  image: string;
};

type HomeProduct = {
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

type FlashDeal = {
  id: string;
  title: string;
  slug: string;
  salePrice: number;
  basePrice: number;
  soldPercent: number;
  timeLeft: string;
};

type ResolvedHomeContent = {
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

const DEFAULT_HOME_CONTENT: ResolvedHomeContent = {
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

const iconByKey = {
  truck: <TruckOutlined />,
  return: <ReloadOutlined />,
  shield: <SafetyCertificateOutlined />,
  flash: <ThunderboltOutlined />,
};

const getProductImage = (product: ProductRuntime, fallbackIndex = 0) => {
  const primaryImage = resolveStoreProductThumbnail(product);
  return (
    primaryImage ??
    FALLBACK_PRODUCT_IMAGES[fallbackIndex % FALLBACK_PRODUCT_IMAGES.length]
  );
};

const getDiscountBadge = (price: number, originalPrice?: number) => {
  if (!originalPrice || originalPrice <= price) {
    return undefined;
  }

  const percent = Math.round(((originalPrice - price) / originalPrice) * 100);
  return `-${percent}%`;
};

const getCategoryBadge = (product: ProductRuntime, labels: ResolvedHomeContent["labels"]) => {
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

const formatSoldText = (value: number | undefined, labels: ResolvedHomeContent["labels"]) => {
  if (!value || value <= 0) {
    return labels.soldUpdatedLabel;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k ${labels.soldPercentPrefix}`;
  }

  return `${value} ${labels.soldPercentPrefix}`;
};

const normalizeColorHex = (value?: string) => {
  const hex = (value ?? "").trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex) ? hex : "#cbd5e1";
};

const getProductColorSwatches = (product: ProductRuntime) => {
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

const formatTimeLeft = (endsAt: string) => {
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

const readSavedCouponCodes = () => {
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

const writeSavedCouponCodes = (codes: string[]) => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(SAVED_COUPON_STORAGE_KEY, JSON.stringify(codes));
};

const formatCouponValue = (coupon: Coupon) => {
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

const formatCouponCondition = (coupon: Coupon) => {
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

const formatCouponExpiry = (value: string) => {
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

const formatBlogDate = (value?: string) => {
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

const buildTemplateMessage = (
  template: string,
  values: Record<string, string>,
) => Object.keys(values).reduce(
  (messageText, key) => messageText.replaceAll(`{${key}}`, values[key]),
  template,
);

const mapHomeProduct = (
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

const VIETNAMESE_DIACRITIC_REGEX = /[\u00C0-\u024F\u1E00-\u1EFF]/;
const HAS_LETTER_REGEX = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/;

const resolveLocalizedText = (source: string, fallback: string) => {
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

const mergeStringMap = <T extends Record<string, string>>(
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

const mergeHomeContent = (apiHome?: StorefrontHomeContent): ResolvedHomeContent => {
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

export function StoreHomePage() {
  const [messageApi, contextHolder] = message.useMessage();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [homeContent, setHomeContent] = useState<ResolvedHomeContent>(DEFAULT_HOME_CONTENT);
  const [quickCategories, setQuickCategories] = useState<HomeCategory[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<HomeProduct[]>([]);
  const [catalogPool, setCatalogPool] = useState<HomeProduct[]>([]);
  const [flashDeals, setFlashDeals] = useState<FlashDeal[]>([]);
  const [activeCoupons, setActiveCoupons] = useState<Coupon[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [savedCouponCodes, setSavedCouponCodes] = useState<string[]>(() => readSavedCouponCodes());
  const [isLoading, setIsLoading] = useState(true);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [activeQuickCategoryId, setActiveQuickCategoryId] = useState("");

  useEffect(() => {
    writeSavedCouponCodes(savedCouponCodes);
  }, [savedCouponCodes]);

  useEffect(() => {
    let active = true;

    const loadHomeData = async () => {
      setIsLoading(true);

      const [brandConfigResult, categoryResult, featuredResult, latestResult, flashSaleResult, couponResult, blogResult] =
        await Promise.allSettled([
          brandConfigService.getBrandConfig(STORE_BRAND_KEY),
          categoryService.getCategories({ page: 1, limit: 24, isActive: true }),
          productService.getProducts({
            page: 1,
            limit: 20,
            status: "active",
            sort: { isFeatured: -1, isBestseller: -1, totalSold: -1, createdAt: -1 },
          }),
          productService.getProducts({
            page: 1,
            limit: 160,
            status: "active",
            sort: { createdAt: -1 },
          }),
          flashSaleService.getFlashSales({ page: 1, limit: 1, currentOnly: true, isActive: true }),
          couponService.getActiveCoupons({ page: 1, limit: 8 }),
          blogService.getBlogs({ page: 1, limit: 8, isPublished: true }),
        ]);

      if (!active) {
        return;
      }

      const resolvedHomeContent = brandConfigResult.status === "fulfilled"
        ? mergeHomeContent(brandConfigResult.value.storefront?.home)
        : DEFAULT_HOME_CONTENT;

      setHomeContent(resolvedHomeContent);

      const featuredDocs =
        featuredResult.status === "fulfilled" ? (featuredResult.value.docs as ProductRuntime[]) : [];
      const latestDocs = latestResult.status === "fulfilled" ? (latestResult.value.docs as ProductRuntime[]) : [];

      const productById = new Map<string, ProductRuntime>();
      [...featuredDocs, ...latestDocs].forEach((item) => {
        if (!productById.has(item._id)) {
          productById.set(item._id, item);
        }
      });

      const uniqueProducts = Array.from(productById.values());
      const highlightedProducts = (featuredDocs.length > 0 ? featuredDocs : uniqueProducts)
        .slice(0, 8)
        .map((item, index) => mapHomeProduct(item, index, resolvedHomeContent.labels));
      const mappedCatalogPool = uniqueProducts
        .slice(0, 80)
        .map((item, index) => mapHomeProduct(item, index, resolvedHomeContent.labels));

      const categoryCountMap = new Map<string, number>();

      uniqueProducts.forEach((product) => {
        const categoryId = product.category?._id;
        if (!categoryId) {
          return;
        }

        categoryCountMap.set(categoryId, (categoryCountMap.get(categoryId) ?? 0) + 1);

      });

      let mappedCategories: HomeCategory[] = [];

      if (categoryResult.status === "fulfilled") {
        mappedCategories = categoryResult.value.docs
          .map((category: Category, index) => {
            const productCount = categoryCountMap.get(category._id) ?? 0;

            return {
              id: category._id,
              name: category.name,
              count: productCount > 0 ? `${productCount} sản phẩm` : resolvedHomeContent.labels.updatingLabel,
              slug: category.slug || "",
              image:
                resolveImageUrl(category.image) ??
                FALLBACK_CATEGORY_IMAGES[index % FALLBACK_CATEGORY_IMAGES.length],
              productCount,
            };
          })
          .sort((a, b) => b.productCount - a.productCount)
          .slice(0, 6)
          .map((item) => ({
            id: item.id,
            name: item.name,
            count: item.count,
            slug: item.slug,
            image: item.image,
          }));
      } else {
        const derived = new Map<string, HomeCategory & { productCount: number }>();

        uniqueProducts.forEach((product, index) => {
          const categoryId = product.category?._id;
          const categoryName = product.category?.name;

          if (!categoryId || !categoryName) {
            return;
          }

          const current = derived.get(categoryId);
          if (current) {
            current.productCount += 1;
            current.count = `${current.productCount} sản phẩm`;
            return;
          }

          derived.set(categoryId, {
            id: categoryId,
            name: categoryName,
            count: "1 sản phẩm",
            slug: product.category?.slug ?? "",
            image: getProductImage(product, index),
            productCount: 1,
          });
        });

        mappedCategories = Array.from(derived.values())
          .sort((a, b) => b.productCount - a.productCount)
          .slice(0, 6)
          .map((item) => ({
            id: item.id,
            name: item.name,
            count: item.count,
            slug: item.slug,
            image: item.image,
          }));
      }

      const mappedFlashDeals: FlashDeal[] = [];

      if (flashSaleResult.status === "fulfilled") {
        const currentSale = flashSaleResult.value.docs[0];

        if (currentSale) {
          const timeLeft = formatTimeLeft(currentSale.endsAt);

          currentSale.slots.slice(0, 3).forEach((slot, index) => {
            const product = productById.get(slot.productId);
            const dealName = slot.product?.name ?? product?.name ?? `Ưu đãi #${index + 1}`;
            const dealSlug = slot.product?.slug ?? product?.slug ?? highlightedProducts[0]?.slug;

            if (!dealSlug) {
              return;
            }

            const fallbackBasePrice = Math.round(slot.salePrice * 1.2);
            const basePrice =
              product?.pricing.basePrice && product.pricing.basePrice > slot.salePrice
                ? product.pricing.basePrice
                : fallbackBasePrice;

            const soldPercent =
              slot.stockLimit > 0
                ? Math.min(100, Math.round((slot.sold / slot.stockLimit) * 100))
                : 35;

            mappedFlashDeals.push({
              id: `${currentSale.id}-${slot.productId}-${index}`,
              title: dealName,
              slug: dealSlug,
              salePrice: slot.salePrice,
              basePrice,
              soldPercent,
              timeLeft,
            });
          });
        }
      }

      if (mappedFlashDeals.length === 0) {
        highlightedProducts
          .filter((item) => typeof item.originalPrice === "number" && item.originalPrice > item.price)
          .slice(0, 3)
          .forEach((item, index) => {
            mappedFlashDeals.push({
              id: `fallback-${item.id}`,
              title: item.name,
              slug: item.slug,
              salePrice: item.price,
              basePrice: item.originalPrice ?? item.price,
              soldPercent: Math.min(95, 58 + index * 12),
              timeLeft: "23:59:59",
            });
          });
      }

      setFeaturedProducts(highlightedProducts);
      setCatalogPool(mappedCatalogPool.length > 0 ? mappedCatalogPool : highlightedProducts);
      setQuickCategories(mappedCategories);
      setFlashDeals(mappedFlashDeals);
      setActiveCoupons(couponResult.status === "fulfilled" ? couponResult.value.docs : []);
      setBlogPosts(blogResult.status === "fulfilled" ? blogResult.value.docs : []);
      setIsLoading(false);
    };

    void loadHomeData();

    return () => {
      active = false;
    };
  }, []);

  const primarySlug = useMemo(() => featuredProducts[0]?.slug ?? flashDeals[0]?.slug ?? "", [featuredProducts, flashDeals]);
  const secondarySlug = useMemo(() => featuredProducts[1]?.slug ?? featuredProducts[0]?.slug ?? "", [featuredProducts]);
  const productPool = useMemo(() => (catalogPool.length > 0 ? catalogPool : featuredProducts), [catalogPool, featuredProducts]);
  const primaryCtaLink = primarySlug ? `/products/${primarySlug}` : "/products";
  const secondaryCtaLink = secondarySlug ? `/products/${secondarySlug}` : "/products";
  const campaignImage =
    featuredProducts[0]?.image ??
    "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1800&q=80";
  const bestsellingProducts = productPool.slice(4, 8).length > 0 ? productPool.slice(4, 8) : productPool.slice(0, 4);
  const curatedProducts = productPool.slice(8, 12).length > 0 ? productPool.slice(8, 12) : productPool.slice(0, 4);
  const spotlightCategories = quickCategories.slice(0, 5);
  const serviceHighlights = homeContent.valueProps.slice(0, 3);
  const socialStats = [
    { value: `${productPool.length}+`, label: homeContent.labels.productOpenLabel },
    { value: `${quickCategories.length}`, label: homeContent.labels.shoppingCategoryLabel },
    {
      value: flashDeals.length > 0 ? `${flashDeals.length}` : "24h",
      label: flashDeals.length > 0 ? homeContent.labels.activeDealLabel : homeContent.labels.sameDayFulfillmentLabel,
    },
    { value: homeContent.hero.metrics[0]?.value ?? "4.9/5", label: homeContent.hero.metrics[0]?.label ?? "Khách hàng đánh giá cao" },
  ];

  const categoryCollections = useMemo(() => {
    const grouped = new Map<string, HomeProduct[]>();

    productPool.forEach((item) => {
      if (!item.categoryId) {
        return;
      }
      const current = grouped.get(item.categoryId) ?? [];
      if (current.length < 12) {
        current.push(item);
      }
      grouped.set(item.categoryId, current);
    });

    return quickCategories
      .slice(0, 4)
      .map((category, index) => {
        let products = (grouped.get(category.id) ?? []).slice(0, 4);

        if (products.length < 4) {
          const fallback = productPool
            .filter((item) => item.categoryId !== category.id)
            .slice(index * 4, index * 4 + (4 - products.length));
          products = [...products, ...fallback].slice(0, 4);
        }

        return { category, products };
      })
      .filter((item) => item.products.length > 0);
  }, [productPool, quickCategories]);

  const blogCards = useMemo(() => {
    const fallbackImages = [
      "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1622470953794-aa9c70b0fb9d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=1200&q=80",
    ];

    const mappedCategoryLinks = quickCategories.slice(0, 4).map((category) => ({
      href: "/blog",
      image: category.image,
    }));

    const fallbackCards = [
      {
        id: "blog-1",
        date: "23/03/2026",
        title: "Hướng dẫn kiểm tra hạng thành viên RioShop nhanh chóng",
        excerpt: "Mẹo theo dõi quyền lợi và điểm tích lũy để mua sắm tối ưu hơn.",
      },
      {
        id: "blog-2",
        date: "21/03/2026",
        title: "Bí kíp mặc đẹp cùng quần jean rách nam: Cách phối đồ & xu hướng 2026",
        excerpt: "Gợi ý phối đồ thực tế để giữ vẻ ngoài gọn, hiện đại và nam tính.",
      },
      {
        id: "blog-3",
        date: "21/03/2026",
        title: "Bí quyết phối đồ cực chất: Nâng tầm phong cách cùng quần jean áo thun nam",
        excerpt: "Công thức phối nhanh cho đi làm, đi chơi và dạo phố cuối tuần.",
      },
      {
        id: "blog-4",
        date: "21/03/2026",
        title: "Top 15+ kiểu áo mặc với quần jean ống rộng cực tôn dáng, chuẩn gu fashionista",
        excerpt: "Danh sách outfit dễ áp dụng giúp trang phục cân đối và thời trang hơn.",
      },
    ].map((item, index) => ({
      ...item,
      href: mappedCategoryLinks[index]?.href ?? "/blog",
      image: mappedCategoryLinks[index]?.image ?? fallbackImages[index % fallbackImages.length],
    }));

    if (blogPosts.length > 0) {
      return blogPosts.slice(0, 4).map((post, index) => ({
        id: post._id,
        date: formatBlogDate(post.publishedAt || post.createdAt),
        title: post.title?.trim() || fallbackCards[index]?.title || "Bài viết mới",
        excerpt: post.excerpt?.trim() || fallbackCards[index]?.excerpt || "Nội dung đang được cập nhật.",
        href: post.slug?.trim()
          ? `/blog/${encodeURIComponent(post.slug)}`
          : fallbackCards[index]?.href || "/blog",
        image:
          resolveImageUrl(post.coverImage) ||
          mappedCategoryLinks[index]?.image ||
          fallbackImages[index % fallbackImages.length],
      }));
    }

    return fallbackCards;
  }, [blogPosts, quickCategories]);

  const heroSlides = useMemo(() => {
    const source = (featuredProducts.length > 0 ? featuredProducts : productPool).slice(0, 3);

    return source.map((product, index) => ({
      id: product.id,
      image: product.image,
      href: `/products/${product.slug}`,
      secondaryHref: product.categorySlug ? `/products?category=${encodeURIComponent(product.categorySlug)}` : "/products",
      kicker: index === 0 ? homeContent.hero.kicker : product.categoryName ?? homeContent.hero.sideKicker,
      titleLine1: index === 0 ? homeContent.hero.titleLine1 : product.name,
      titleLine2:
        index === 0
          ? homeContent.hero.titleLine2
          : product.categoryName
            ? `${product.categoryName} chọn lọc cho mùa này`
            : homeContent.hero.sideTitleLine2,
      description:
        index === 0
          ? homeContent.hero.description
          : homeContent.hero.sideDescription,
      primaryLabel: index === 0 ? homeContent.hero.primaryCtaLabel : homeContent.labels.buyDeal,
      secondaryLabel: index === 0 ? homeContent.hero.secondaryCtaLabel : homeContent.labels.heroSlideSecondaryLabel,
      priceLabel: formatCurrency(product.price),
      meta: product.sold,
      badge: product.badge ?? (index === 0 ? homeContent.labels.flashDeal : homeContent.labels.exploreNow),
    }));
  }, [featuredProducts, homeContent, productPool]);

  useEffect(() => {
    if (heroSlides.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveHeroIndex((current) => (current + 1) % heroSlides.length);
    }, 5200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [heroSlides.length]);

  const normalizedHeroIndex = heroSlides.length > 0 ? activeHeroIndex % heroSlides.length : 0;
  const activeHeroSlide = heroSlides[normalizedHeroIndex] ?? heroSlides[0];
  const activeQuickCategory = quickCategories.find((item) => item.id === activeQuickCategoryId) ?? quickCategories[0];

  const showcaseProducts = useMemo(() => {
    const preferredCategoryId = activeQuickCategory?.id;
    if (!preferredCategoryId) {
      return productPool.slice(0, 5);
    }

    return productPool.filter((item) => item.categoryId === preferredCategoryId).slice(0, 5);
  }, [activeQuickCategory, productPool]);

  const showcaseLeadProduct = showcaseProducts[0];
  const showcaseRailProducts = showcaseProducts.slice(1, 5);
  const savedCouponCodeSet = useMemo(
    () => new Set(savedCouponCodes.map((code) => code.toUpperCase())),
    [savedCouponCodes],
  );

  const handleSaveCoupon = async (code: string) => {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      return;
    }

    if (savedCouponCodeSet.has(normalizedCode)) {
      messageApi.info(
        buildTemplateMessage(homeContent.labels.couponAlreadySavedMessage, { code: normalizedCode }),
      );
      return;
    }

    setSavedCouponCodes((prev) => [normalizedCode, ...prev].slice(0, 20));

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(normalizedCode);
      }
      messageApi.success(
        buildTemplateMessage(homeContent.labels.couponSavedAndCopiedMessage, { code: normalizedCode }),
      );
    } catch {
      messageApi.success(buildTemplateMessage(homeContent.labels.couponSavedMessage, { code: normalizedCode }));
    }
  };

  const renderProductCard = (product: HomeProduct, large = false) => {
    const hasDiscount = typeof product.originalPrice === "number" && product.originalPrice > product.price;

    return (
      <Link to={`/products/${product.slug}`} className={`store-home-v3-product-card ${large ? "is-large" : ""}`}>
        <div className="store-home-v3-product-media">
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
          <span className="store-home-v3-product-chip">{product.categoryName ?? product.category}</span>
          {hasDiscount && product.badge ? <span className="store-home-v3-product-sale">{product.badge}</span> : null}
        </div>
        <div className="store-home-v3-product-body">
          <p className="store-home-v3-product-meta">{product.category}</p>
          <h3>{product.name}</h3>
          {product.colors && product.colors.length > 0 ? (
            <div className="store-home-v3-product-colors">
              {product.colors.map((color) => (
                <span
                  key={`${product.id}-${color.name}-${color.hex}`}
                  className="store-home-v3-product-color"
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                  aria-label={color.name}
                />
              ))}
            </div>
          ) : null}
          <div className="store-home-v3-price-row">
            <strong>{formatCurrency(product.price)}</strong>
            {hasDiscount ? <span>{formatCurrency(product.originalPrice ?? product.price)}</span> : null}
          </div>
          <div className="store-home-v3-product-foot">
            <span className="inline-flex items-center gap-1 text-amber-500">
              <StarFilled />
              {product.rating.toFixed(1)}
            </span>
            <span>{product.sold}</span>
          </div>
        </div>
      </Link>
    );
  };

  const renderShowcaseCard = (product: HomeProduct) => {
    const hasDiscount = typeof product.originalPrice === "number" && product.originalPrice > product.price;

    return (
      <Link key={`showcase-${product.id}`} to={`/products/${product.slug}`} className="store-home-v3-showcase-item">
        <div className="store-home-v3-showcase-item-media">
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        </div>
        <div className="store-home-v3-showcase-item-copy">
          <p>{product.categoryName ?? product.category}</p>
          <h3>{product.name}</h3>
          <div className="store-home-v3-showcase-item-price">
            <strong>{formatCurrency(product.price)}</strong>
            {hasDiscount ? <span>{formatCurrency(product.originalPrice ?? product.price)}</span> : null}
          </div>
          <div className="store-home-v3-showcase-item-foot">
            <span className="inline-flex items-center gap-1 text-amber-500">
              <StarFilled />
              {product.rating.toFixed(1)}
            </span>
            <span>{product.sold}</span>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="store-home-v3 space-y-8 md:space-y-12">
      {contextHolder}
      {isLoading ? (
        <div className="store-home-v3-notice">{homeContent.labels.loadingHome}</div>
      ) : null}

      <section
        className="store-home-v3-hero store-home-v3-bleed"
        style={{
          backgroundImage: `linear-gradient(118deg, rgba(15, 79, 168, 0.82), rgba(15, 79, 168, 0.24)), url(${activeHeroSlide?.image ?? campaignImage})`,
        }}
      >
        <div className="store-home-v3-hero-inner">
          <div className="store-home-v3-hero-copy">
            <div className="store-home-v3-hero-copy-top">
              <p className="store-home-v3-kicker">{activeHeroSlide?.kicker ?? homeContent.hero.kicker}</p>
              <span className="store-home-v3-hero-badge">{activeHeroSlide?.badge ?? homeContent.labels.flashDeal}</span>
            </div>
            <h1>
              {activeHeroSlide?.titleLine1 ?? homeContent.hero.titleLine1}
              <br />
              {activeHeroSlide?.titleLine2 ?? homeContent.hero.titleLine2}
            </h1>
            <p className="store-home-v3-hero-text">{activeHeroSlide?.description ?? homeContent.hero.description}</p>
            <div className="store-home-v3-hero-actions">
              <Link to={activeHeroSlide?.href ?? primaryCtaLink}>
                <Button type="primary" className="store-home-v3-primary-btn h-12! rounded-full! px-7! font-bold! shadow-none!">
                  {activeHeroSlide?.primaryLabel ?? homeContent.hero.primaryCtaLabel}
                </Button>
              </Link>
              <Link to={activeHeroSlide?.secondaryHref ?? secondaryCtaLink}>
                <Button className="store-home-v3-secondary-btn h-12! rounded-full! px-7! font-bold!">
                  {activeHeroSlide?.secondaryLabel ?? homeContent.hero.secondaryCtaLabel}
                </Button>
              </Link>
            </div>

            <div className="store-home-v3-hero-panel">
              <div className="store-home-v3-hero-panel-item">
                <span>{homeContent.labels.heroPriceLabel}</span>
                <strong>{activeHeroSlide?.priceLabel ?? formatCurrency(featuredProducts[0]?.price ?? 0)}</strong>
              </div>
              <div className="store-home-v3-hero-panel-item">
                <span>{homeContent.labels.heroSignalLabel}</span>
                <strong>{activeHeroSlide?.meta ?? homeContent.hero.metrics[0]?.value ?? homeContent.labels.updatingLabel}</strong>
              </div>
            </div>

            {heroSlides.length > 1 ? (
              <div className="store-home-v3-hero-dots" aria-label="Chọn ảnh nổi bật">
                {heroSlides.map((slide, index) => (
                  <button
                    key={`hero-dot-${slide.id}`}
                    type="button"
                    className={`store-home-v3-hero-dot ${index === normalizedHeroIndex ? "is-active" : ""}`}
                    aria-label={`Hiển thị ảnh nổi bật ${index + 1}`}
                    onClick={() => setActiveHeroIndex(index)}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="store-home-v3-hero-rail">
            {heroSlides.map((slide, index) => (
              <button
                key={`hero-${slide.id}`}
                type="button"
                className={`store-home-v3-hero-mini ${index === normalizedHeroIndex ? "is-active" : ""}`}
                onClick={() => setActiveHeroIndex(index)}
              >
                <div className="store-home-v3-hero-mini-media">
                  <img src={slide.image} alt={slide.titleLine1} className="h-full w-full object-cover" />
                </div>
                <div>
                  <p>{slide.kicker}</p>
                  <h3>{slide.titleLine1}</h3>
                  <strong>{slide.priceLabel}</strong>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="store-home-v3-metric-grid">
        {socialStats.map((item) => (
          <article key={`${item.value}-${item.label}`} className="store-home-v3-metric-card">
            <p>{item.value}</p>
            <span>{item.label}</span>
          </article>
        ))}
      </section>

      <section className="store-home-v3-service-grid">
        {serviceHighlights.map((item) => (
          <article key={item.title} className="store-home-v3-service-card">
            <div className="store-home-v3-service-icon">
              {iconByKey[item.iconKey as keyof typeof iconByKey] ?? <ThunderboltOutlined />}
            </div>
            <div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          </article>
        ))}
      </section>

      {spotlightCategories.length > 0 ? (
        <section className="store-home-v3-section">
          <div className="store-home-v3-section-head">
            <div>
              <p>{homeContent.sections.categoryMosaicKicker}</p>
              <h2>{homeContent.sections.categoriesTitle}</h2>
            </div>
            <Link to="/products" className="store-home-v3-text-link">
              {homeContent.sections.categoriesLinkLabel}
            </Link>
          </div>

          <div className="store-home-v3-category-mosaic">
            <Link
              to={spotlightCategories[0].slug ? `/products?category=${encodeURIComponent(spotlightCategories[0].slug)}` : "/products"}
              className="store-home-v3-category-lead"
              style={{
                backgroundImage: `linear-gradient(130deg, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.16)), url(${spotlightCategories[0].image})`,
              }}
            >
              <span>{spotlightCategories[0].count}</span>
              <h3>{spotlightCategories[0].name}</h3>
            </Link>

            <div className="store-home-v3-category-side">
              {spotlightCategories.slice(1).map((category) => (
                <Link
                  key={`spotlight-${category.id}`}
                  to={category.slug ? `/products?category=${encodeURIComponent(category.slug)}` : "/products"}
                  className="store-home-v3-category-card"
                >
                  <div className="store-home-v3-category-thumb">
                    <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <h3>{category.name}</h3>
                    <p>{category.count}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {showcaseLeadProduct ? (
        <section className="store-home-v3-section store-home-v3-showcase">
          <div className="store-home-v3-section-head">
            <div>
              <p>{homeContent.sections.showcaseKicker}</p>
              <h2>{homeContent.sections.showcaseTitle}</h2>
            </div>
            <div className="store-home-v3-pill-row">
              {quickCategories.slice(0, 6).map((item) => (
                <button
                  key={`pill-${item.id}`}
                  type="button"
                  className={`store-home-v3-pill ${item.id === activeQuickCategory?.id ? "is-active" : ""}`}
                  onClick={() => setActiveQuickCategoryId(item.id)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <div className="store-home-v3-showcase-layout">
            <Link to={`/products/${showcaseLeadProduct.slug}`} className="store-home-v3-showcase-feature">
              <div className="store-home-v3-showcase-copy">
                <span className="store-home-v3-showcase-badge">
                  {activeQuickCategory?.name ?? showcaseLeadProduct.categoryName ?? showcaseLeadProduct.category}
                </span>
                <h3>{showcaseLeadProduct.name}</h3>
                <p>{homeContent.sections.showcaseDescription}</p>
                <div className="store-home-v3-showcase-price">
                  <strong>{formatCurrency(showcaseLeadProduct.price)}</strong>
                  {typeof showcaseLeadProduct.originalPrice === "number" &&
                  showcaseLeadProduct.originalPrice > showcaseLeadProduct.price ? (
                    <span>{formatCurrency(showcaseLeadProduct.originalPrice)}</span>
                  ) : null}
                </div>
                <div className="store-home-v3-showcase-meta">
                  <span className="inline-flex items-center gap-1 text-amber-500">
                    <StarFilled />
                    {showcaseLeadProduct.rating.toFixed(1)}
                  </span>
                  <span>{showcaseLeadProduct.sold}</span>
                </div>
              </div>
              <div className="store-home-v3-showcase-media">
                <img src={showcaseLeadProduct.image} alt={showcaseLeadProduct.name} className="h-full w-full object-cover" />
              </div>
            </Link>

            <div className="store-home-v3-showcase-side">
              {showcaseRailProducts.map((product) => renderShowcaseCard(product))}
            </div>
          </div>
        </section>
      ) : null}

      {flashDeals.length > 0 ? (
        <section className="store-home-v3-flash-shell">
          <div className="store-home-v3-section-head is-light">
            <div>
              <p>{homeContent.sections.flashSaleMiniTitle}</p>
              <h2>{homeContent.sections.flashSaleTitle}</h2>
            </div>
            <Link to="/flash-sales" className="store-home-v3-text-link is-light">
              {homeContent.sections.flashSaleLinkLabel}
            </Link>
          </div>

          <div className="store-home-v3-flash-layout">
            <article className="store-home-v3-flash-feature">
              <span className="store-home-v3-kicker is-light">{homeContent.labels.flashDeal}</span>
              <h3>{flashDeals[0]?.title ?? homeContent.labels.dealFallbackTitle}</h3>
              <p>{homeContent.hero.dealDescription}</p>
              <div className="store-home-v3-flash-price">
                <strong>{formatCurrency(flashDeals[0]?.salePrice ?? 0)}</strong>
                {flashDeals[0]?.basePrice ? <span>{formatCurrency(flashDeals[0].basePrice)}</span> : null}
              </div>
              <div className="store-home-v3-flash-time">
                <ClockCircleOutlined /> {flashDeals[0]?.timeLeft ?? "00:00:00"}
              </div>
              <Progress
                percent={flashDeals[0]?.soldPercent ?? 0}
                showInfo={false}
                strokeColor="#f97316"
                trailColor="rgba(255,255,255,0.16)"
              />
            </article>

            <div className="store-home-v3-flash-list">
              {flashDeals.slice(0, 3).map((deal) => (
                <Link key={`deal-${deal.id}`} to={`/products/${deal.slug}`} className="store-home-v3-flash-card">
                  <div className="store-home-v3-flash-card-head">
                    <span>
                      <FireOutlined /> {homeContent.labels.flashDeal}
                    </span>
                    <small>{deal.timeLeft}</small>
                  </div>
                  <h3>{deal.title}</h3>
                  <div className="store-home-v3-flash-card-price">
                    <strong>{formatCurrency(deal.salePrice)}</strong>
                    <span>{formatCurrency(deal.basePrice)}</span>
                  </div>
                  <Progress percent={deal.soldPercent} showInfo={false} strokeColor="#fb923c" trailColor="#1f2937" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {bestsellingProducts.length > 0 ? (
        <section className="store-home-v3-section">
          <div className="store-home-v3-section-head">
            <div>
              <p>{homeContent.sections.productsMiniTitle}</p>
              <h2>{homeContent.sections.productsTitle}</h2>
            </div>
            <Link to="/products" className="store-home-v3-text-link">
              {homeContent.sections.productsLinkLabel}
            </Link>
          </div>

          <div className="store-home-v3-product-grid">
            {bestsellingProducts.map((product) => (
              <div key={`best-${product.id}`}>{renderProductCard(product)}</div>
            ))}
          </div>
        </section>
      ) : null}

      {curatedProducts.length > 0 ? (
        <section className="store-home-v3-curated">
          <div className="store-home-v3-curated-copy">
            <p className="store-home-v3-kicker">{homeContent.sections.curatedKicker}</p>
            <h2>{homeContent.sections.curatedTitle}</h2>
            <p>{homeContent.sections.curatedDescription}</p>
            <Link to={secondaryCtaLink}>
              <Button className="store-home-v3-secondary-ghost h-11! rounded-full! px-7! font-bold!">
                {homeContent.sections.curatedLinkLabel}
              </Button>
            </Link>
          </div>

          <div className="store-home-v3-product-grid">
            {curatedProducts.map((product) => (
              <div key={`curated-${product.id}`}>{renderProductCard(product)}</div>
            ))}
          </div>
        </section>
      ) : null}

      {categoryCollections.map((block) => (
        <section key={`collection-${block.category.id}`} className="store-home-v3-collection">
          <div
            className="store-home-v3-collection-banner"
            style={{
              backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.16)), url(${block.category.image})`,
            }}
          >
            <div>
              <p>{homeContent.sections.collectionKicker}</p>
              <h2>{block.category.name}</h2>
              <span>{block.category.count}</span>
            </div>
            <Link to={block.category.slug ? `/products?category=${encodeURIComponent(block.category.slug)}` : "/products"}>
              <Button className="store-home-v3-primary-ghost h-11! rounded-full! px-7! font-bold!">
                {homeContent.sections.collectionLinkLabel}
              </Button>
            </Link>
          </div>

          <div className="store-home-v3-product-grid">
            {block.products.map((product) => (
              <div key={`category-${block.category.id}-${product.id}`}>{renderProductCard(product)}</div>
            ))}
          </div>
        </section>
      ))}

      {activeCoupons.length > 0 ? (
        <section className="store-home-v3-section store-home-v3-coupon-shell">
          <div className="store-home-v3-section-head">
            <div>
              <p>{homeContent.sections.couponKicker}</p>
              <h2>{homeContent.sections.couponTitle}</h2>
            </div>
            <Link to="/cart" className="store-home-v3-text-link">
              {homeContent.sections.couponLinkLabel}
            </Link>
          </div>

          <div className="store-home-v3-coupon-grid">
            {activeCoupons.map((coupon) => {
              const normalizedCode = coupon.code.trim().toUpperCase();
              const isSaved = savedCouponCodeSet.has(normalizedCode);

              return (
                <article key={coupon.id} className="store-home-v3-coupon-card">
                  <div className="store-home-v3-coupon-top">
                    <p>{formatCouponValue(coupon)}</p>
                    <span>HSD: {formatCouponExpiry(coupon.expiresAt)}</span>
                  </div>
                  <h3>{normalizedCode}</h3>
                  <p>{coupon.description?.trim() || formatCouponCondition(coupon)}</p>
                  <div className="store-home-v3-coupon-actions">
                    <Button
                      className="store-home-v3-primary-ghost h-10! rounded-full! px-5! font-bold!"
                      onClick={() => void handleSaveCoupon(normalizedCode)}
                    >
                      {isSaved ? homeContent.labels.couponSavedLabel : homeContent.labels.couponSaveLabel}
                    </Button>
                    <span>{formatCouponCondition(coupon)}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="store-home-v3-member-shell">
        <article className="store-home-v3-member-card">
          <p>{homeContent.member.kicker}</p>
          <h2>{isAuthenticated ? homeContent.member.loggedInTitle : homeContent.member.title}</h2>
          <p>{isAuthenticated ? homeContent.member.loggedInDescription : homeContent.member.description}</p>
          {isAuthenticated ? (
            <Link to="/products">
              <Button type="primary" className="store-home-v3-primary-btn h-11! rounded-full! px-6! font-bold! shadow-none!">
                {homeContent.member.loggedInCtaLabel}
              </Button>
            </Link>
          ) : (
            <form className="store-home-v3-member-form" onSubmit={(event) => event.preventDefault()}>
              <input placeholder={homeContent.member.emailPlaceholder} />
              <Button type="primary" className="store-home-v3-primary-btn h-11! rounded-full! px-6! font-bold! shadow-none!">
                {homeContent.member.ctaLabel}
              </Button>
            </form>
          )}
        </article>

        <div className="store-home-v3-proof-list">
          {homeContent.hero.metrics.map((metric) => (
            <article key={`proof-${metric.value}-${metric.label}`} className="store-home-v3-proof-card">
              <strong>{metric.value}</strong>
              <p>{metric.label}</p>
            </article>
          ))}
        </div>
      </section>

      {blogCards.length > 0 ? (
        <section className="store-home-v3-blog">
          <div className="store-home-v3-blog-head">
            <p>Tin tức thời trang</p>
            <h2>BLOG RIOSHOP</h2>
          </div>

          <div className="store-home-v3-blog-grid">
            {blogCards.map((card) => (
              <article key={card.id} className="store-home-v3-blog-card">
                <Link to={card.href} className="store-home-v3-blog-media">
                  <img src={card.image} alt={card.title} className="h-full w-full object-cover" />
                </Link>
                <p className="store-home-v3-blog-date">Ngày đăng: {card.date}</p>
                <Link to={card.href} className="store-home-v3-blog-title">
                  {card.title}
                </Link>
                <p className="store-home-v3-blog-excerpt">{card.excerpt}</p>
              </article>
            ))}
          </div>

          <div className="store-home-v3-blog-action">
            <Link to="/blog">
              <Button className="store-home-v3-secondary-ghost h-11! rounded-full! px-8! font-bold!">
                Xem thêm
              </Button>
            </Link>
          </div>
        </section>
      ) : null}

    </div>
  );
}


