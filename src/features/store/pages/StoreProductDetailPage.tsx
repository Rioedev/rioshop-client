import {
  CheckCircleOutlined,
  HeartOutlined,
  SafetyCertificateOutlined,
  StarFilled,
  TruckOutlined,
} from "@ant-design/icons";
import { Button, InputNumber, Progress, Rate, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { cartService, toCartStoreItems } from "../../../services/cartService";
import { productService, type Product } from "../../../services/productService";
import { reviewService, type ReviewItem } from "../../../services/reviewService";
import { useAuthStore } from "../../../stores/authStore";
import { useCartStore } from "../../../stores/cartStore";
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

const { Paragraph, Title } = Typography;

type ProductRuntime = Product & {
  ratings?: {
    avg?: number;
    count?: number;
    dist?: Record<string, number>;
  };
  totalSold?: number;
};

const demoColors = [
  { name: "Coral", hex: "#ff7f7f" },
  { name: "Pearl", hex: "#f1f5f9" },
  { name: "Navy", hex: "#1e3a8a" },
  { name: "Onyx", hex: "#0f172a" },
  { name: "Slate", hex: "#64748b" },
];

const demoSizes = ["XS", "S", "M", "L", "XL", "2XL"];

const DEFAULT_COLOR_HEX = "#cbd5e1";

const normalizeColorValue = (value?: string) => (value ?? "").trim().toLowerCase();

const getVariantColorName = (variant: NonNullable<Product["variants"]>[number]) =>
  variant.color?.name?.trim() || (variant.color?.hex?.trim() ? `Màu ${variant.color.hex.trim()}` : "Mặc định");

const getVariantSizeLabel = (variant: NonNullable<Product["variants"]>[number]) =>
  variant.sizeLabel?.trim() || variant.size?.trim() || "";

const techCards = [
  {
    title: "CoolSoft",
    subtitle: "Mềm, mát, không bị xước",
    text: "Sợi vải mềm và bề mặt mịn giúp mặc êm, thoáng, không gây cảm giác khó chịu khi vận động.",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "CoolDry",
    subtitle: "Thoát hơi ẩm nhanh",
    text: "Công nghệ đàn hồi và hút ẩm tốt giúp trang phục khô nhanh, phù hợp cho cả ngày dài.",
    image: "https://images.unsplash.com/photo-1467043198406-dc953a3defa0?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "CoolRib",
    subtitle: "Giữ form ổn định",
    text: "Cấu trúc dệt rib giúp vải giữ độ bung, giảm giãn bai và bền đẹp sau nhiều lần giặt.",
    image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "CoolFlex",
    subtitle: "Co giãn 4 chiều",
    text: "Tỷ lệ spandex tối ưu giúp cử động thoải mái hơn khi tập luyện và di chuyển liên tục.",
    image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80",
  },
];

const toProductCardImage = (item: ProductRuntime, fallback = "RIO") =>
  resolveStoreProductThumbnail(item) ??
  `https://dummyimage.com/800x1000/e2e8f0/0f172a&text=${encodeURIComponent(fallback)}`;

const generateReviewPercents = (dist?: Record<string, number>, count = 0) => {

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

const stripHtmlToText = (value?: string) =>
  (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const sanitizeProductHtml = (html?: string) => {
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

export function StoreProductDetailPage() {
  const { slug } = useParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const addItem = useCartStore((state) => state.addItem);
  const setCartItems = useCartStore((state) => state.setItems);

  const [product, setProduct] = useState<ProductRuntime | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductRuntime[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<ProductRuntime[]>([]);
  const [recentReviews, setRecentReviews] = useState<ReviewItem[]>([]);
  const [reviewStats, setReviewStats] = useState<{
    avg: number;
    count: number;
    dist: Record<string, number>;
  }>({
    avg: 0,
    count: 0,
    dist: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);
  const [selectedColor, setSelectedColor] = useState(demoColors[0].name);
  const [selectedSize, setSelectedSize] = useState(demoSizes[2]);

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
          setReviewStats({ avg: 0, count: 0, dist: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
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

        const [relatedResult, catalogResult, reviewResult] = await Promise.allSettled([
          productService.getRelatedProducts(result._id),
          productService.getProducts({
            page: 1,
            limit: 28,
            status: "active",
            sort: { isFeatured: -1, totalSold: -1, createdAt: -1 },
          }),
          reviewService.getReviewsForProduct(result._id, { page: 1, limit: 6 }),
        ]);

        if (active) {
          if (relatedResult.status === "fulfilled") {
            setRelatedProducts((relatedResult.value as ProductRuntime[]).filter((item) => item._id !== result._id));
          } else {
            setRelatedProducts([]);
          }

          if (catalogResult.status === "fulfilled") {
            setCatalogProducts((catalogResult.value.docs as ProductRuntime[]).filter((item) => item._id !== result._id));
          } else {
            setCatalogProducts([]);
          }

          if (reviewResult?.status === "fulfilled") {
            setRecentReviews(reviewResult.value.docs);
            setReviewStats({
              avg: reviewResult.value.stats?.avg ?? 0,
              count: reviewResult.value.stats?.count ?? 0,
              dist: reviewResult.value.stats?.dist ?? { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
            });
          } else {
            setRecentReviews([]);
            setReviewStats({
              avg: result.ratings?.avg ?? 0,
              count: result.ratings?.count ?? 0,
              dist: result.ratings?.dist ?? { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
            });
          }
        }
      } catch {
        if (!active) {
          return;
        }

        setProduct(null);
        setRelatedProducts([]);
        setCatalogProducts([]);
        setRecentReviews([]);
        setReviewStats({ avg: 0, count: 0, dist: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
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
    const mediaImages = (product?.media ?? [])
      .filter((item) => item.type === "image")
      .map((item) => resolveImageUrl(item.url))
      .filter((item): item is string => Boolean(item));

    const selectedColorKey = normalizeColorValue(selectedColor);
    const selectedSizeKey = selectedSize.trim().toLowerCase();
    const variantsInColor = productVariants.filter(
      (variant) => normalizeColorValue(getVariantColorName(variant)) === selectedColorKey,
    );
    const selectedVariants =
      variantsInColor.length > 0
        ? variantsInColor.filter((variant) => getVariantSizeLabel(variant).toLowerCase() === selectedSizeKey)
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

    return Array.from(new Set([...prioritizedVariantImages, ...mediaImages]));
  }, [product?.media, productVariants, selectedColor, selectedSize]);

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
    if (shortDescription) {
      return shortDescription;
    }

    return "";
  }, [product?.shortDescription]);

  const sanitizedDescriptionHtml = useMemo(
    () => sanitizeProductHtml(product?.description),
    [product?.description],
  );

  useEffect(() => {
    setSelectedImage(imageList[0]);
  }, [imageList]);

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

  const styleProducts = productPool.slice(0, 4);
  const sameTechProducts = productPool.slice(4, 8).length > 0 ? productPool.slice(4, 8) : productPool.slice(0, 4);
  const suggestedProducts = productPool.slice(8, 12).length > 0 ? productPool.slice(8, 12) : productPool.slice(2, 6);

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

  const displayImage = selectedImage ?? imageList[0];
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
  const soldText = product.totalSold ? `${product.totalSold.toLocaleString("vi-VN")} đã bán` : "Mới cập nhật";
  const reviewPercents = generateReviewPercents(
    reviewStats.count > 0 ? reviewStats.dist : product.ratings?.dist,
    reviewStats.count > 0 ? reviewStats.count : product.ratings?.count ?? 0,
  );

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
        setCartItems(toCartStoreItems(cart));
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
    message.success("Đã thêm sản phẩm vào giỏ hàng");
  };

  const renderProductCards = (items: ProductRuntime[]) => (
    <div className="pdpv2-showcase-grid">
      {items.map((item, index) => (
        <Link key={item._id} to={`/products/${item.slug}`} className="pdpv2-showcase-card">
          <div className="pdpv2-showcase-image">
            <img src={toProductCardImage(item, `RIO-${index + 1}`)} alt={item.name} className="h-full w-full object-cover" />
          </div>
          <div className="pdpv2-showcase-content">
            <div className="pdpv2-color-row">
              {demoColors.slice(0, 4).map((color) => (
                <span key={`${item._id}-${color.name}`} className="pdpv2-color-mini" style={{ background: color.hex }} />
              ))}
            </div>
            <h4>{item.name}</h4>
            <p>{formatCurrency(item.pricing.salePrice)}</p>
          </div>
        </Link>
      ))}
    </div>
  );

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

      <section className="pdpv2-main-wrap">
        <div className="pdpv2-gallery-panel">
          <div className="pdpv2-gallery-grid">
            {imageList.length > 1 ? (
              <div className="pdpv2-thumb-column">
                {imageList.map((image) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setSelectedImage(image)}
                    className={`pdpv2-thumb-btn ${selectedImage === image ? "is-active" : ""}`}
                  >
                    <img src={image} alt={product.name} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}

            <div className="pdpv2-main-image-wrap">
              {displayImage ? (
                <img src={displayImage} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="product-main-fallback">RIO</div>
              )}
            </div>
          </div>
        </div>

        <div className="pdpv2-buy-panel">
          <p className="product-info-category">{product.category?.name ?? "Sản phẩm mới"}</p>
          <Title level={2} className="mb-2! mt-1! text-3xl! text-slate-900! md:text-[34px]!">
            {product.name}
          </Title>

          <div className="pdpv2-rating-row">
            <span className="inline-flex items-center gap-1 text-amber-500">
              <StarFilled />
              {ratingValue.toFixed(1)}
            </span>
            <span>({ratingCount} đánh giá)</span>
            <span>{soldText}</span>
          </div>

          <div className="mb-4 mt-4 flex items-end gap-2">
            <span className="text-3xl font-black text-slate-900">
              {formatCurrency(selectedVariantPrice)}
            </span>
            {hasDiscount ? (
              <span className="text-lg text-slate-400 line-through">
                {formatCurrency(selectedVariantBasePrice)}
              </span>
            ) : null}
          </div>

          {shortDescriptionPreview ? (
            <Paragraph className="mb-4! text-base! leading-7! text-slate-600!">
              {shortDescriptionPreview}
            </Paragraph>
          ) : null}

          <div className="pdpv2-policy-grid">
            <div className="pdpv2-policy-item">
              <TruckOutlined />
              Giao nhanh 2h nội thành
            </div>
            <div className="pdpv2-policy-item">
              <SafetyCertificateOutlined />
              Chính hãng 100%
            </div>
            <div className="pdpv2-policy-item">
              <CheckCircleOutlined />
              Đổi trả 60 ngày
            </div>
            <div className="pdpv2-policy-item">
              <HeartOutlined />
              Tư vấn size 24/7
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Màu sắc</p>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setSelectedColor(color.name)}
                  className={`pdpv2-color-pill ${selectedColor === color.name ? "is-active" : ""}`}
                >
                  <span className="pdpv2-color-dot" style={{ background: color.hex || DEFAULT_COLOR_HEX }} />
                  {color.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Kích thước</p>
            <div className="flex flex-wrap gap-2">
              {sizeOptions.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={`option-pill ${selectedSize === size ? "is-active" : ""}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <p className="m-0 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Số lượng</p>
            <InputNumber
              min={1}
              max={selectedVariantStock}
              value={quantity}
              onChange={(value) => setQuantity(clampQuantityByStock(value, selectedVariantStock, 1))}
              onKeyDown={(event) => blockNonNumericAndOverflowKey(event, selectedVariantStock)}
              onPaste={(event) => blockOverflowPaste(event, selectedVariantStock)}
              className="w-28! rounded-xl!"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              type="primary"
              size="large"
              className="h-11! rounded-full! bg-slate-900! px-8! font-bold! shadow-none!"
              disabled={isSelectedVariantOutOfStock}
              onClick={() => void onAddToCart()}
            >
              {isSelectedVariantOutOfStock ? "Hết hàng" : "Thêm vào giỏ"}
            </Button>
            <Link to="/cart">
              <Button size="large" className="h-11! rounded-full! border-slate-300! px-7! font-semibold!">
                Mua ngay
              </Button>
            </Link>
          </div>

          <div className="product-note-list">
            <p>
              <strong>Chất liệu:</strong> {(product.material ?? ["Cotton cao cấp"]).join(" | ")}
            </p>
            <p>
              <strong>Bảo quản:</strong> {(product.care ?? ["Giặt nhẹ, tránh nhiệt cao"]).join(" | ")}
            </p>
          </div>
        </div>
      </section>

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
              <div
                className="pdpv2-rich-text"
                dangerouslySetInnerHTML={{ __html: sanitizedDescriptionHtml }}
              />
            ) : (
              <Paragraph className="mb-0! mt-4! text-sm! leading-7! text-slate-600!">
                Sản phẩm được phát triển theo hướng tối giản, dễ mặc, dễ phối và dễ bảo quản.
              </Paragraph>
            )}
          </div>
        </div>
      </section>

      <section className="pdpv2-block">
        <h3 className="pdpv2-section-title">Mua sắm theo phong cách</h3>
        {renderProductCards(styleProducts.length > 0 ? styleProducts : relatedProducts.slice(0, 4))}
      </section>

      <section className="pdpv2-block">
        <h3 className="pdpv2-section-title">Sản phẩm cùng công nghệ</h3>
        {renderProductCards(sameTechProducts.length > 0 ? sameTechProducts : relatedProducts.slice(0, 4))}
      </section>

      <section className="pdpv2-block">
        <h3 className="pdpv2-section-title">Công nghệ vải nổi bật</h3>
        <div className="pdpv2-tech-grid">
          {techCards.map((item) => (
            <article key={item.title} className="pdpv2-tech-card">
              <div className="pdpv2-tech-image">
                <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
              </div>
              <div className="pdpv2-tech-content">
                <h4>{item.title}</h4>
                <p className="pdpv2-tech-subtitle">{item.subtitle}</p>
                <p>{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="pdpv2-block">
        <h3 className="pdpv2-section-title">Gợi ý sản phẩm</h3>
        {renderProductCards(suggestedProducts.length > 0 ? suggestedProducts : relatedProducts.slice(0, 4))}
      </section>

      <section className="pdpv2-review-wrap">
        <h3 className="pdpv2-section-title">Đánh giá sản phẩm</h3>
        <div className="pdpv2-review-grid">
          <div className="pdpv2-review-score">
            <p className="pdpv2-score-number">{ratingValue.toFixed(1)}</p>
            <Rate allowHalf disabled value={ratingValue} className="text-base!" />
            <p className="m-0 text-sm text-slate-500">{ratingCount} đánh giá từ khách hàng</p>
          </div>

          <div className="space-y-3">
            {reviewPercents.map((item) => (
              <div key={item.star} className="pdpv2-review-row">
                <span>{item.star} sao</span>
                <Progress percent={item.percent} showInfo={false} strokeColor="#0f172a" trailColor="#e2e8f0" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {recentReviews.length > 0 ? (
            recentReviews.slice(0, 3).map((review) => (
              <article key={review.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="m-0 text-sm font-semibold text-slate-900">
                    {review.user?.fullName || "Khách hàng đã mua"}
                  </p>
                  <Rate disabled value={review.rating} className="text-xs!" />
                </div>
                <p className="m-0 mt-2 text-sm text-slate-600">{review.body}</p>
              </article>
            ))
          ) : (
            <p className="m-0 text-sm text-slate-500">Chưa có đánh giá chi tiết cho sản phẩm này.</p>
          )}
        </div>
      </section>

      <section className="pdpv2-block">
        <h3 className="pdpv2-section-title">Sản phẩm bạn đã xem</h3>
        {renderProductCards(viewedProducts)}
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

      <div className="pdpv2-member-banner">
        <div>
          <p className="pdpv2-mini-kicker">Đặc quyền thành viên</p>
          <h4>Ưu đãi riêng cho đơn tiếp theo</h4>
        </div>
        <Button className="h-11! rounded-full! border-0! px-7! font-bold!">Đăng ký ngay</Button>
      </div>
    </div>
  );
}
