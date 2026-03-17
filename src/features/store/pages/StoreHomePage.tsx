import {
  ArrowRightOutlined,
  ClockCircleOutlined,
  FireOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  StarFilled,
  ThunderboltOutlined,
  TruckOutlined,
} from "@ant-design/icons";
import { Button, Progress } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  brandConfigService,
  type StorefrontHomeContent,
  type StorefrontHomeValueProp,
} from "../../../services/brandConfigService";
import { categoryService, type Category } from "../../../services/categoryService";
import { flashSaleService } from "../../../services/flashSaleService";
import { productService, type Product } from "../../../services/productService";

const STORE_BRAND_KEY = "rioshop-default";
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000").replace(/\/$/, "");

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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

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
  price: number;
  originalPrice?: number;
  badge?: string;
  rating: number;
  sold: string;
  image: string;
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
    flashSaleMiniTitle: string;
    flashSaleTitle: string;
    flashSaleLinkLabel: string;
    productsMiniTitle: string;
    productsTitle: string;
    productsLinkLabel: string;
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
  };
  apiNotice: string;
};

const DEFAULT_HOME_CONTENT: ResolvedHomeContent = {
  hero: {
    kicker: "Bộ sưu tập Xuân Hè 2026",
    titleLine1: "Giao diện bán hàng",
    titleLine2: "đẹp, rõ ràng và chuyển đổi.",
    description:
      "Trang chủ RioShop được làm mới theo flow mua sắm thực tế: ưu đãi nổi bật, danh mục rõ ràng, deal trong ngày, sản phẩm bán chạy và CTA đăng ký thành viên.",
    primaryCtaLabel: "Mua ngay",
    secondaryCtaLabel: "Xem bộ sưu tập",
    dealDescription: "Giá tốt trong khung giờ vàng, số lượng giới hạn và cập nhật liên tục theo chương trình.",
    sideKicker: "Cập nhật mỗi tuần",
    sideTitleLine1: "Nhiều sản phẩm mới",
    sideTitleLine2: "dành cho mùa mới",
    sideDescription:
      "Tập trung vào form dễ mặc, chất liệu thoáng và bảng màu trung tính để phối đồ nhanh mỗi ngày.",
    dealCtaLabel: "Mua deal này",
    sideCtaLabel: "Khám phá ngay",
    metrics: [
      { value: "4.9/5", label: "Đánh giá trung bình từ khách hàng mua sắm" },
      { value: "24h", label: "Xử lý đơn hàng trong ngày trên toàn hệ thống" },
      { value: "60 ngày", label: "Đổi trả linh hoạt nếu sản phẩm chưa vừa ý" },
    ],
  },
  sections: {
    categoriesMiniTitle: "Danh mục mua nhiều",
    categoriesTitle: "Chọn nhanh theo nhu cầu",
    categoriesLinkLabel: "Xem thêm",
    flashSaleMiniTitle: "Deal hôm nay",
    flashSaleTitle: "Khuyến mãi giờ vàng",
    flashSaleLinkLabel: "Tất cả deal",
    productsMiniTitle: "Best seller",
    productsTitle: "Sản phẩm nổi bật tuần này",
    productsLinkLabel: "Xem tất cả",
  },
  labels: {
    flashDeal: "Flash Deal",
    soldPercentPrefix: "Đã bán",
    soldOutSoon: "Sắp hết hàng",
    dealFallbackTitle: "Ưu đãi trong ngày",
    buyDeal: "Mua deal này",
    exploreNow: "Khám phá ngay",
    noCategories: "Chưa có danh mục phù hợp để hiển thị.",
    noFlashSales: "Hiện chưa có flash sale đang diễn ra.",
    noProducts: "Chưa có sản phẩm nổi bật để hiển thị.",
    loadingCategories: "Đang tải danh mục...",
    loadingFlashSales: "Đang tải flash sale...",
    loadingProducts: "Đang tải sản phẩm nổi bật...",
  },
  valueProps: [
    {
      title: "Giao nhanh 2h nội thành",
      text: "Hỗ trợ giao nhanh tại Hà Nội và TP.HCM với đơn hàng đặt trước 16:00.",
      iconKey: "truck",
    },
    {
      title: "Đổi trả 60 ngày",
      text: "Đổi size, đổi màu hoặc hoàn tiền linh hoạt nếu sản phẩm chưa vừa ý.",
      iconKey: "return",
    },
    {
      title: "Cam kết chính hãng",
      text: "Hoàn 200% nếu phát hiện sản phẩm không đúng chất lượng đã công bố.",
      iconKey: "shield",
    },
  ],
  journal: {
    kicker: "Rio Journal",
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

const resolveImageUrl = (url?: string): string | undefined => {
  if (!url) {
    return undefined;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const normalizedPath = url.startsWith("/") ? url : `/${url}`;
  return `${apiBaseUrl}${normalizedPath}`;
};

const getProductImage = (product: ProductRuntime, fallbackIndex = 0) => {
  const primaryImage = (product.media ?? []).find((item) => item.type === "image" && item.url)?.url;
  return (
    resolveImageUrl(primaryImage) ??
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

const getCategoryBadge = (product: ProductRuntime) => {
  if (product.isBestseller) {
    return "Bán chạy";
  }

  if (product.isNew) {
    return "Mới về";
  }

  if (product.pricing.basePrice > product.pricing.salePrice) {
    return "Ưu đãi";
  }

  return product.category?.name ?? "Nổi bật";
};

const formatSoldText = (value?: number) => {
  if (!value || value <= 0) {
    return "Mới cập nhật";
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k đã bán`;
  }

  return `${value} đã bán`;
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

const mapHomeProduct = (product: ProductRuntime, index: number): HomeProduct => ({
  id: product._id,
  name: product.name,
  slug: product.slug,
  category: getCategoryBadge(product),
  price: product.pricing.salePrice,
  originalPrice: product.pricing.basePrice > product.pricing.salePrice ? product.pricing.basePrice : undefined,
  badge: getDiscountBadge(product.pricing.salePrice, product.pricing.basePrice),
  rating:
    typeof product.ratings?.avg === "number" && product.ratings.avg > 0
      ? Number(product.ratings.avg.toFixed(1))
      : 4.8,
  sold: formatSoldText(product.totalSold),
  image: getProductImage(product, index),
});

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
    result[key as string] = typeof value === "string" && value.trim() ? value : defaults[key];
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
            .map((metric) => ({
              value: metric.value?.trim() || "",
              label: metric.label?.trim() || "",
            }))
            .filter((metric) => metric.value && metric.label)
        : DEFAULT_HOME_CONTENT.hero.metrics,
    },
    sections: mergeStringMap(DEFAULT_HOME_CONTENT.sections, apiHome.sections),
    labels: mergeStringMap(DEFAULT_HOME_CONTENT.labels, apiHome.labels),
    valueProps: (apiHome.valueProps?.length ? apiHome.valueProps : DEFAULT_HOME_CONTENT.valueProps).map(
      (item: StorefrontHomeValueProp) => ({
        title: item.title,
        text: item.text,
        iconKey: item.iconKey ?? "shield",
      }),
    ),
    journal: mergeStringMap(DEFAULT_HOME_CONTENT.journal, apiHome.journal),
    member: mergeStringMap(DEFAULT_HOME_CONTENT.member, apiHome.member),
    apiNotice:
      typeof apiHome.apiNotice === "string" && apiHome.apiNotice.trim()
        ? apiHome.apiNotice
        : DEFAULT_HOME_CONTENT.apiNotice,
  };
};

export function StoreHomePage() {
  const [homeContent, setHomeContent] = useState<ResolvedHomeContent>(DEFAULT_HOME_CONTENT);
  const [quickCategories, setQuickCategories] = useState<HomeCategory[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<HomeProduct[]>([]);
  const [flashDeals, setFlashDeals] = useState<FlashDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showApiNotice, setShowApiNotice] = useState(false);

  useEffect(() => {
    let active = true;

    const loadHomeData = async () => {
      setIsLoading(true);
      setShowApiNotice(false);

      const [brandConfigResult, categoryResult, featuredResult, latestResult, flashSaleResult] =
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
        ]);

      if (!active) {
        return;
      }

      const hasAnyApiError =
        brandConfigResult.status === "rejected" ||
        categoryResult.status === "rejected" ||
        featuredResult.status === "rejected" ||
        latestResult.status === "rejected" ||
        flashSaleResult.status === "rejected";

      if (brandConfigResult.status === "fulfilled") {
        setHomeContent(mergeHomeContent(brandConfigResult.value.storefront?.home));
      } else {
        setHomeContent(DEFAULT_HOME_CONTENT);
      }

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
        .map((item, index) => mapHomeProduct(item, index));

      const categoryCountMap = new Map<string, number>();
      const categorySlugMap = new Map<string, string>();

      uniqueProducts.forEach((product) => {
        const categoryId = product.category?._id;
        if (!categoryId) {
          return;
        }

        categoryCountMap.set(categoryId, (categoryCountMap.get(categoryId) ?? 0) + 1);

        if (!categorySlugMap.has(categoryId) && product.slug) {
          categorySlugMap.set(categoryId, product.slug);
        }
      });

      let mappedCategories: HomeCategory[] = [];

      if (categoryResult.status === "fulfilled") {
        mappedCategories = categoryResult.value.docs
          .map((category: Category, index) => {
            const productCount = categoryCountMap.get(category._id) ?? 0;

            return {
              id: category._id,
              name: category.name,
              count: productCount > 0 ? `${productCount} sản phẩm` : "Đang cập nhật",
              slug: categorySlugMap.get(category._id) ?? highlightedProducts[0]?.slug ?? "ao-thun-airflex-pique",
              image:
                resolveImageUrl(category.image) ??
                FALLBACK_CATEGORY_IMAGES[index % FALLBACK_CATEGORY_IMAGES.length],
              productCount,
            };
          })
          .sort((a, b) => b.productCount - a.productCount)
          .slice(0, 6)
          .map(({ productCount: _productCount, ...rest }) => rest);
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
            slug: product.slug,
            image: getProductImage(product, index),
            productCount: 1,
          });
        });

        mappedCategories = Array.from(derived.values())
          .sort((a, b) => b.productCount - a.productCount)
          .slice(0, 6)
          .map(({ productCount: _productCount, ...rest }) => rest);
      }

      const mappedFlashDeals: FlashDeal[] = [];

      if (flashSaleResult.status === "fulfilled") {
        const currentSale = flashSaleResult.value.docs[0];

        if (currentSale) {
          const timeLeft = formatTimeLeft(currentSale.endsAt);

          currentSale.slots.slice(0, 3).forEach((slot, index) => {
            const product = productById.get(slot.productId);
            const dealName = slot.product?.name ?? product?.name ?? `Deal #${index + 1}`;
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
      setQuickCategories(mappedCategories);
      setFlashDeals(mappedFlashDeals);
      setShowApiNotice(hasAnyApiError);
      setIsLoading(false);
    };

    void loadHomeData();

    return () => {
      active = false;
    };
  }, []);

  const primarySlug = useMemo(
    () => featuredProducts[0]?.slug ?? flashDeals[0]?.slug ?? "ao-thun-airflex-pique",
    [featuredProducts, flashDeals],
  );

  const secondarySlug = useMemo(
    () => featuredProducts[1]?.slug ?? featuredProducts[0]?.slug ?? primarySlug,
    [featuredProducts, primarySlug],
  );

  const heroDeal = flashDeals[0];

  return (
    <div className="home-v2 space-y-8 md:space-y-10">
      {showApiNotice ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {homeContent.apiNotice}
        </div>
      ) : null}

      <section className="home-v2-hero">
        <div className="home-v2-hero-main">
          <p className="home-v2-kicker">{homeContent.hero.kicker}</p>
          <h1 className="m-0 mt-3 text-4xl font-black leading-[1.06] text-white md:text-6xl">
            {homeContent.hero.titleLine1}
            <br />
            {homeContent.hero.titleLine2}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 md:text-lg">
            {homeContent.hero.description}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link to={`/products/${primarySlug}`}>
              <Button type="primary" className="home-v2-btn-primary !h-11 !rounded-full !px-7 !font-bold">
                {homeContent.hero.primaryCtaLabel}
              </Button>
            </Link>
            <Link to={`/products/${secondarySlug}`}>
              <Button className="home-v2-btn-secondary !h-11 !rounded-full !px-7 !font-bold">
                {homeContent.hero.secondaryCtaLabel}
              </Button>
            </Link>
          </div>

          <div className="home-v2-hero-metrics">
            {homeContent.hero.metrics.map((metric) => (
              <div key={`${metric.value}-${metric.label}`} className="home-v2-metric-card">
                <p className="home-v2-metric-value">{metric.value}</p>
                <p className="home-v2-metric-label">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="home-v2-hero-side">
          <article className="home-v2-side-card">
            <div className="home-v2-side-head">
              <span className="home-v2-side-badge">
                <FireOutlined />
                {homeContent.labels.flashDeal}
              </span>
              <span className="home-v2-side-time">
                <ClockCircleOutlined />
                {heroDeal?.timeLeft ?? "00:00:00"}
              </span>
            </div>
            <h3 className="m-0 mt-4 text-xl font-black text-slate-900">
              {heroDeal?.title ?? homeContent.labels.dealFallbackTitle}
            </h3>
            <p className="m-0 mt-2 text-sm text-slate-600">{homeContent.hero.dealDescription}</p>
            <div className="mt-4 flex items-end gap-2">
              <strong className="text-2xl font-black text-slate-900">
                {formatCurrency(heroDeal?.salePrice ?? 0)}
              </strong>
              {heroDeal?.basePrice ? (
                <span className="text-sm text-slate-400 line-through">
                  {formatCurrency(heroDeal.basePrice)}
                </span>
              ) : null}
            </div>
            <Link to={`/products/${heroDeal?.slug ?? primarySlug}`} className="home-v2-inline-link">
              {homeContent.hero.dealCtaLabel || homeContent.labels.buyDeal} <ArrowRightOutlined />
            </Link>
          </article>

          <article className="home-v2-side-card home-v2-side-card-dark">
            <p className="m-0 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
              {homeContent.hero.sideKicker}
            </p>
            <h3 className="m-0 mt-3 text-2xl font-black text-white">
              {homeContent.hero.sideTitleLine1}
              <br />
              {homeContent.hero.sideTitleLine2}
            </h3>
            <p className="m-0 mt-2 text-sm leading-6 text-slate-300">{homeContent.hero.sideDescription}</p>
            <Link to={`/products/${secondarySlug}`} className="home-v2-inline-link home-v2-inline-link-light">
              {homeContent.hero.sideCtaLabel || homeContent.labels.exploreNow} <ArrowRightOutlined />
            </Link>
          </article>
        </aside>
      </section>

      <section>
        <div className="home-v2-head">
          <div>
            <p className="home-v2-mini-title">{homeContent.sections.categoriesMiniTitle}</p>
            <h2 className="m-0 mt-1 text-3xl font-black text-slate-900">{homeContent.sections.categoriesTitle}</h2>
          </div>
          <button type="button" className="home-v2-head-link">
            {homeContent.sections.categoriesLinkLabel} <ArrowRightOutlined />
          </button>
        </div>

        {quickCategories.length > 0 ? (
          <div className="home-v2-category-grid">
            {quickCategories.map((item) => (
              <Link key={item.id} to={`/products/${item.slug}`} className="home-v2-category-card">
                <div className="home-v2-category-image">
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                </div>
                <div className="p-4">
                  <p className="m-0 text-base font-bold text-slate-900">{item.name}</p>
                  <p className="m-0 mt-1 text-sm text-slate-500">{item.count}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
            {isLoading ? homeContent.labels.loadingCategories : homeContent.labels.noCategories}
          </div>
        )}
      </section>

      <section className="home-v2-deal-shell">
        <div className="home-v2-head">
          <div>
            <p className="home-v2-mini-title">{homeContent.sections.flashSaleMiniTitle}</p>
            <h2 className="m-0 mt-1 text-3xl font-black text-slate-900">{homeContent.sections.flashSaleTitle}</h2>
          </div>
          <button type="button" className="home-v2-head-link">
            {homeContent.sections.flashSaleLinkLabel} <ArrowRightOutlined />
          </button>
        </div>

        {flashDeals.length > 0 ? (
          <div className="home-v2-deal-grid">
            {flashDeals.map((deal) => (
              <Link key={deal.id} to={`/products/${deal.slug}`} className="home-v2-deal-card">
                <div className="flex items-center justify-between gap-3">
                  <span className="home-v2-chip">
                    <ThunderboltOutlined />
                    {homeContent.labels.flashDeal}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    <ClockCircleOutlined /> {deal.timeLeft}
                  </span>
                </div>
                <h3 className="m-0 mt-4 text-lg font-black text-slate-900">{deal.title}</h3>
                <div className="mt-3 flex items-end gap-2">
                  <strong className="text-2xl font-black text-slate-900">{formatCurrency(deal.salePrice)}</strong>
                  <span className="text-sm text-slate-400 line-through">{formatCurrency(deal.basePrice)}</span>
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {homeContent.labels.soldPercentPrefix} {deal.soldPercent}%
                    </span>
                    <span>{homeContent.labels.soldOutSoon}</span>
                  </div>
                  <Progress
                    percent={deal.soldPercent}
                    showInfo={false}
                    strokeColor="#0f172a"
                    trailColor="#e2e8f0"
                  />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
            {isLoading ? homeContent.labels.loadingFlashSales : homeContent.labels.noFlashSales}
          </div>
        )}
      </section>

      <section className="home-v2-product-shell">
        <div className="home-v2-head">
          <div>
            <p className="home-v2-mini-title">{homeContent.sections.productsMiniTitle}</p>
            <h2 className="m-0 mt-1 text-3xl font-black text-slate-900">{homeContent.sections.productsTitle}</h2>
          </div>
          <button type="button" className="home-v2-head-link">
            {homeContent.sections.productsLinkLabel} <ArrowRightOutlined />
          </button>
        </div>

        {featuredProducts.length > 0 ? (
          <div className="home-v2-product-grid">
            {featuredProducts.map((product) => {
              const hasDiscount =
                typeof product.originalPrice === "number" && product.originalPrice > product.price;

              return (
                <Link key={product.id} to={`/products/${product.slug}`} className="home-v2-product-card">
                  <div className="home-v2-product-image">
                    <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                    <span className="home-v2-product-badge">{product.category}</span>
                    {hasDiscount && product.badge ? (
                      <span className="home-v2-product-discount">{product.badge}</span>
                    ) : null}
                  </div>

                  <div className="p-4">
                    <h3 className="m-0 min-h-[44px] text-sm font-semibold text-slate-900 md:text-base">
                      {product.name}
                    </h3>
                    <div className="mt-2 flex items-end gap-2">
                      <strong className="text-base font-black text-slate-900 md:text-lg">
                        {formatCurrency(product.price)}
                      </strong>
                      {hasDiscount ? (
                        <span className="text-sm text-slate-400 line-through">
                          {formatCurrency(product.originalPrice ?? product.price)}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 text-amber-500">
                        <StarFilled />
                        {product.rating.toFixed(1)}
                      </span>
                      <span>{product.sold}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
            {isLoading ? homeContent.labels.loadingProducts : homeContent.labels.noProducts}
          </div>
        )}
      </section>

      <section className="home-v2-value-grid">
        {homeContent.valueProps.map((item) => (
          <article key={item.title} className="home-v2-value-card">
            <div className="home-v2-value-icon">{iconByKey[item.iconKey as keyof typeof iconByKey] ?? <ThunderboltOutlined />}</div>
            <div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="home-v2-bottom-grid">
        <article className="home-v2-journal">
          <p className="home-v2-mini-title !text-slate-300">{homeContent.journal.kicker}</p>
          <h2 className="m-0 mt-2 text-4xl font-black leading-tight text-white">
            {homeContent.journal.titleLine1}
            <br />
            {homeContent.journal.titleLine2}
          </h2>
          <p className="m-0 mt-3 max-w-xl text-sm leading-7 text-slate-300 md:text-base">
            {homeContent.journal.description}
          </p>
          <Link to={`/products/${primarySlug}`}>
            <Button className="!mt-6 !h-11 !rounded-full !border-0 !px-7 !font-bold">{homeContent.journal.ctaLabel}</Button>
          </Link>
        </article>

        <article className="home-v2-member-card">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{homeContent.member.kicker}</p>
          <h3 className="m-0 mt-2 text-3xl font-black text-slate-900">{homeContent.member.title}</h3>
          <p className="m-0 mt-2 text-sm leading-7 text-slate-600">{homeContent.member.description}</p>
          <form className="home-v2-newsletter-form" onSubmit={(event) => event.preventDefault()}>
            <input className="home-v2-newsletter-input" placeholder={homeContent.member.emailPlaceholder} />
            <Button type="primary" className="!h-11 !rounded-full !bg-slate-900 !px-6 !font-bold !shadow-none">
              {homeContent.member.ctaLabel}
            </Button>
          </form>
        </article>
      </section>
    </div>
  );
}
