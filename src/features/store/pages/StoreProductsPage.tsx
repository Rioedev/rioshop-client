import { HeartOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { Button, Input, Select, message } from "antd";
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
import { formatStoreCurrency, resolveStoreProductThumbnail } from "../utils/storeFormatting";
import { analyticsTracker } from "../../../services/analyticsTracker";
import { categoryService, type Category } from "../../../services/categoryService";
import { cartService, toCartCouponMeta, toCartStoreItems } from "../../../services/cartService";
import { productService, type Product } from "../../../services/productService";
import { toWishlistStoreItems, wishlistService } from "../../../services/wishlistService";
import { useAuthStore } from "../../../stores/authStore";
import { useCartStore } from "../../../stores/cartStore";
import { useWishlistStore } from "../../../stores/wishlistStore";

const sortOptions = [
  { value: "featured", label: "Ná»•i báº­t" },
  { value: "newest", label: "Má»›i nháº¥t" },
  { value: "price_asc", label: "GiÃ¡ tÄƒng dáº§n" },
  { value: "price_desc", label: "GiÃ¡ giáº£m dáº§n" },
  { value: "best_selling", label: "BÃ¡n cháº¡y" },
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
  const [products, setProducts] = useState<Product[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const q = searchParams.get("q")?.trim() ?? "";
  const categorySlug = searchParams.get("category") ?? "";
  const sort = searchParams.get("sort") ?? "featured";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = 12;

  const [keywordInput, setKeywordInput] = useState(q);

  useEffect(() => {
    setKeywordInput(q);
  }, [q]);

  const categoryOptions = useMemo(
    () => [{ label: "Táº¥t cáº£ danh má»¥c", value: "" }, ...categories.map((item) => ({ label: item.name, value: item.slug }))],
    [categories],
  );

  const selectedCategory = useMemo(
    () => categories.find((item) => item.slug === categorySlug),
    [categories, categorySlug],
  );

  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      try {
        const result = await categoryService.getCategories({ page: 1, limit: 100, isActive: true });
        if (active) {
          setCategories(result.docs);
        }
      } catch {
        if (active) {
          setCategories([]);
        }
      }
    };

    void loadCategories();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      setLoading(true);
      try {
        if (q) {
          const result = await productService.searchProducts(q, page, limit, "active");
          if (!active) {
            return;
          }
          setProducts(result.docs);
          setTotalDocs(result.totalDocs);
          setTotalPages(result.totalPages);
          return;
        }

        const result = await productService.getProducts({
          page,
          limit,
          status: "active",
          category: selectedCategory?._id,
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
  }, [page, q, selectedCategory?._id, sort]);

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

  const onSearchSubmit = () => {
    const keyword = keywordInput.trim();
    if (keyword) {
      void analyticsTracker.track({
        event: "search",
        userId,
        properties: {
          query: keyword,
          source: "products_page",
          path: "/products",
        },
      });
    }
    onParamChange({ q: keyword || null, page: "1" });
  };

  const onAddToCart = async (item: Product) => {
    const image = resolveStoreProductThumbnail(item);
    const variant = (item.variants ?? []).find((entry) => entry.isActive !== false && Number(entry.stock || 0) > 0) ?? null;
    if (!variant?.sku) {
      message.error("Sáº£n pháº©m Ä‘Ã£ háº¿t hÃ ng hoáº·c chÆ°a cÃ³ biáº¿n thá»ƒ há»£p lá»‡.");
      return;
    }

    const variantLabel = variant
      ? `${variant.color?.name?.trim() || "Máº·c Ä‘á»‹nh"} / ${(variant.sizeLabel || variant.size).trim()}`
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
        message.success("ÄÃ£ thÃªm vÃ o giá» hÃ ng");
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "KhÃ´ng thá»ƒ thÃªm vÃ o giá» hÃ ng";
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
    message.success("ÄÃ£ thÃªm vÃ o giá» hÃ ng");
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
        const messageText = error instanceof Error ? error.message : "Kh\u00f4ng th\u1ec3 c\u1eadp nh\u1eadt y\u00eau th\u00edch";
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
      <StorePanelFrame>
        <StoreSectionHeader
          kicker="Bá»™ lá»c nhanh"
          title="TÃ¬m nhanh sáº£n pháº©m"
          description="Lá»c theo danh má»¥c, tá»« khÃ³a vÃ  kiá»ƒu sáº¯p xáº¿p Ä‘á»ƒ tÃ¬m mÃ³n Ä‘á»“ phÃ¹ há»£p nhanh hÆ¡n."
        />

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-55 flex-1">
            <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">TÃ¬m kiáº¿m</p>
            <Input
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              onPressEnter={onSearchSubmit}
              allowClear
              placeholder="Nháº­p tÃªn sáº£n pháº©m, thÆ°Æ¡ng hiá»‡u..."
            />
          </div>
          <div className="min-w-55">
            <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Danh má»¥c</p>
            <Select
              value={categorySlug}
              options={categoryOptions}
              onChange={(value) => onParamChange({ category: value || null, page: "1" })}
              className="w-full"
            />
          </div>
          <div className="min-w-55">
            <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Sáº¯p xáº¿p</p>
            <Select
              value={sort}
              options={sortOptions}
              onChange={(value) => onParamChange({ sort: value, page: "1" })}
              className="w-full"
            />
          </div>
          <Button type="primary" className={storeButtonClassNames.primary} onClick={onSearchSubmit}>
            Ãp dá»¥ng
          </Button>
          <Button
            className={storeButtonClassNames.secondary}
            onClick={() => {
              setKeywordInput("");
              setSearchParams(new URLSearchParams());
            }}
          >
            Äáº·t láº¡i
          </Button>
        </div>
      </StorePanelFrame>

      <StorePanelFrame>
        <StoreSectionHeader
          kicker="Danh sÃ¡ch sáº£n pháº©m"
          title="Sáº£n pháº©m"
          description={loading ? "Äang táº£i danh sÃ¡ch sáº£n pháº©m..." : `${totalDocs} sáº£n pháº©m Ä‘ang hiá»ƒn thá»‹`}
        />

        {products.length === 0 && !loading ? (
          <StoreInlineNote
            title="KhÃ´ng tÃ¬m tháº¥y sáº£n pháº©m phÃ¹ há»£p."
            description="Thá»­ thay Ä‘á»•i bá»™ lá»c, tá»« khÃ³a hoáº·c quay láº¡i cÃ¡c danh má»¥c khÃ¡c Ä‘á»ƒ xem thÃªm sáº£n pháº©m."
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
                  categoryLabel={item.category?.name ?? "Sáº£n pháº©m"}
                  badge={discountLabel}
                  footer={
                    <>
                      <Button
                        size="small"
                        className={inWishlist ? "rounded-full! border-rose-200! text-rose-600!" : storeButtonClassNames.secondaryCompact}
                        icon={<HeartOutlined />}
                        onClick={() => void onToggleWishlist(item, inWishlist)}
                      >
                        {inWishlist ? "ÄÃ£ lÆ°u" : "YÃªu thÃ­ch"}
                      </Button>
                      <Button
                        size="small"
                        type="primary"
                        className={storeButtonClassNames.primaryCompact}
                        icon={<ShoppingCartOutlined />}
                        onClick={() => void onAddToCart(item)}
                      >
                        ThÃªm giá»
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
            TrÆ°á»›c
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

