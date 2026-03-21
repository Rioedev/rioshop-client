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
import { categoryService, type Category } from "../../../services/categoryService";
import { cartService, toCartStoreItems } from "../../../services/cartService";
import { productService, type Product } from "../../../services/productService";
import { useAuthStore } from "../../../stores/authStore";
import { useCartStore } from "../../../stores/cartStore";
import { useWishlistStore } from "../../../stores/wishlistStore";

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

export function StoreProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const addCartItem = useCartStore((state) => state.addItem);
  const setCartItems = useCartStore((state) => state.setItems);
  const wishlistItems = useWishlistStore((state) => state.items);
  const toggleWishlist = useWishlistStore((state) => state.toggleItem);

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
    () => [{ label: "Tất cả danh mục", value: "" }, ...categories.map((item) => ({ label: item.name, value: item.slug }))],
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
    onParamChange({ q: keywordInput.trim() || null, page: "1" });
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
        setCartItems(toCartStoreItems(cart));
        message.success("Đã thêm vào giỏ hàng");
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "Không thể thêm vào giỏ hàng";
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
      quantity: 1,
    });
    message.success("Đã thêm vào giỏ hàng");
  };

  return (
    <StorePageShell>
      <StorePanelFrame>
        <StoreSectionHeader
          kicker="Bộ lọc nhanh"
          title="Tìm nhanh sản phẩm"
          description="Lọc theo danh mục, từ khóa và kiểu sắp xếp để tìm món đồ phù hợp nhanh hơn."
        />

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-55 flex-1">
            <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Tìm kiếm</p>
            <Input
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              onPressEnter={onSearchSubmit}
              allowClear
              placeholder="Nhập tên sản phẩm, thương hiệu..."
            />
          </div>
          <div className="min-w-55">
            <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Danh mục</p>
            <Select
              value={categorySlug}
              options={categoryOptions}
              onChange={(value) => onParamChange({ category: value || null, page: "1" })}
              className="w-full"
            />
          </div>
          <div className="min-w-55">
            <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Sắp xếp</p>
            <Select
              value={sort}
              options={sortOptions}
              onChange={(value) => onParamChange({ sort: value, page: "1" })}
              className="w-full"
            />
          </div>
          <Button type="primary" className={storeButtonClassNames.primary} onClick={onSearchSubmit}>
            Áp dụng
          </Button>
          <Button
            className={storeButtonClassNames.secondary}
            onClick={() => {
              setKeywordInput("");
              setSearchParams(new URLSearchParams());
            }}
          >
            Đặt lại
          </Button>
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
                        onClick={() =>
                          toggleWishlist({
                            productId: item._id,
                            slug: item.slug,
                            name: item.name,
                            price: item.pricing.salePrice,
                            imageUrl: image,
                          })
                        }
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
