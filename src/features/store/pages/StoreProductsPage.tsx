import { HeartOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { Button, Input, Select, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { categoryService, type Category } from "../../../services/categoryService";
import { productService, type Product } from "../../../services/productService";
import { useCartStore } from "../../../stores/cartStore";
import { useWishlistStore } from "../../../stores/wishlistStore";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000").replace(/\/$/, "");

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

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
    const image = resolveImageUrl(item.media?.find((media) => media.type === "image")?.url);
    addCartItem({
      productId: item._id,
      slug: item.slug,
      name: item.name,
      price: item.pricing.salePrice,
      imageUrl: image,
      quantity: 1,
    });
    message.success("Da them vao gio hang");
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Tim kiem</p>
            <Input
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              onPressEnter={onSearchSubmit}
              allowClear
              placeholder="Nhap ten san pham, thuong hieu..."
            />
          </div>
          <div className="min-w-[220px]">
            <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Danh muc</p>
            <Select
              value={categorySlug}
              options={categoryOptions}
              onChange={(value) => onParamChange({ category: value || null, page: "1" })}
              className="w-full"
            />
          </div>
          <div className="min-w-[220px]">
            <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Sap xep</p>
            <Select
              value={sort}
              options={sortOptions}
              onChange={(value) => onParamChange({ sort: value, page: "1" })}
              className="w-full"
            />
          </div>
          <Button type="primary" className="rounded-full! bg-slate-900! shadow-none!" onClick={onSearchSubmit}>
            Ap dung
          </Button>
          <Button
            className="rounded-full!"
            onClick={() => {
              setKeywordInput("");
              setSearchParams(new URLSearchParams());
            }}
          >
            Dat lai
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="m-0 text-2xl font-black text-slate-900 md:text-3xl">San pham</h1>
          <p className="m-0 text-sm text-slate-500">{loading ? "Dang tai..." : `${totalDocs} san pham`}</p>
        </div>

        {products.length === 0 && !loading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            Khong tim thay san pham phu hop voi bo loc hien tai.
          </div>
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
              const image = resolveImageUrl(item.media?.find((media) => media.type === "image")?.url);
              const inWishlist = wishlistItems.some((wishlist) => wishlist.productId === item._id);

              return (
                <article key={item._id} className="cool-product-card">
                  <Link to={`/products/${item.slug}`} className="block">
                    <div className="cool-product-media">
                      {image ? (
                        <img src={image} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="cool-product-fallback">RIO</div>
                      )}
                      <span className="cool-product-badge">{item.category?.name ?? "San pham"}</span>
                      {hasDiscount ? (
                        <span className="cool-product-discount">
                          -
                          {Math.round(
                            ((item.pricing.basePrice - item.pricing.salePrice) / item.pricing.basePrice) * 100,
                          )}
                          %
                        </span>
                      ) : null}
                    </div>
                  </Link>
                  <div className="p-3">
                    <Link to={`/products/${item.slug}`} className="text-sm font-semibold text-slate-900 hover:text-slate-700">
                      {item.name}
                    </Link>
                    <div className="mt-2 flex items-end gap-2">
                      <span className="text-base font-extrabold text-slate-900">{formatCurrency(item.pricing.salePrice)}</span>
                      {hasDiscount ? (
                        <span className="text-sm text-slate-400 line-through">{formatCurrency(item.pricing.basePrice)}</span>
                      ) : null}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="small"
                        className={`rounded-full! ${inWishlist ? "border-rose-200! text-rose-600!" : ""}`}
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
                        className="rounded-full! bg-slate-900! shadow-none!"
                        icon={<ShoppingCartOutlined />}
                        onClick={() => onAddToCart(item)}
                      >
                        Them gio
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            disabled={page <= 1 || loading}
            className="rounded-full!"
            onClick={() => onParamChange({ page: String(page - 1) })}
          >
            Truoc
          </Button>
          <span className="text-sm text-slate-500">
            Trang {page} / {Math.max(1, totalPages)}
          </span>
          <Button
            disabled={page >= totalPages || loading}
            className="rounded-full!"
            onClick={() => onParamChange({ page: String(page + 1) })}
          >
            Sau
          </Button>
        </div>
      </section>
    </div>
  );
}

