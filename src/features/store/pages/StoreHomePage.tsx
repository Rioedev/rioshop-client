import {
  ClockCircleOutlined,
  FireOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Button, Progress, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { STORE_BRAND_KEY } from "../../../app/constants/storeBrand";
import { brandConfigService } from "../../../services/brandConfigService";
import { categoryService, type Category } from "../../../services/categoryService";
import { blogService, type BlogPost } from "../../../services/blogService";
import { couponService, type Coupon } from "../../../services/couponService";
import { flashSaleService } from "../../../services/flashSaleService";
import { productService } from "../../../services/productService";
import {
  formatStoreCurrency as formatCurrency,
  resolveStoreImageUrl as resolveImageUrl,
} from "../utils/storeFormatting";
import { useAuthStore } from "../../../stores/authStore";
import {
  DEFAULT_HOME_CONTENT,
  FALLBACK_CATEGORY_IMAGES,
  buildTemplateMessage,
  formatBlogDate,
  formatCouponCondition,
  formatCouponExpiry,
  formatCouponValue,
  formatTimeLeft,
  getProductImage,
  iconByKey,
  mapHomeProduct,
  mergeHomeContent,
  readSavedCouponCodes,
  type FlashDeal,
  type HomeCategory,
  type HomeProduct,
  type ProductRuntime,
  type ResolvedHomeContent,
  writeSavedCouponCodes,
} from "../shared/home";
import { StoreHomeHeroSection } from "./StoreHomeHeroSection";
import { StoreHomeProductCard } from "./StoreHomeProductCard";
import { StoreHomeShowcaseSection } from "./StoreHomeShowcaseSection";

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

  const showcaseProducts = useMemo(() => {
    const preferredCategoryId = activeQuickCategoryId || quickCategories[0]?.id;
    if (!preferredCategoryId) {
      return productPool.slice(0, 5);
    }

    return productPool.filter((item) => item.categoryId === preferredCategoryId).slice(0, 5);
  }, [activeQuickCategoryId, productPool, quickCategories]);

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

  return (
    <div className="store-home-v3 space-y-8 md:space-y-12">
      {contextHolder}
      {isLoading ? (
        <div className="store-home-v3-notice">{homeContent.labels.loadingHome}</div>
      ) : null}

      <StoreHomeHeroSection
        homeContent={homeContent}
        heroSlides={heroSlides}
        activeHeroIndex={activeHeroIndex}
        campaignImage={campaignImage}
        primaryCtaLink={primaryCtaLink}
        secondaryCtaLink={secondaryCtaLink}
        fallbackPrice={featuredProducts[0]?.price ?? 0}
        onSelectSlide={setActiveHeroIndex}
      />

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
        <StoreHomeShowcaseSection
          homeContent={homeContent}
          quickCategories={quickCategories}
          activeQuickCategoryId={activeQuickCategoryId}
          showcaseLeadProduct={showcaseLeadProduct}
          showcaseRailProducts={showcaseRailProducts}
          onSelectCategory={setActiveQuickCategoryId}
        />
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
              <div key={`best-${product.id}`}>
                <StoreHomeProductCard product={product} />
              </div>
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
              <div key={`curated-${product.id}`}>
                <StoreHomeProductCard product={product} />
              </div>
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
              <div key={`category-${block.category.id}-${product.id}`}>
                <StoreHomeProductCard product={product} />
              </div>
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




