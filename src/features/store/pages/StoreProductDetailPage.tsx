import { Button, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { analyticsTracker } from "../../../services/analyticsTracker";
import { cartService, toCartCouponMeta, toCartStoreItems } from "../../../services/cartService";
import { couponService, type Coupon } from "../../../services/couponService";
import { productService } from "../../../services/productService";
import { reviewService, type ReviewItem } from "../../../services/reviewService";
import { toWishlistStoreItems, wishlistService } from "../../../services/wishlistService";
import { useAuthStore } from "../../../stores/authStore";
import { useCartStore } from "../../../stores/cartStore";
import { useWishlistStore } from "../../../stores/wishlistStore";
import {
  formatStoreCurrency as formatCurrency,
  resolveStoreImageUrl as resolveImageUrl,
  resolveStoreProductThumbnail,
} from "../utils/storeFormatting";
import {
  blockNonNumericAndOverflowKey,
  blockOverflowPaste,
  clampQuantityByStock,
  getSafeMaxQuantity,
} from "../utils/quantityInputGuards";
import { StoreProductMainSection } from "./StoreProductMainSection";
import { StoreProductReviewSection } from "./StoreProductReviewSection";
import {
  DEFAULT_COLOR_HEX,
  WISHLIST_FALLBACK_IMAGE,
  demoColors,
  demoSizes,
  formatDetailCouponExpiry,
  formatDetailCouponValue,
  generateReviewPercents,
  getVariantColorName,
  getVariantSizeLabel,
  normalizeColorValue,
  sanitizeProductHtml,
  stripHtmlToText,
  type ProductRuntime,
} from "../shared/productDetail";
import { StoreProductShowcaseGrid } from "./StoreProductShowcaseGrid";

const { Paragraph, Title } = Typography;

const EMPTY_REVIEW_STATS = {
  avg: 0,
  count: 0,
  dist: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
};

export function StoreProductDetailPage() {
  const { slug } = useParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const addItem = useCartStore((state) => state.addItem);
  const setCartItems = useCartStore((state) => state.setItems);
  const wishlistItems = useWishlistStore((state) => state.items);
  const addWishlistItem = useWishlistStore((state) => state.addItem);
  const removeWishlistItem = useWishlistStore((state) => state.removeItem);
  const setWishlistItems = useWishlistStore((state) => state.setItems);

  const [product, setProduct] = useState<ProductRuntime | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductRuntime[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<ProductRuntime[]>([]);
  const [recentReviews, setRecentReviews] = useState<ReviewItem[]>([]);
  const [reviewStats, setReviewStats] = useState<{
    avg: number;
    count: number;
    dist: Record<string, number>;
  }>(EMPTY_REVIEW_STATS);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [activeCoupons, setActiveCoupons] = useState<Coupon[]>([]);
  const [couponLoading, setCouponLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);
  const [selectedColor, setSelectedColor] = useState(demoColors[0].name);
  const [selectedSize, setSelectedSize] = useState(demoSizes[2]);

  const loadReviewData = async (productId: string, fallbackProduct?: ProductRuntime) => {
    try {
      const reviewResult = await reviewService.getReviewsForProduct(productId, { page: 1, limit: 12 });
      setRecentReviews(reviewResult.docs);
      setReviewStats({
        avg: reviewResult.stats?.avg ?? 0,
        count: reviewResult.stats?.count ?? 0,
        dist: reviewResult.stats?.dist ?? EMPTY_REVIEW_STATS.dist,
      });
    } catch {
      setRecentReviews([]);
      setReviewStats({
        avg: fallbackProduct?.ratings?.avg ?? 0,
        count: fallbackProduct?.ratings?.count ?? 0,
        dist: fallbackProduct?.ratings?.dist ?? EMPTY_REVIEW_STATS.dist,
      });
    }
  };

  useEffect(() => {
    let active = true;

    const fetchProduct = async () => {
      setLoading(true);

      if (!slug) {
        if (active) {
          setProduct(null);
          setRelatedProducts([]);
          setCatalogProducts([]);
          setRecentReviews([]);
          setReviewStats(EMPTY_REVIEW_STATS);
          setLoading(false);
        }
        return;
      }

      try {
        const result = (await productService.getProductBySlug(slug)) as ProductRuntime;
        if (!active) {
          return;
        }

        setProduct(result);

        const [relatedResult, catalogResult] = await Promise.allSettled([
          productService.getRelatedProducts(result._id),
          productService.getProducts({
            page: 1,
            limit: 28,
            status: "active",
            sort: { isFeatured: -1, totalSold: -1, createdAt: -1 },
          }),
        ]);

        if (active) {
          if (relatedResult.status === "fulfilled") {
            setRelatedProducts(
              (relatedResult.value as ProductRuntime[]).filter((item) => item._id !== result._id),
            );
          } else {
            setRelatedProducts([]);
          }

          if (catalogResult.status === "fulfilled") {
            setCatalogProducts(
              (catalogResult.value.docs as ProductRuntime[]).filter((item) => item._id !== result._id),
            );
          } else {
            setCatalogProducts([]);
          }
        }

        await loadReviewData(result._id, result);
      } catch {
        if (!active) {
          return;
        }

        setProduct(null);
        setRelatedProducts([]);
        setCatalogProducts([]);
        setRecentReviews([]);
        setReviewStats(EMPTY_REVIEW_STATS);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchProduct();

    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!product?._id) {
      return;
    }

    void analyticsTracker.track({
      event: "product_view",
      userId,
      productId: product._id,
      properties: {
        slug: product.slug,
        name: product.name,
        price: product.pricing.salePrice,
        path: `/products/${product.slug}`,
      },
    });
  }, [product?._id, product?.slug, product?.name, product?.pricing.salePrice, userId]);

  useEffect(() => {
    if (!isAuthenticated) {
      setActiveCoupons([]);
      setCouponLoading(false);
      return;
    }

    let active = true;

    const loadCoupons = async () => {
      setCouponLoading(true);
      try {
        const result = await couponService.getActiveCoupons({ page: 1, limit: 3 });
        if (!active) {
          return;
        }
        setActiveCoupons(result.docs || []);
      } catch {
        if (!active) {
          return;
        }
        setActiveCoupons([]);
      } finally {
        if (active) {
          setCouponLoading(false);
        }
      }
    };

    void loadCoupons();

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const productVariants = useMemo(
    () => (product?.variants ?? []).filter((variant) => variant.isActive !== false),
    [product?.variants],
  );

  const colorOptions = useMemo(() => {
    if (productVariants.length === 0) {
      return demoColors;
    }

    const colorMap = new Map<string, { name: string; hex: string }>();
    productVariants.forEach((variant) => {
      const name = getVariantColorName(variant);
      const key = normalizeColorValue(name);
      const hex = variant.color?.hex?.trim() || "";
      const current = colorMap.get(key);

      if (!current) {
        colorMap.set(key, { name, hex: hex || DEFAULT_COLOR_HEX });
        return;
      }

      if (!current.hex && hex) {
        colorMap.set(key, { ...current, hex });
      }
    });

    return Array.from(colorMap.values());
  }, [productVariants]);

  const sizeOptions = useMemo(() => {
    if (productVariants.length === 0) {
      return demoSizes;
    }

    const selectedColorKey = normalizeColorValue(selectedColor);
    const variantsInColor = productVariants.filter(
      (variant) => normalizeColorValue(getVariantColorName(variant)) === selectedColorKey,
    );
    const pool = variantsInColor.length > 0 ? variantsInColor : productVariants;

    return Array.from(
      new Set(pool.map((variant) => getVariantSizeLabel(variant)).filter(Boolean)),
    );
  }, [productVariants, selectedColor]);

  useEffect(() => {
    const fallbackColor = colorOptions[0]?.name ?? "";
    if (!fallbackColor) {
      return;
    }

    if (!selectedColor || !colorOptions.some((color) => color.name === selectedColor)) {
      setSelectedColor(fallbackColor);
    }
  }, [colorOptions, selectedColor]);

  useEffect(() => {
    const fallbackSize = sizeOptions[0] ?? "";
    if (!fallbackSize) {
      return;
    }

    if (!selectedSize || !sizeOptions.includes(selectedSize)) {
      setSelectedSize(fallbackSize);
    }
  }, [selectedSize, sizeOptions]);

  const imageList = useMemo(() => {
    const selectedColorKey = normalizeColorValue(selectedColor);
    const selectedSizeKey = selectedSize.trim().toLowerCase();
    const variantsInColor = productVariants.filter(
      (variant) => normalizeColorValue(getVariantColorName(variant)) === selectedColorKey,
    );
    const selectedVariants =
      variantsInColor.length > 0
        ? variantsInColor.filter(
            (variant) => getVariantSizeLabel(variant).toLowerCase() === selectedSizeKey,
          )
        : [];

    const selectedVariantImages = selectedVariants
      .flatMap((variant) => variant.images ?? [])
      .map((item) => resolveImageUrl(item))
      .filter((item): item is string => Boolean(item));

    const colorVariantImages = variantsInColor
      .flatMap((variant) => variant.images ?? [])
      .map((item) => resolveImageUrl(item))
      .filter((item): item is string => Boolean(item));

    const allVariantImages = productVariants
      .flatMap((variant) => variant.images ?? [])
      .map((item) => resolveImageUrl(item))
      .filter((item): item is string => Boolean(item));

    const prioritizedVariantImages =
      selectedVariantImages.length > 0
        ? selectedVariantImages
        : colorVariantImages.length > 0
          ? colorVariantImages
          : allVariantImages;

    return Array.from(new Set(prioritizedVariantImages));
  }, [productVariants, selectedColor, selectedSize]);

  const mediaFallbackImages = useMemo(
    () =>
      (product?.media ?? [])
        .filter((item) => item.type === "image")
        .map((item) => resolveImageUrl(item.url))
        .filter((item): item is string => Boolean(item)),
    [product?.media],
  );

  const selectedVariant = useMemo(() => {
    if (productVariants.length === 0) {
      return null;
    }

    const selectedColorKey = normalizeColorValue(selectedColor);
    const selectedSizeKey = selectedSize.trim().toLowerCase();
    const variantsInColor = productVariants.filter(
      (variant) => normalizeColorValue(getVariantColorName(variant)) === selectedColorKey,
    );
    const pool = variantsInColor.length > 0 ? variantsInColor : productVariants;

    return (
      pool.find((variant) => getVariantSizeLabel(variant).toLowerCase() === selectedSizeKey) ||
      pool[0] ||
      productVariants[0] ||
      null
    );
  }, [productVariants, selectedColor, selectedSize]);

  const shortDescriptionPreview = useMemo(() => {
    const shortDescription = stripHtmlToText(product?.shortDescription);
    return shortDescription || "";
  }, [product?.shortDescription]);

  const sanitizedDescriptionHtml = useMemo(
    () => sanitizeProductHtml(product?.description),
    [product?.description],
  );

  const descriptionImageList = useMemo(() => {
    if (!sanitizedDescriptionHtml) {
      return [] as string[];
    }

    const imageMatches = [...sanitizedDescriptionHtml.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi)];
    const urls = imageMatches
      .map((match) => match[1]?.trim() || "")
      .filter((url): url is string => Boolean(url));

    return Array.from(new Set(urls));
  }, [sanitizedDescriptionHtml]);

  const descriptionTextHtml = useMemo(() => {
    if (!sanitizedDescriptionHtml) {
      return "";
    }

    return sanitizedDescriptionHtml
      .replace(/<img[^>]*>/gi, "")
      .replace(/<figure[^>]*>\s*<\/figure>/gi, "")
      .trim();
  }, [sanitizedDescriptionHtml]);

  const hasDescriptionText = useMemo(
    () => stripHtmlToText(descriptionTextHtml).trim().length > 0,
    [descriptionTextHtml],
  );

  useEffect(() => {
    setSelectedImage(imageList[0] ?? mediaFallbackImages[0]);
  }, [imageList, mediaFallbackImages]);

  useEffect(() => {
    setQuantity((current) => clampQuantityByStock(current, selectedVariant?.stock, 1));
  }, [selectedVariant?.sku, selectedVariant?.stock]);

  const productPool = useMemo(() => {
    const all = [...relatedProducts, ...catalogProducts].filter((item) => item._id !== product?._id);
    const map = new Map<string, ProductRuntime>();

    all.forEach((item) => {
      if (!map.has(item._id)) {
        map.set(item._id, item);
      }
    });

    return Array.from(map.values());
  }, [relatedProducts, catalogProducts, product?._id]);

  const sameCategoryProducts = productPool
    .filter((item) => (item.category?._id || "") === (product?.category?._id || ""))
    .slice(0, 4);

  const viewedProducts = useMemo(() => {
    const list = [product, ...productPool].filter((item): item is ProductRuntime => Boolean(item));
    const map = new Map<string, ProductRuntime>();

    list.forEach((item) => {
      if (!map.has(item._id)) {
        map.set(item._id, item);
      }
    });

    return Array.from(map.values()).slice(0, 4);
  }, [product, productPool]);

  if (loading) {
    return <div className="product-detail-skeleton" />;
  }

  if (!product) {
    return (
      <section className="product-empty-state">
        <Title level={3} className="mb-2! mt-0!">
          Không tìm thấy sản phẩm
        </Title>
        <Paragraph className="mb-4! text-slate-600!">
          Sản phẩm có thể đã bị ẩn hoặc đường dẫn không hợp lệ.
        </Paragraph>
        <Link to="/">
          <Button type="primary" className="rounded-full! bg-slate-900! px-6! shadow-none!">
            Quay về trang chủ
          </Button>
        </Link>
      </section>
    );
  }

  const displayImage = selectedImage ?? imageList[0] ?? mediaFallbackImages[0];
  const selectedColorLabel = selectedColor || colorOptions[0]?.name || "Mặc định";
  const selectedSizeLabel = selectedSize || sizeOptions[0] || "Free";
  const selectedVariantLabel = selectedVariant
    ? `${getVariantColorName(selectedVariant)} / ${getVariantSizeLabel(selectedVariant)}`
    : `${selectedColorLabel} / ${selectedSizeLabel}`;
  const selectedVariantPrice = Math.max(
    0,
    product.pricing.salePrice + Number(selectedVariant?.additionalPrice || 0),
  );
  const selectedVariantBasePrice = Math.max(
    0,
    product.pricing.basePrice + Number(selectedVariant?.additionalPrice || 0),
  );
  const hasDiscount = selectedVariantBasePrice > selectedVariantPrice;
  const isSelectedVariantOutOfStock =
    selectedVariant !== null && Number(selectedVariant.stock ?? 0) <= 0;
  const selectedVariantStock = getSafeMaxQuantity(selectedVariant?.stock, 1);
  const ratingValue = reviewStats.avg > 0 ? reviewStats.avg : product.ratings?.avg ?? 4.8;
  const ratingCount = reviewStats.count > 0 ? reviewStats.count : product.ratings?.count ?? 0;
  const soldText = product.totalSold
    ? `${product.totalSold.toLocaleString("vi-VN")} đã bán`
    : "Mới cập nhật";
  const reviewPercents = generateReviewPercents(
    reviewStats.count > 0 ? reviewStats.dist : product.ratings?.dist,
    reviewStats.count > 0 ? reviewStats.count : product.ratings?.count ?? 0,
  );
  const isInWishlist = wishlistItems.some((item) => item.productId === product._id);

  const onSubmitReview = async () => {
    if (!isAuthenticated) {
      message.info("Vui lòng đăng nhập để gửi bình luận.");
      return;
    }

    const trimmedBody = reviewBody.trim();
    if (!trimmedBody) {
      message.warning("Vui lòng nhập nội dung bình luận.");
      return;
    }

    setReviewSubmitting(true);
    try {
      await reviewService.createReview({
        productId: product._id,
        variantSku: selectedVariant?.sku || undefined,
        rating: Math.max(1, Math.min(5, Math.round(reviewRating || 5))),
        body: trimmedBody,
      });

      setReviewBody("");
      setReviewRating(5);
      message.success("Đã gửi bình luận. Admin sẽ duyệt trước khi hiển thị công khai.");
      await loadReviewData(product._id, product);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Không thể gửi bình luận";
      message.error(messageText);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const onAddToCart = async () => {
    if (productVariants.length > 0 && !selectedVariant?.sku) {
      message.error("Vui lòng chọn đúng màu và size trước khi thêm vào giỏ.");
      return;
    }

    if (isSelectedVariantOutOfStock) {
      message.warning("Biến thể bạn chọn hiện đã hết hàng.");
      return;
    }

    if (selectedVariant && quantity > selectedVariantStock) {
      message.warning(`Số lượng vượt tồn kho. Còn lại ${selectedVariantStock} sản phẩm.`);
      return;
    }

    if (isAuthenticated) {
      try {
        const cart = await cartService.addItem({
          productId: product._id,
          variantSku: selectedVariant?.sku || "",
          quantity,
        });
        const couponMeta = toCartCouponMeta(cart);
        setCartItems(
          toCartStoreItems(cart),
          undefined,
          couponMeta.couponCode,
          couponMeta.couponDiscount,
        );

        void analyticsTracker.track({
          event: "add_to_cart",
          userId,
          productId: product._id,
          properties: {
            productName: product.name,
            variantSku: selectedVariant?.sku || "",
            quantity,
            unitPrice: selectedVariantPrice,
            source: "product_detail",
          },
        });

        message.success("Đã thêm sản phẩm vào giỏ hàng");
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "Không thể thêm vào giỏ hàng";
        message.error(messageText);
      }
      return;
    }

    addItem({
      productId: product._id,
      slug: product.slug,
      name: `${product.name} - ${selectedVariantLabel}`,
      price: selectedVariantPrice,
      imageUrl: displayImage,
      variantSku: selectedVariant?.sku,
      variantLabel: selectedVariantLabel,
      availableStock: selectedVariantStock,
      quantity,
    });

    void analyticsTracker.track({
      event: "add_to_cart",
      userId,
      productId: product._id,
      properties: {
        productName: product.name,
        variantSku: selectedVariant?.sku || "",
        quantity,
        unitPrice: selectedVariantPrice,
        source: "product_detail_guest",
      },
    });

    message.success("Đã thêm sản phẩm vào giỏ hàng");
  };

  const onToggleWishlist = async () => {
    const image = displayImage || resolveStoreProductThumbnail(product) || WISHLIST_FALLBACK_IMAGE;

    if (isAuthenticated) {
      try {
        const wishlist = isInWishlist
          ? await wishlistService.removeItem(product._id)
          : await wishlistService.addItem({
              productId: product._id,
              productSlug: product.slug,
              name: product.name,
              image,
              price: selectedVariantPrice,
            });

        setWishlistItems(toWishlistStoreItems(wishlist), userId);
        message.success(isInWishlist ? "Đã xóa khỏi yêu thích" : "Đã thêm vào yêu thích");
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "Không thể cập nhật yêu thích";
        message.error(messageText);
      }
      return;
    }

    if (isInWishlist) {
      removeWishlistItem(product._id);
      message.success("Đã xóa khỏi yêu thích");
      return;
    }

    addWishlistItem({
      productId: product._id,
      slug: product.slug,
      name: product.name,
      price: selectedVariantPrice,
      imageUrl: image,
    });
    message.success("Đã thêm vào yêu thích");
  };

  return (
    <div className="pdpv2-page space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <div>
          <Link to="/" className="hover:text-slate-900">
            Trang chủ
          </Link>
          <span className="mx-2">/</span>
          <span>{product.category?.name ?? "Sản phẩm"}</span>
          <span className="mx-2">/</span>
          <span>{product.name}</span>
        </div>
      </div>

      <StoreProductMainSection
        product={product}
        imageList={imageList}
        selectedImage={selectedImage}
        displayImage={displayImage}
        onSelectImage={setSelectedImage}
        ratingValue={ratingValue}
        ratingCount={ratingCount}
        soldText={soldText}
        selectedVariantPrice={selectedVariantPrice}
        selectedVariantBasePrice={selectedVariantBasePrice}
        hasDiscount={hasDiscount}
        shortDescriptionPreview={shortDescriptionPreview}
        colorOptions={colorOptions}
        selectedColor={selectedColor}
        onSelectColor={setSelectedColor}
        sizeOptions={sizeOptions}
        selectedSize={selectedSize}
        onSelectSize={setSelectedSize}
        quantity={quantity}
        selectedVariantStock={selectedVariantStock}
        onQuantityChange={(value) => setQuantity(clampQuantityByStock(value, selectedVariantStock, 1))}
        onQuantityKeyDown={(event) => blockNonNumericAndOverflowKey(event, selectedVariantStock)}
        onQuantityPaste={(event) => blockOverflowPaste(event, selectedVariantStock)}
        isSelectedVariantOutOfStock={isSelectedVariantOutOfStock}
        onAddToCart={() => void onAddToCart()}
        isInWishlist={isInWishlist}
        onToggleWishlist={() => void onToggleWishlist()}
      />

      <section className="pdpv2-overview-card">
        <h3 className="pdpv2-section-title">Mô tả sản phẩm</h3>
        <div className="pdpv2-overview-grid">
          <div className="pdpv2-spec-card">
            <p className="pdpv2-spec-label">Thông tin chi tiết</p>
            <ul className="pdpv2-spec-list">
              <li>
                <span>Thương hiệu</span>
                <strong>{product.brand ?? "RioShop"}</strong>
              </li>
              <li>
                <span>Danh mục</span>
                <strong>{product.category?.name ?? "Sản phẩm"}</strong>
              </li>
              <li>
                <span>SKU</span>
                <strong>{product.sku ?? "Đang cập nhật"}</strong>
              </li>
              <li>
                <span>Tình trạng</span>
                <strong>{product.status === "active" ? "Còn hàng" : "Tạm hết"}</strong>
              </li>
            </ul>

            {sanitizedDescriptionHtml ? (
              <div className={`pdpv2-description-layout ${descriptionImageList.length > 0 ? "has-media" : ""}`}>
                {hasDescriptionText ? (
                  <div
                    className="pdpv2-rich-text pdpv2-description-text"
                    dangerouslySetInnerHTML={{ __html: descriptionTextHtml }}
                  />
                ) : null}

                {descriptionImageList.length > 0 ? (
                  <div className="pdpv2-description-media-stack">
                    {descriptionImageList.map((imageUrl, index) => (
                      <div key={`${imageUrl}-${index}`} className="pdpv2-description-media">
                        <img src={imageUrl} alt={`${product.name} ${index + 1}`} loading="lazy" />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <Paragraph className="mb-0! mt-4! text-sm! leading-7! text-slate-600!">
                Sản phẩm được phát triển theo hướng tối giản, dễ mặc, dễ phối và dễ bảo quản.
              </Paragraph>
            )}
          </div>
        </div>
      </section>

      <section className="pdpv2-block">
        <h3 className="pdpv2-section-title">Sản phẩm cùng danh mục</h3>
        <StoreProductShowcaseGrid
          items={sameCategoryProducts.length > 0 ? sameCategoryProducts : relatedProducts.slice(0, 4)}
        />
      </section>

      <StoreProductReviewSection
        ratingValue={ratingValue}
        ratingCount={ratingCount}
        reviewPercents={reviewPercents}
        isAuthenticated={isAuthenticated}
        reviewRating={reviewRating}
        onReviewRatingChange={setReviewRating}
        reviewBody={reviewBody}
        onReviewBodyChange={setReviewBody}
        reviewSubmitting={reviewSubmitting}
        onSubmitReview={() => void onSubmitReview()}
        recentReviews={recentReviews}
      />

      <section className="pdpv2-block">
        <h3 className="pdpv2-section-title">Sản phẩm bạn đã xem</h3>
        <StoreProductShowcaseGrid items={viewedProducts} />
      </section>

      {relatedProducts.length > 0 ? (
        <section className="pdpv2-block">
          <h3 className="pdpv2-section-title">Bạn có thể sẽ thích</h3>
          <div className="related-grid">
            {relatedProducts.slice(0, 4).map((item) => {
              const image = resolveStoreProductThumbnail(item);
              return (
                <Link key={item._id} to={`/products/${item.slug}`} className="related-card">
                  <div className="related-card-image">
                    {image ? (
                      <img src={image} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="product-main-fallback">RIO</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      {item.category?.name ?? "Sản phẩm"}
                    </p>
                    <h3 className="mt-2 min-h-12 text-sm font-semibold text-slate-900">{item.name}</h3>
                    <p className="mt-2 text-base font-bold text-slate-900">
                      {formatCurrency(item.pricing.salePrice)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {isAuthenticated ? (
        <section className="pdpv2-voucher-block">
          <div className="pdpv2-voucher-head">
            <div>
              <p className="pdpv2-mini-kicker">Voucher dành cho bạn</p>
              <h4>Ưu đãi đang khả dụng</h4>
            </div>
            <Link to="/cart">
              <Button className="h-11! rounded-full! border-0! px-6! font-bold!">Áp mã tại giỏ hàng</Button>
            </Link>
          </div>

          {couponLoading ? (
            <p className="pdpv2-voucher-empty">Đang tải voucher...</p>
          ) : activeCoupons.length > 0 ? (
            <div className="pdpv2-voucher-grid">
              {activeCoupons.map((coupon) => (
                <article key={coupon.id} className="pdpv2-voucher-card">
                  <p className="pdpv2-voucher-value">{formatDetailCouponValue(coupon)}</p>
                  <h5>{coupon.code}</h5>
                  <p>{coupon.description?.trim() || coupon.name}</p>
                  <span>{"HSD: "}{formatDetailCouponExpiry(coupon.expiresAt)}</span>
                </article>
              ))}
            </div>
          ) : (
            <p className="pdpv2-voucher-empty">Hiện chưa có voucher phù hợp cho tài khoản này.</p>
          )}
        </section>
      ) : (
        <div className="pdpv2-member-banner">
          <div>
            <p className="pdpv2-mini-kicker">Đặc quyền thành viên</p>
            <h4>Ưu đãi riêng cho đơn tiếp theo</h4>
          </div>
          <Button className="h-11! rounded-full! border-0! px-7! font-bold!">Đăng ký ngay</Button>
        </div>
      )}
    </div>
  );
}

