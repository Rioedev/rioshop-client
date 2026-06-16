import { BulbOutlined, HeartOutlined, SendOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { Button, Input, Select, Slider, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { StoreProductGridCard } from "../components/StoreProductGridCard";
import { ProductCardSkeleton } from "../components/StoreSkeletons";
import {
  StoreInlineNote,
  StorePageShell,
  StorePanelFrame,
  StoreSectionHeader,
  storeButtonClassNames,
} from "../components/StorePageChrome";
import {
  STORE_PRODUCT_PLACEHOLDER,
  formatStoreCurrency,
  resolveStoreImageUrl,
  resolveStoreProductThumbnail,
} from "../utils/storeFormatting";
import { toStoreColorSwatches } from "../utils/productSwatches";
import { analyticsTracker } from "../../../services/analyticsTracker";
import {
  aiRecommendationService,
  type AiProductRecommendation,
} from "../../../services/aiRecommendationService";
import { categoryService, type Category } from "../../../services/categoryService";
import { collectionService, type Collection } from "../../../services/collectionService";
import { cartService, toCartCouponMeta, toCartStoreItems } from "../../../services/cartService";
import { productService, type Product } from "../../../services/productService";
import { toWishlistStoreItems, wishlistService } from "../../../services/wishlistService";
import { useAuthStore } from "../../../stores/authStore";
import { useCartStore } from "../../../stores/cartStore";
import { useWishlistStore } from "../../../stores/wishlistStore";
import { getErrorMessage } from "../../../utils/errorMessage";
import { getProductDetailHref, getProductDisplayPricing } from "../shared/productDetail";

const sortOptions = [
  { value: "featured", label: "Nổi bật" },
  { value: "newest", label: "Mới về trong 30 ngày" },
  { value: "price_asc", label: "Giá tăng dần" },
  { value: "price_desc", label: "Giá giảm dần" },
  { value: "best_selling", label: "Bán chạy nhất" },
];

const sortMap: Record<string, Record<string, 1 | -1>> = {
  featured: { isFeatured: -1, isBestseller: -1, totalSold: -1, createdAt: -1 },
  newest: { createdAt: -1 },
  price_asc: { "pricing.regularPrice": 1 },
  price_desc: { "pricing.regularPrice": -1 },
  best_selling: { totalSold: -1, createdAt: -1 },
};

const WISHLIST_FALLBACK_IMAGE = STORE_PRODUCT_PLACEHOLDER;

type ProductColorOption = {
  label: string;
  value: string;
  hex?: string;
};

type ProductCardColorSwatch = {
  key: string;
  label: string;
  hex?: string;
  imageUrl?: string;
};

const parseCsvParam = (value: string | null) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const parseNumberParam = (value: string | null) => {
  if (!value?.trim()) {
    return Number.NaN;
  }
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : Number.NaN;
};

const normalizeColorHex = (value?: string) => {
  const hex = (value ?? "").trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex) ? hex : "";
};

const normalizeColorRef = (value?: string) => (value ?? "").trim().toLowerCase();

const findMediaColorImage = (product: Product, colorName: string, colorHex: string) => {
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

  const match = (product.media ?? []).find((mediaItem) => {
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

const toProductCardColorSwatches = (product: Product): ProductCardColorSwatch[] => {
  const swatchMap = new Map<string, ProductCardColorSwatch>();
  const fallbackImage = resolveStoreProductThumbnail(product);

  (product.variants ?? []).forEach((variant) => {
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
      findMediaColorImage(product, label, hex) ??
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

export function StoreProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const addCartItem = useCartStore((state) => state.addItem);
  const setCartItems = useCartStore((state) => state.setItems);
  const wishlistItems = useWishlistStore((state) => state.items);
  const addWishlistItem = useWishlistStore((state) => state.addItem);
  const removeWishlistItem = useWishlistStore((state) => state.removeItem);
  const setWishlistItems = useWishlistStore((state) => state.setItems);

  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const q = searchParams.get("q")?.trim() ?? "";
  const categorySlug = searchParams.get("category") ?? "";
  const collectionSlug = searchParams.get("collection") ?? "";
  const sort = searchParams.get("sort") ?? "featured";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const minPriceParam = parseNumberParam(searchParams.get("minPrice"));
  const maxPriceParam = parseNumberParam(searchParams.get("maxPrice"));
  const colorParam = searchParams.get("color") ?? "";
  const sizeParam = searchParams.get("size") ?? "";
  const selectedColorValues = useMemo(() => parseCsvParam(colorParam), [colorParam]);
  const selectedSizeValues = useMemo(() => parseCsvParam(sizeParam), [sizeParam]);
  const limit = 12;

  const [keywordInput, setKeywordInput] = useState(q);
  const [priceRangeInput, setPriceRangeInput] = useState<[number, number]>([0, 5000000]);
  const [colorFilterInput, setColorFilterInput] = useState<string[]>(selectedColorValues);
  const [sizeFilterInput, setSizeFilterInput] = useState<string[]>(selectedSizeValues);
  const [filterFacetProducts, setFilterFacetProducts] = useState<Product[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiSubmittedPrompt, setAiSubmittedPrompt] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [aiRecommendations, setAiRecommendations] = useState<AiProductRecommendation[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    setKeywordInput(q);
    setColorFilterInput(selectedColorValues);
    setSizeFilterInput(selectedSizeValues);
  }, [q, selectedColorValues, selectedSizeValues]);

  const categoryOptions = useMemo(
    () => [{ label: "Tất cả danh mục", value: "" }, ...categories.map((item) => ({ label: item.name, value: item.slug }))],
    [categories],
  );

  const collectionOptions = useMemo(
    () => [{ label: "Tất cả bộ sưu tập", value: "" }, ...collections.map((item) => ({ label: item.name, value: item.slug }))],
    [collections],
  );

  const selectedCategory = useMemo(
    () => categories.find((item) => item.slug === categorySlug),
    [categories, categorySlug],
  );

  const selectedCollection = useMemo(
    () => collections.find((item) => item.slug === collectionSlug || item._id === collectionSlug),
    [collections, collectionSlug],
  );
  const selectedCollectionBannerImage = useMemo(
    () => resolveStoreImageUrl(selectedCollection?.image),
    [selectedCollection],
  );

  const colorOptions = useMemo(() => {
    const optionMap = new Map<string, ProductColorOption>();
    filterFacetProducts.forEach((product) => {
      (product.variants ?? []).forEach((variant) => {
        if (variant.isActive === false) {
          return;
        }
        const hex = normalizeColorHex(variant.color?.hex);
        const label = (variant.color?.name ?? "").trim() || hex;
        if (!label) {
          return;
        }
        const value = label.toLowerCase();
        if (!optionMap.has(value)) {
          optionMap.set(value, {
            label,
            value,
            hex: hex || undefined,
          });
        }
      });
    });

    colorFilterInput.forEach((value) => {
      const key = value.toLowerCase();
      if (!optionMap.has(key)) {
        optionMap.set(key, {
          label: value,
          value: key,
        });
      }
    });

    return Array.from(optionMap.values()).sort((a, b) => a.label.localeCompare(b.label, "vi"));
  }, [colorFilterInput, filterFacetProducts]);

  const sizeOptions = useMemo(() => {
    const sizeSet = new Set<string>();
    filterFacetProducts.forEach((product) => {
      (product.variants ?? []).forEach((variant) => {
        if (variant.isActive === false) {
          return;
        }
        const sizeLabel = (variant.sizeLabel ?? variant.size ?? "").trim();
        if (sizeLabel) {
          sizeSet.add(sizeLabel.toUpperCase());
        }
      });
    });
    sizeFilterInput.forEach((value) => {
      if (value.trim()) {
        sizeSet.add(value.trim().toUpperCase());
      }
    });
    return Array.from(sizeSet)
      .sort((a, b) => a.localeCompare(b, "vi", { numeric: true }))
      .map((item) => ({ label: item, value: item }));
  }, [filterFacetProducts, sizeFilterInput]);

  const priceBounds = useMemo(() => {
    const allPrices: number[] = [];

    filterFacetProducts.forEach((product) => {
      const regularPrice = Number(product.pricing?.regularPrice ?? product.pricing?.salePrice ?? 0);
      if (Number.isFinite(regularPrice) && regularPrice >= 0) {
        allPrices.push(regularPrice);
      }

      (product.variants ?? []).forEach((variant) => {
        if (variant.isActive === false) {
          return;
        }
        const variantPrice = regularPrice + Number(variant.additionalPrice || 0);
        if (Number.isFinite(variantPrice) && variantPrice >= 0) {
          allPrices.push(variantPrice);
        }
      });
    });

    if (allPrices.length === 0) {
      return {
        min: 0,
        max: 5_000_000,
        step: 50_000,
      };
    }

    const rawMin = Math.min(...allPrices);
    const rawMax = Math.max(...allPrices);
    const min = Math.max(0, Math.floor(rawMin / 10_000) * 10_000);
    const max = Math.max(min + 10_000, Math.ceil(rawMax / 10_000) * 10_000);
    const span = max - min;
    const step = span <= 200_000 ? 5_000 : span <= 1_000_000 ? 10_000 : span <= 5_000_000 ? 50_000 : 100_000;

    return { min, max, step };
  }, [filterFacetProducts]);

  useEffect(() => {
    const rawMin = Number.isFinite(minPriceParam) ? minPriceParam : priceBounds.min;
    const rawMax = Number.isFinite(maxPriceParam) ? maxPriceParam : priceBounds.max;

    let nextMin = Math.min(rawMin, rawMax);
    let nextMax = Math.max(rawMin, rawMax);

    nextMin = Math.max(priceBounds.min, Math.min(nextMin, priceBounds.max));
    nextMax = Math.max(priceBounds.min, Math.min(nextMax, priceBounds.max));

    if (nextMin > nextMax) {
      nextMin = priceBounds.min;
      nextMax = priceBounds.max;
    }

    setPriceRangeInput([nextMin, nextMax]);
  }, [maxPriceParam, minPriceParam, priceBounds.max, priceBounds.min]);

  useEffect(() => {
    let active = true;

    const loadLookups = async () => {
      try {
        const [categoryResult, collectionResult] = await Promise.all([
          categoryService.getCategories({ page: 1, limit: 100, isActive: true }),
          collectionService.getCollections({ page: 1, limit: 100, isActive: true }),
        ]);

        if (active) {
          setCategories(categoryResult.docs);
          setCollections(collectionResult.docs);
        }
      } catch {
        if (active) {
          setCategories([]);
          setCollections([]);
        }
      }
    };

    void loadLookups();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadFacetProducts = async () => {
      try {
        const firstPage = await productService.getProducts({
          page: 1,
          limit: 100,
          status: "active",
          q: q || undefined,
          category: selectedCategory?._id,
          collection: selectedCollection?._id,
          sort: sortMap.featured,
        });

        const pagesToLoad = Math.min(firstPage.totalPages, 6);
        const facetProducts = [...firstPage.docs];

        if (pagesToLoad > 1) {
          const nextPageRequests: Promise<Awaited<ReturnType<typeof productService.getProducts>>>[] = [];
          for (let pageIndex = 2; pageIndex <= pagesToLoad; pageIndex += 1) {
            nextPageRequests.push(
              productService.getProducts({
                page: pageIndex,
                limit: 100,
                status: "active",
                q: q || undefined,
                category: selectedCategory?._id,
                collection: selectedCollection?._id,
                sort: sortMap.featured,
              }),
            );
          }

          const nextPageResults = await Promise.allSettled(nextPageRequests);
          nextPageResults.forEach((result) => {
            if (result.status === "fulfilled") {
              facetProducts.push(...result.value.docs);
            }
          });
        }

        if (active) {
          setFilterFacetProducts(facetProducts);
        }
      } catch {
        if (active) {
          setFilterFacetProducts([]);
        }
      }
    };

    void loadFacetProducts();

    return () => {
      active = false;
    };
  }, [q, selectedCategory?._id, selectedCollection?._id]);

  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      setLoading(true);
      try {
        const result = await productService.getProducts({
          page,
          limit,
          status: "active",
          q: q || undefined,
          category: selectedCategory?._id,
          collection: selectedCollection?._id,
          minPrice: Number.isFinite(minPriceParam) ? minPriceParam : undefined,
          maxPrice: Number.isFinite(maxPriceParam) ? maxPriceParam : undefined,
          color: selectedColorValues.length > 0 ? selectedColorValues.join(",") : undefined,
          size: selectedSizeValues.length > 0 ? selectedSizeValues.join(",") : undefined,
          ranking: sort === "best_selling" ? "best_selling" : undefined,
          newWithinDays: sort === "newest" ? 30 : undefined,
          sort: sortMap[sort] ?? sortMap.featured,
        });

        if (!active) {
          return;
        }

        setProducts(result.docs);
        setTotalDocs(result.totalDocs);
        setTotalPages(result.totalPages);
      } catch {
        if (!active) {
          return;
        }

        setProducts([]);
        setTotalDocs(0);
        setTotalPages(1);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadProducts();

    return () => {
      active = false;
    };
  }, [
    maxPriceParam,
    minPriceParam,
    page,
    q,
    selectedCategory?._id,
    selectedCollection?._id,
    selectedColorValues,
    selectedSizeValues,
    sort,
  ]);

  const onParamChange = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(changes).forEach(([key, value]) => {
      if (!value) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });

    if (!("page" in changes)) {
      next.set("page", "1");
    }

    setSearchParams(next);
  };

  const onApplyFilters = () => {
    const normalizedMinPrice = Math.max(priceBounds.min, Math.min(priceRangeInput[0], priceBounds.max));
    const normalizedMaxPrice = Math.max(priceBounds.min, Math.min(priceRangeInput[1], priceBounds.max));

    if (normalizedMinPrice > normalizedMaxPrice) {
      message.warning("Giá tối thiểu không được lớn hơn giá tối đa.");
      return;
    }

    const keyword = keywordInput.trim();
    if (keyword) {
      void analyticsTracker.track({
        event: "search",
        userId,
        properties: {
          query: keyword,
          source: "products_page_filters",
          path: "/products",
        },
      });
    }

    onParamChange({
      q: keyword || null,
      minPrice: normalizedMinPrice > priceBounds.min ? String(Math.floor(normalizedMinPrice)) : null,
      maxPrice: normalizedMaxPrice < priceBounds.max ? String(Math.floor(normalizedMaxPrice)) : null,
      color: colorFilterInput.length > 0 ? colorFilterInput.join(",") : null,
      size: sizeFilterInput.length > 0 ? sizeFilterInput.join(",") : null,
      page: "1",
    });
  };

  const onAskAiRecommendations = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      message.warning("Vui lòng nhập nhu cầu sản phẩm.");
      return;
    }

    setAiLoading(true);
    try {
      const result = await aiRecommendationService.recommendProducts({
        message: prompt,
        limit: 4,
        context: {
          categoryId: selectedCategory?._id,
          collectionId: selectedCollection?._id,
        },
      });

      setAiSubmittedPrompt(prompt);
      setAiSummary(result.summary);
      setAiRecommendations(result.items);

      void analyticsTracker.track({
        event: "search",
        userId,
        properties: {
          query: prompt,
          source: "products_page_ai_recommendations",
          path: "/products",
          recommendationCount: result.items.length,
        },
      });

      if (result.items.length === 0) {
        message.info("Chưa tìm thấy sản phẩm phù hợp với nhu cầu này.");
      }
    } catch (error) {
      const messageText = getErrorMessage(error, "Không thể tạo gợi ý sản phẩm");
      message.error(messageText);
      setAiSummary("");
      setAiRecommendations([]);
    } finally {
      setAiLoading(false);
    }
  };

  const onAddToCart = async (item: Product, source = "products_page") => {
    const image = resolveStoreProductThumbnail(item);
    const variant = (item.variants ?? []).find((entry) => entry.isActive !== false && Number(entry.stock || 0) > 0) ?? null;
    if (!variant?.sku) {
      message.error("Sản phẩm đã hết hàng hoặc chưa có biến thể hợp lệ.");
      return;
    }

    const variantLabel = variant
      ? `${variant.color?.name?.trim() || "Mặc định"} / ${(variant.sizeLabel || variant.size).trim()}`
      : undefined;
    const unitPrice = Math.max(
      0,
      variant?.effectivePricing?.unitPrice ??
        (item.pricing.regularPrice ?? item.pricing.salePrice) + Number(variant?.additionalPrice || 0),
    );

    if (isAuthenticated) {
      try {
        const cart = await cartService.addItem({
          productId: item._id,
          variantSku: variant.sku,
          quantity: 1,
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
          productId: item._id,
          properties: {
            productName: item.name,
            variantSku: variant.sku,
            quantity: 1,
            unitPrice,
            source,
          },
        });
        message.success("Đã thêm vào giỏ hàng");
      } catch (error) {
        const messageText = getErrorMessage(error, "Không thể thêm vào giỏ hàng");
        message.error(messageText);
      }
      return;
    }

    addCartItem({
      productId: item._id,
      slug: item.slug,
      name: variantLabel ? `${item.name} - ${variantLabel}` : item.name,
      price: unitPrice,
      imageUrl: image,
      variantSku: variant.sku,
      variantLabel,
      availableStock: Math.max(1, Number(variant.stock || 1)),
      quantity: 1,
    });
    void analyticsTracker.track({
      event: "add_to_cart",
      userId,
      productId: item._id,
      properties: {
        productName: item.name,
        variantSku: variant.sku,
        quantity: 1,
        unitPrice,
        source: `${source}_guest`,
      },
    });
    message.success("Đã thêm vào giỏ hàng");
  };

  const onToggleWishlist = async (item: Product, inWishlist: boolean) => {
    const image = resolveStoreProductThumbnail(item) || WISHLIST_FALLBACK_IMAGE;
    const colorSwatches = toStoreColorSwatches(item);
    const displayPricing = getProductDisplayPricing(item);

    if (isAuthenticated) {
      try {
        const wishlist = inWishlist
          ? await wishlistService.removeItem(item._id)
          : await wishlistService.addItem({
              productId: item._id,
              productSlug: item.slug,
              name: item.name,
              image,
              price: displayPricing.price,
              colorSwatches,
            });

        setWishlistItems(toWishlistStoreItems(wishlist), userId);
        message.success(inWishlist ? "\u0110\u00e3 x\u00f3a kh\u1ecfi y\u00eau th\u00edch" : "\u0110\u00e3 th\u00eam v\u00e0o y\u00eau th\u00edch");
      } catch (error) {
        const messageText = getErrorMessage(error, "Không thể cập nhật yêu thích");
        message.error(messageText);
      }
      return;
    }

    if (inWishlist) {
      removeWishlistItem(item._id);
      message.success("\u0110\u00e3 x\u00f3a kh\u1ecfi y\u00eau th\u00edch");
      return;
    }

    addWishlistItem({
      productId: item._id,
      slug: item.slug,
      name: item.name,
      price: displayPricing.price,
      imageUrl: image,
      colorSwatches,
    });
    message.success("\u0110\u00e3 th\u00eam v\u00e0o y\u00eau th\u00edch");
  };

  const renderProductCard = (
    item: Product,
    options: {
      recommendation?: AiProductRecommendation;
      source?: string;
    } = {},
  ) => {
    const displayPricing = getProductDisplayPricing(item);
    const image = resolveStoreProductThumbnail(item);
    const inWishlist = wishlistItems.some((wishlist) => wishlist.productId === item._id);
    const colorSwatches = toProductCardColorSwatches(item);
    const source = options.source ?? "products_page";

    return (
      <StoreProductGridCard
        key={item._id}
        href={getProductDetailHref(item, displayPricing.variantSku)}
        imageUrl={image}
        name={item.name}
        price={formatStoreCurrency(displayPricing.price)}
        originalPrice={
          displayPricing.originalPrice ? formatStoreCurrency(displayPricing.originalPrice) : undefined
        }
        badge={displayPricing.badge}
        categoryLabel={item.category?.name ?? "Sản phẩm"}
        colorSwatches={colorSwatches}
        footer={
          <>
            {sort === "best_selling" ? (
              <p className="m-0 basis-full text-sm font-medium text-slate-500">
                Đã bán {Number(item.salesCount || 0)}
              </p>
            ) : null}
            {options.recommendation ? (
              <p className="m-0 basis-full rounded-2xl bg-sky-50 px-3 py-2 text-xs leading-5 text-slate-600">
                {options.recommendation.reason}
              </p>
            ) : null}
            <Button
              size="small"
              className={inWishlist ? "rounded-full! border-rose-200! text-rose-600!" : storeButtonClassNames.secondaryCompact}
              icon={<HeartOutlined />}
              onClick={() => void onToggleWishlist(item, inWishlist)}
            >
              {inWishlist ? "Đã lưu" : "Yêu thích"}
            </Button>
            <Button
              size="small"
              type="primary"
              className={storeButtonClassNames.primaryCompact}
              icon={<ShoppingCartOutlined />}
              onClick={() => void onAddToCart(item, source)}
            >
              Thêm giỏ
            </Button>
          </>
        }
      />
    );
  };

  const aiPromptSuggestions = [
    "Áo sơ mi đi làm dưới 500k",
    "Váy dự tiệc tối",
    "Đồ thể thao thoáng mát",
  ];

  const listingContent =
    sort === "best_selling"
      ? {
          kicker: "Xếp hạng bán hàng",
          title: "Sản phẩm bán chạy",
          description: undefined,
        }
      : sort === "newest"
        ? {
            kicker: "Ra mắt trong 30 ngày",
            title: "Sản phẩm mới về",
            description: undefined,
          }
        : {
            kicker: "Danh sách sản phẩm",
            title: "Sản phẩm",
            description: loading ? "Đang tải danh sách sản phẩm..." : `${totalDocs} sản phẩm đang hiển thị`,
          };

  return (
    <StorePageShell>
      {selectedCollectionBannerImage ? (
        <div
          style={{
            width: "100vw",
            marginLeft: "calc(50% - 50vw)",
            marginRight: "calc(50% - 50vw)",
          }}
        >
          <StorePanelFrame className="p-0!">
            <img
              src={selectedCollectionBannerImage}
              alt={selectedCollection?.name ?? "Collection banner"}
              className="h-100 w-full object-cover object-top md:h-140 lg:h-180"
            />
          </StorePanelFrame>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <StorePanelFrame>
            <h2 className="m-0 mb-4 text-lg font-black uppercase tracking-[0.14em] text-[#082a5c]">Bộ lọc</h2>

            <div className="flex flex-col gap-4">
              <div>
                <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Tìm kiếm</p>
                <Input
                  value={keywordInput}
                  onChange={(event) => setKeywordInput(event.target.value)}
                  onPressEnter={onApplyFilters}
                  allowClear
                  placeholder="Tên sản phẩm, thương hiệu..."
                />
              </div>

              <div>
                <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Danh mục</p>
                <Select
                  value={categorySlug}
                  options={categoryOptions}
                  onChange={(value) => onParamChange({ category: value || null, page: "1" })}
                  className="w-full"
                />
              </div>
              <div>
                <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Bộ sưu tập</p>
                <Select
                  value={collectionSlug}
                  options={collectionOptions}
                  onChange={(value) => onParamChange({ collection: value || null, page: "1" })}
                  className="w-full"
                />
              </div>


              <div>
                <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Sắp xếp</p>
                <Select
                  value={sort}
                  options={sortOptions}
                  onChange={(value) => onParamChange({ sort: value, page: "1" })}
                  className="w-full"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Khoảng giá</p>
                </div>
                <p className="m-0 mb-2 text-xs font-semibold text-slate-700">
                  {formatStoreCurrency(priceRangeInput[0])} – {formatStoreCurrency(priceRangeInput[1])}
                </p>
                <Slider
                  range
                  min={priceBounds.min}
                  max={priceBounds.max}
                  step={priceBounds.step}
                  value={priceRangeInput}
                  onChange={(value) => {
                    if (!Array.isArray(value) || value.length !== 2) {
                      return;
                    }
                    const nextMin = Math.max(priceBounds.min, Math.min(Number(value[0]), priceBounds.max));
                    const nextMax = Math.max(priceBounds.min, Math.min(Number(value[1]), priceBounds.max));
                    setPriceRangeInput([Math.min(nextMin, nextMax), Math.max(nextMin, nextMax)]);
                  }}
                  tooltip={{
                    formatter: (value) => formatStoreCurrency(Number(value ?? 0)),
                  }}
                />
              </div>

              <div>
                <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Màu sắc</p>
                <Select
                  mode="multiple"
                  allowClear
                  value={colorFilterInput}
                  options={colorOptions}
                  onChange={(value) => setColorFilterInput(value)}
                  optionFilterProp="label"
                  maxTagCount="responsive"
                  className="w-full"
                  placeholder="Chọn màu"
                />
              </div>

              <div>
                <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Size</p>
                <Select
                  mode="multiple"
                  allowClear
                  value={sizeFilterInput}
                  options={sizeOptions}
                  onChange={(value) => setSizeFilterInput(value)}
                  optionFilterProp="label"
                  maxTagCount="responsive"
                  className="w-full"
                  placeholder="Chọn size"
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  type="primary"
                  block
                  className={storeButtonClassNames.primary}
                  onClick={onApplyFilters}
                >
                  Áp dụng bộ lọc
                </Button>
                <Button
                  block
                  className={storeButtonClassNames.secondary}
                  onClick={() => {
                    setKeywordInput("");
                    setPriceRangeInput([priceBounds.min, priceBounds.max]);
                    setColorFilterInput([]);
                    setSizeFilterInput([]);
                    setSearchParams(new URLSearchParams());
                  }}
                >
                  Đặt lại
                </Button>
              </div>
            </div>
          </StorePanelFrame>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <section className="rounded-[14px] border border-[#e4eaf2] bg-white p-4">
            <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <BulbOutlined className="text-[#0f4fa8]" />
              <span>AI Stylist</span>
              {aiSubmittedPrompt ? (
                <span className="ml-auto font-medium normal-case tracking-normal text-slate-400">
                  {aiRecommendations.length} kết quả phù hợp
                </span>
              ) : null}
            </div>

            <div className="rio-ai-input">
              <Input.TextArea
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                onPressEnter={(event) => {
                  if (event.shiftKey) return;
                  event.preventDefault();
                  void onAskAiRecommendations();
                }}
                autoSize={{ minRows: 1, maxRows: 4 }}
                maxLength={500}
                placeholder="Mô tả nhu cầu của bạn..."
                variant="borderless"
                className="rio-ai-input__field"
              />
              <Button
                type="primary"
                shape="round"
                icon={<SendOutlined />}
                loading={aiLoading}
                onClick={() => void onAskAiRecommendations()}
                className="rio-ai-input__send"
              >
                Gợi ý
              </Button>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs">
              <span className="mr-1 text-slate-400">Thử:</span>
              {aiPromptSuggestions.map((suggestion, index) => (
                <span key={suggestion} className="inline-flex items-center gap-1">
                  {index > 0 ? <span className="text-slate-300">·</span> : null}
                  <button
                    type="button"
                    onClick={() => setAiPrompt(suggestion)}
                    className="text-slate-600 transition hover:text-[#0f4fa8] hover:underline underline-offset-2"
                  >
                    {suggestion}
                  </button>
                </span>
              ))}
            </div>
          </section>

          {aiSummary ? (
            <StoreInlineNote title="Nhu cầu đã phân tích" description={aiSummary} />
          ) : null}

          {aiRecommendations.length > 0 ? (
            <StorePanelFrame>
              <StoreSectionHeader
                kicker="AI gợi ý"
                title="Sản phẩm phù hợp nhất"
                description={`${aiRecommendations.length} lựa chọn nổi bật theo nhu cầu của bạn.`}
              />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {aiRecommendations.map((recommendation) =>
                  renderProductCard(recommendation.product, {
                    recommendation,
                    source: "products_page_ai_recommendations",
                  }),
                )}
              </div>
            </StorePanelFrame>
          ) : null}

          <StorePanelFrame>
            <StoreSectionHeader
              kicker={listingContent.kicker}
              title={listingContent.title}
              description={listingContent.description}
            />

            {products.length === 0 && !loading ? (
              <StoreInlineNote
                title="Không tìm thấy sản phẩm phù hợp."
                description="Thử thay đổi bộ lọc, từ khóa hoặc quay lại các danh mục khác để xem thêm sản phẩm."
              />
            ) : loading ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <ProductCardSkeleton key={`skeleton-${index}`} />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {products.map((item) => renderProductCard(item))}
              </div>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button disabled={page <= 1 || loading} className={storeButtonClassNames.ghostCompact} onClick={() => onParamChange({ page: String(page - 1) })}>
                Trước
              </Button>
              <span className="text-sm text-slate-500">
                Trang {page} / {Math.max(1, totalPages)}
              </span>
              <Button disabled={page >= totalPages || loading} className={storeButtonClassNames.ghostCompact} onClick={() => onParamChange({ page: String(page + 1) })}>
                Sau
              </Button>
            </div>
          </StorePanelFrame>
        </div>
      </div>
    </StorePageShell>
  );
}
