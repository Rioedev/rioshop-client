import { HeartOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { Button, Input, Select, Slider, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { StoreProductGridCard } from "../components/StoreProductGridCard";
import {
  StoreInlineNote,
  StorePageShell,
  StorePanelFrame,
  StoreSectionHeader,
  storeButtonClassNames,
} from "../components/StorePageChrome";
import {
  formatStoreCurrency,
  resolveStoreImageUrl,
  resolveStoreProductThumbnail,
} from "../utils/storeFormatting";
import { analyticsTracker } from "../../../services/analyticsTracker";
import { categoryService, type Category } from "../../../services/categoryService";
import { collectionService, type Collection } from "../../../services/collectionService";
import { cartService, toCartCouponMeta, toCartStoreItems } from "../../../services/cartService";
import { productService, type Product } from "../../../services/productService";
import { toWishlistStoreItems, wishlistService } from "../../../services/wishlistService";
import { useAuthStore } from "../../../stores/authStore";
import { useCartStore } from "../../../stores/cartStore";
import { useWishlistStore } from "../../../stores/wishlistStore";
import { getErrorMessage } from "../../../utils/errorMessage";

const sortOptions = [
  { value: "featured", label: "Nổi bật" },
  { value: "newest", label: "Mới nhất" },
  { value: "price_asc", label: "Giá tăng dần" },
  { value: "price_desc", label: "Giá giảm dần" },
  { value: "best_selling", label: "Bán chạy" },
];

const sortMap: Record<string, Record<string, 1 | -1>> = {
  featured: { isFeatured: -1, isBestseller: -1, totalSold: -1, createdAt: -1 },
  newest: { createdAt: -1 },
  price_asc: { "pricing.salePrice": 1 },
  price_desc: { "pricing.salePrice": -1 },
  best_selling: { totalSold: -1, createdAt: -1 },
};

const WISHLIST_FALLBACK_IMAGE =
  "https://dummyimage.com/400x400/e2e8f0/0f172a&text=RIO";

type ProductColorOption = {
  label: string;
  value: string;
  hex?: string;
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
      const basePrice = Number(product.pricing?.salePrice ?? 0);
      if (Number.isFinite(basePrice) && basePrice >= 0) {
        allPrices.push(basePrice);
      }

      (product.variants ?? []).forEach((variant) => {
        if (variant.isActive === false) {
          return;
        }
        const variantPrice = basePrice + Number(variant.additionalPrice || 0);
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

  const onAddToCart = async (item: Product) => {
    const image = resolveStoreProductThumbnail(item);
    const variant = (item.variants ?? []).find((entry) => entry.isActive !== false && Number(entry.stock || 0) > 0) ?? null;
    if (!variant?.sku) {
      message.error("Sản phẩm đã hết hàng hoặc chưa có biến thể hợp lệ.");
      return;
    }

    const variantLabel = variant
      ? `${variant.color?.name?.trim() || "Mặc định"} / ${(variant.sizeLabel || variant.size).trim()}`
      : undefined;
    const unitPrice = Math.max(0, item.pricing.salePrice + Number(variant?.additionalPrice || 0));

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
            source: "products_page",
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
        source: "products_page_guest",
      },
    });
    message.success("Đã thêm vào giỏ hàng");
  };

  const onToggleWishlist = async (item: Product, inWishlist: boolean) => {
    const image = resolveStoreProductThumbnail(item) || WISHLIST_FALLBACK_IMAGE;

    if (isAuthenticated) {
      try {
        const wishlist = inWishlist
          ? await wishlistService.removeItem(item._id)
          : await wishlistService.addItem({
              productId: item._id,
              productSlug: item.slug,
              name: item.name,
              image,
              price: item.pricing.salePrice,
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
      price: item.pricing.salePrice,
      imageUrl: image,
    });
    message.success("\u0110\u00e3 th\u00eam v\u00e0o y\u00eau th\u00edch");
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

      <StorePanelFrame>
        <StoreSectionHeader
          kicker="Bộ lọc nhanh"
          title="Tìm nhanh sản phẩm"
          description="Lọc theo bộ sưu tập, danh mục, từ khóa, giá, màu sắc, size và kiểu sắp xếp để tìm món đồ phù hợp nhanh hơn."
        />

        <div className="grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Tìm kiếm</p>
            <Input
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              onPressEnter={onApplyFilters}
              allowClear
              placeholder="Nhập tên sản phẩm, thương hiệu..."
            />
          </div>

          <div className="lg:col-span-3">
            <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Bộ sưu tập</p>
            <Select
              value={collectionSlug}
              options={collectionOptions}
              onChange={(value) => onParamChange({ collection: value || null, page: "1" })}
              className="w-full"
            />
          </div>

          <div className="lg:col-span-3">
            <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Danh mục</p>
            <Select
              value={categorySlug}
              options={categoryOptions}
              onChange={(value) => onParamChange({ category: value || null, page: "1" })}
              className="w-full"
            />
          </div>

          <div className="lg:col-span-2">
            <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Sắp xếp</p>
            <Select
              value={sort}
              options={sortOptions}
              onChange={(value) => onParamChange({ sort: value, page: "1" })}
              className="w-full"
            />
          </div>

          <div className="lg:col-span-6">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Khoảng giá</p>
              <p className="m-0 text-xs font-semibold text-slate-700">
                {formatStoreCurrency(priceRangeInput[0])} - {formatStoreCurrency(priceRangeInput[1])}
              </p>
            </div>
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

          <div className="lg:col-span-3">
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

          <div className="lg:col-span-3">
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

          <div className="lg:col-span-12 flex flex-wrap justify-end gap-3">
            <Button type="primary" className={storeButtonClassNames.primary} onClick={onApplyFilters}>
              Áp dụng
            </Button>
            <Button
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

      <StorePanelFrame>
        <StoreSectionHeader
          kicker="Danh sách sản phẩm"
          title="Sản phẩm"
          description={loading ? "Đang tải danh sách sản phẩm..." : `${totalDocs} sản phẩm đang hiển thị`}
        />

        {products.length === 0 && !loading ? (
          <StoreInlineNote
            title="Không tìm thấy sản phẩm phù hợp."
            description="Thử thay đổi bộ lọc, từ khóa hoặc quay lại các danh mục khác để xem thêm sản phẩm."
          />
        ) : loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="cool-skeleton-card" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((item) => {
              const hasDiscount = item.pricing.basePrice > item.pricing.salePrice;
              const image = resolveStoreProductThumbnail(item);
              const inWishlist = wishlistItems.some((wishlist) => wishlist.productId === item._id);
              const discountLabel = hasDiscount
                ? `-${Math.round(((item.pricing.basePrice - item.pricing.salePrice) / item.pricing.basePrice) * 100)}%`
                : undefined;

              return (
                <StoreProductGridCard
                  key={item._id}
                  href={`/products/${item.slug}`}
                  imageUrl={image}
                  name={item.name}
                  price={formatStoreCurrency(item.pricing.salePrice)}
                  originalPrice={hasDiscount ? formatStoreCurrency(item.pricing.basePrice) : undefined}
                  categoryLabel={item.category?.name ?? "Sản phẩm"}
                  badge={discountLabel}
                  footer={
                    <>
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
                        onClick={() => void onAddToCart(item)}
                      >
                        Thêm giỏ
                      </Button>
                    </>
                  }
                />
              );
            })}
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
    </StorePageShell>
  );
}


