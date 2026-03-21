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
import { productService, type Product } from "../../../services/productService";
import { useCartStore } from "../../../stores/cartStore";
import { useWishlistStore } from "../../../stores/wishlistStore";

const sortOptions = [
  { value: "featured", label: "Noi bat" },
  { value: "newest", label: "Moi nhat" },
  { value: "price_asc", label: "Gia tang dan" },
  { value: "price_desc", label: "Gia giam dan" },
  { value: "best_selling", label: "Ban chay" },
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
  const addCartItem = useCartStore((state) => state.addItem);
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
    () => [{ label: "Tat ca danh muc", value: "" }, ...categories.map((item) => ({ label: item.name, value: item.slug }))],
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

  const onAddToCart = (item: Product) => {
    const image = resolveStoreProductThumbnail(item);
    const variant = (item.variants ?? []).find((entry) => entry.isActive !== false) ?? null;
    const variantLabel = variant
      ? `${variant.color?.name?.trim() || "Mac dinh"} / ${(variant.sizeLabel || variant.size).trim()}`
      : undefined;
    const unitPrice = Math.max(0, item.pricing.salePrice + Number(variant?.additionalPrice || 0));

    addCartItem({
      productId: item._id,
      slug: item.slug,
      name: variantLabel ? `${item.name} - ${variantLabel}` : item.name,
      price: unitPrice,
      imageUrl: image,
      variantSku: variant?.sku,
      variantLabel,
      quantity: 1,
    });
    message.success("Da them vao gio hang");
  };

  return (
    <StorePageShell>
      <StorePanelFrame>
        <StoreSectionHeader
          kicker="Catalog control"
          title="Tim nhanh san pham"
          description="Loc theo danh muc, tu khoa va kieu sap xep de tim mon do phu hop nhanh hon."
        />

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-55 flex-1">
            <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Tim kiem</p>
            <Input
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              onPressEnter={onSearchSubmit}
              allowClear
              placeholder="Nhap ten san pham, thuong hieu..."
            />
          </div>
          <div className="min-w-55">
            <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Danh muc</p>
            <Select
              value={categorySlug}
              options={categoryOptions}
              onChange={(value) => onParamChange({ category: value || null, page: "1" })}
              className="w-full"
            />
          </div>
          <div className="min-w-55">
            <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Sap xep</p>
            <Select
              value={sort}
              options={sortOptions}
              onChange={(value) => onParamChange({ sort: value, page: "1" })}
              className="w-full"
            />
          </div>
          <Button type="primary" className={storeButtonClassNames.primary} onClick={onSearchSubmit}>
            Ap dung
          </Button>
          <Button
            className={storeButtonClassNames.secondary}
            onClick={() => {
              setKeywordInput("");
              setSearchParams(new URLSearchParams());
            }}
          >
            Dat lai
          </Button>
        </div>
      </StorePanelFrame>

      <StorePanelFrame>
        <StoreSectionHeader
          kicker="Danh sach san pham"
          title="San pham"
          description={loading ? "Dang tai danh sach san pham..." : `${totalDocs} san pham dang hien thi`}
        />

        {products.length === 0 && !loading ? (
          <StoreInlineNote
            title="Khong tim thay san pham phu hop."
            description="Thu thay doi bo loc, tu khoa hoac quay lai cac danh muc khac de xem them san pham."
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
                  categoryLabel={item.category?.name ?? "San pham"}
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
                        {inWishlist ? "Da luu" : "Yeu thich"}
                      </Button>
                      <Button
                        size="small"
                        type="primary"
                        className={storeButtonClassNames.primaryCompact}
                        icon={<ShoppingCartOutlined />}
                        onClick={() => onAddToCart(item)}
                      >
                        Them gio
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
            Truoc
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
