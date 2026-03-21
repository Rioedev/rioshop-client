import {
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
import {
  formatStoreCurrency as formatCurrency,
  resolveStoreImageUrl as resolveImageUrl,
  resolveStoreProductThumbnail,
} from "../utils/storeFormatting";

const STORE_BRAND_KEY = "rioshop-default";

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
    kicker: "B? s?u t?p Xu?n H? 2026",
    titleLine1: "Mua s?m hi?n ??i,",
    titleLine2: "r? r?ng v? ch?t ??n nhanh.",
    description:
      "Trang ch? RioShop ???c thi?t k? theo flow mua s?m th?c t?: chi?n d?ch n?i b?t, danh m?c d? duy?t, deal trong ng?y, s?n ph?m b?n ch?y v? CTA r? r?ng ?? kh?ch v?o l? bi?t n?n mua g?.",
    primaryCtaLabel: "Mua ngay",
    secondaryCtaLabel: "Xem b? s?u t?p",
    dealDescription: "Gi? t?t trong khung gi? v?ng, s? l??ng gi?i h?n v? ???c l?m n?i b?t ?? kh?ch d? quy?t ??nh h?n.",
    sideKicker: "C?p nh?t m?i tu?n",
    sideTitleLine1: "Nhi?u s?n ph?m m?i",
    sideTitleLine2: "cho t? ?? m?a n?y",
    sideDescription:
      "T?p trung v?o form d? m?c, ch?t li?u tho?ng v? b?ng m?u trung t?nh ?? ph?i nhanh m?i ng?y.",
    dealCtaLabel: "Mua deal n?y",
    sideCtaLabel: "Kh?m ph? ngay",
    metrics: [
      { value: "4.9/5", label: "??nh gi? trung b?nh t? kh?ch h?ng mua s?m" },
      { value: "24h", label: "X? l? ??n h?ng nhanh trong ng?y tr?n to?n h? th?ng" },
      { value: "60 ng?y", label: "??i tr? linh ho?t n?u s?n ph?m ch?a v?a ?" },
    ],
  },
  sections: {
    categoriesMiniTitle: "Danh m?c mua nhi?u",
    categoriesTitle: "Ch?n nhanh theo nhu c?u",
    categoriesLinkLabel: "Xem th?m",
    flashSaleMiniTitle: "Deal h?m nay",
    flashSaleTitle: "Khuy?n m?i gi? v?ng",
    flashSaleLinkLabel: "T?t c? deal",
    productsMiniTitle: "Best seller",
    productsTitle: "S?n ph?m n?i b?t tu?n n?y",
    productsLinkLabel: "Xem t?t c?",
  },
  labels: {
    flashDeal: "Flash Deal",
    soldPercentPrefix: "?? b?n",
    soldOutSoon: "S?p h?t h?ng",
    dealFallbackTitle: "?u ??i trong ng?y",
    buyDeal: "Mua deal n?y",
    exploreNow: "Kh?m ph? ngay",
    noCategories: "Ch?a c? danh m?c ph? h?p ?? hi?n th?.",
    noFlashSales: "Hi?n ch?a c? flash sale ?ang di?n ra.",
    noProducts: "Ch?a c? s?n ph?m n?i b?t ?? hi?n th?.",
    loadingCategories: "?ang t?i danh m?c...",
    loadingFlashSales: "?ang t?i flash sale...",
    loadingProducts: "?ang t?i s?n ph?m n?i b?t...",
  },
  valueProps: [
    {
      title: "Giao nhanh 2h n?i th?nh",
      text: "H? tr? giao nhanh t?i H? N?i v? TP.HCM v?i ??n h?ng ??t tr??c 16:00.",
      iconKey: "truck",
    },
    {
      title: "??i tr? 60 ng?y",
      text: "??i size, ??i m?u ho?c ho?n ti?n linh ho?t n?u s?n ph?m ch?a v?a ?.",
      iconKey: "return",
    },
    {
      title: "Cam k?t ch?nh h?ng",
      text: "Ho?n 200% n?u ph?t hi?n s?n ph?m kh?ng ??ng ch?t l??ng ?? c?ng b?.",
      iconKey: "shield",
    },
  ],
  journal: {
    kicker: "Rio Journal",
    titleLine1: "M?c ??p m?i ng?y,",
    titleLine2: "??n gi?n h?n.",
    description: "G?i ? outfit theo t?nh hu?ng th?c t?: ?i l?m, ?i ch?i, t?p luy?n v? du l?ch cu?i tu?n.",
    ctaLabel: "Xem lookbook",
  },
  member: {
    kicker: "Rio Member",
    title: "Nh?n ?u ??i 10% cho ??n ??u",
    description: "??ng k? ?? nh?n m? gi?m gi?, th?ng b?o deal m?i v? c?c ??t m? b?n s?m cho th?nh vi?n.",
    emailPlaceholder: "Nh?p email c?a b?n",
    ctaLabel: "??ng k?",
  },
  apiNotice:
    "M?t ph?n d? li?u trang ch? ?ang t?m th?i d?ng ph??ng ?n d? ph?ng do API ch?a ph?n h?i ??y ??.",
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
  const [catalogPool, setCatalogPool] = useState<HomeProduct[]>([]);
  const [flashDeals, setFlashDeals] = useState<FlashDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [activeQuickCategoryId, setActiveQuickCategoryId] = useState("");

  useEffect(() => {
    let active = true;

    const loadHomeData = async () => {
      setIsLoading(true);

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
      const mappedCatalogPool = uniqueProducts.slice(0, 80).map((item, index) => mapHomeProduct(item, index));

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
              count: productCount > 0 ? `${productCount} sản phẩm` : "Đang cập nhật",
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
      setCatalogPool(mappedCatalogPool.length > 0 ? mappedCatalogPool : highlightedProducts);
      setQuickCategories(mappedCategories);
      setFlashDeals(mappedFlashDeals);
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
    { value: `${productPool.length}+`, label: "Sản phẩm đang mở bán" },
    { value: `${quickCategories.length}`, label: "Danh mục mua sắm" },
    { value: flashDeals.length > 0 ? `${flashDeals.length}` : "24h", label: flashDeals.length > 0 ? "Deal đang chạy" : "Xử lý đơn trong ngày" },
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

  const editorialCards = quickCategories.slice(0, 3).map((category, index) => ({
    id: category.id,
    title: category.name,
    image: category.image,
    href: category.slug ? `/products?category=${encodeURIComponent(category.slug)}` : "/products",
    description:
      [
        "Nh?ng thi?t k? d? m?c, g?n g?ng v? h?p nh?p s?ng h?ng ng?y.",
        "T?p trung v?o ch?t li?u tho?ng, b?ng m?u d? ph?i v? phom m?c th?c t?.",
        "G?i ? nhanh ?? b?n ?i l?m, ?i ch?i ho?c l?n outfit cu?i tu?n.",
      ][index] ?? "Kh?m ph? th?m c?c g?i ? ph?i ?? v? s?n ph?m ph? h?p nh?t.",
  }));

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
          : `${product.categoryName ?? "Bộ sưu tập"} có phom dễ mặc, giá tốt và đang được khách hàng quan tâm nhiều trong tuần này.`,
      primaryLabel: index === 0 ? homeContent.hero.primaryCtaLabel : homeContent.labels.buyDeal,
      secondaryLabel: index === 0 ? homeContent.hero.secondaryCtaLabel : "Xem danh mục",
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
    const preferred = preferredCategoryId ? productPool.filter((item) => item.categoryId === preferredCategoryId) : productPool;
    const fallback = productPool.filter((item) => item.categoryId !== preferredCategoryId);
    const merged = [...preferred, ...fallback.filter((item) => !preferred.some((entry) => entry.id === item.id))];

    return merged.slice(0, 5);
  }, [activeQuickCategory, productPool]);

  const showcaseLeadProduct = showcaseProducts[0];
  const showcaseRailProducts = showcaseProducts.slice(1, 5);

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
      {isLoading ? (
        <div className="store-home-v3-notice">Đang tải dữ liệu trang chủ...</div>
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
                <span>Giá nổi bật</span>
                <strong>{activeHeroSlide?.priceLabel ?? formatCurrency(featuredProducts[0]?.price ?? 0)}</strong>
              </div>
              <div className="store-home-v3-hero-panel-item">
                <span>Tín hiệu mua sắm</span>
                <strong>{activeHeroSlide?.meta ?? homeContent.hero.metrics[0]?.value ?? "Đang cập nhật"}</strong>
              </div>
            </div>

            {heroSlides.length > 1 ? (
              <div className="store-home-v3-hero-dots" aria-label="Chọn slide hero">
                {heroSlides.map((slide, index) => (
                  <button
                    key={`hero-dot-${slide.id}`}
                    type="button"
                    className={`store-home-v3-hero-dot ${index === normalizedHeroIndex ? "is-active" : ""}`}
                    aria-label={`Hiển thị slide ${index + 1}`}
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
              <p>Khám phá theo danh mục</p>
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
              <p>Mua nhanh hôm nay</p>
              <h2>Sản phẩm dễ chọn, dễ mua và đúng nhu cầu đang xem</h2>
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
                <p>
                  Gợi ý nổi bật trong danh mục đang được xem, ưu tiên sản phẩm có giá tốt, phom dễ mặc và tỷ lệ chuyển
                  đổi cao hơn cho khu vực đầu trang.
                </p>
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
            <Link to="/products" className="store-home-v3-text-link is-light">
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

      {editorialCards.length > 0 ? (
        <section className="store-home-v3-editorial">
          <div className="store-home-v3-editorial-copy">
            <p>{homeContent.journal.kicker}</p>
            <h2>
              {homeContent.journal.titleLine1}
              <br />
              {homeContent.journal.titleLine2}
            </h2>
            <p>{homeContent.journal.description}</p>
            <Link to={primaryCtaLink}>
              <Button className="store-home-v3-primary-ghost h-11! rounded-full! px-7! font-bold!">
                {homeContent.journal.ctaLabel}
              </Button>
            </Link>
          </div>

          <div className="store-home-v3-editorial-grid">
            {editorialCards.map((card) => (
              <Link
                key={`editorial-${card.id}`}
                to={card.href}
                className="store-home-v3-editorial-card"
                style={{
                  backgroundImage: `linear-gradient(140deg, rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.14)), url(${card.image})`,
                }}
              >
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </Link>
            ))}
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
            <p className="store-home-v3-kicker">Chọn sẵn cho bạn</p>
            <h2>Phối nhanh, mua gọn, hợp nhiều tình huống sử dụng</h2>
            <p>
              Từ đồ mặc hằng ngày tới các lựa chọn thoải mái cho cuối tuần, homepage gợi ý sẵn những nhóm sản phẩm
              dễ mua nhất để bạn vào là chọn được ngay.
            </p>
            <Link to={secondaryCtaLink}>
              <Button className="store-home-v3-secondary-ghost h-11! rounded-full! px-7! font-bold!">
                Khám phá thêm
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
              <p>Danh mục nổi bật</p>
              <h2>{block.category.name}</h2>
              <span>{block.category.count}</span>
            </div>
            <Link to={block.category.slug ? `/products?category=${encodeURIComponent(block.category.slug)}` : "/products"}>
              <Button className="store-home-v3-primary-ghost h-11! rounded-full! px-7! font-bold!">
                Xem danh mục
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

      <section className="store-home-v3-member-shell">
        <article className="store-home-v3-member-card">
          <p>{homeContent.member.kicker}</p>
          <h2>{homeContent.member.title}</h2>
          <p>{homeContent.member.description}</p>
          <form className="store-home-v3-member-form" onSubmit={(event) => event.preventDefault()}>
            <input placeholder={homeContent.member.emailPlaceholder} />
            <Button type="primary" className="store-home-v3-primary-btn h-11! rounded-full! px-6! font-bold! shadow-none!">
              {homeContent.member.ctaLabel}
            </Button>
          </form>
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

    </div>
  );
}
