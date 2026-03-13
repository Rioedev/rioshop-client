import { Button, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { productService, type Product } from "../../../services/productService";

const { Paragraph, Title } = Typography;

type ShowcaseProduct = {
  id: string;
  name: string;
  category: string;
  salePrice: number;
  basePrice: number;
  imageUrl?: string;
  badge: string;
};

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000").replace(/\/$/, "");

const categoryHighlights = [
  {
    kicker: "Essential",
    title: "Ao thun nam",
    description: "Form regular, chat cotton compact, mac mat ca ngay.",
  },
  {
    kicker: "Everyday",
    title: "Quan lot",
    description: "Mem, thoang, om gon de chuyen dong linh hoat.",
  },
  {
    kicker: "Active",
    title: "Do the thao",
    description: "Vai nhanh kho, giu form va hut am toi uu.",
  },
  {
    kicker: "Saving",
    title: "Combo tiet kiem",
    description: "Mua theo set giam sau, de phoi va de dung.",
  },
];

const reasons = [
  {
    title: "Thu do 60 ngay",
    description: "Sai size doi ngay, khong can thao tac phuc tap.",
  },
  {
    title: "Chat lieu uu tien",
    description: "Tap trung vao do ben, do mem va do co gian khi mac.",
  },
  {
    title: "Giao nhanh toan quoc",
    description: "Ho tro giao nhanh tai cac thanh pho lon trong ngay.",
  },
];

const fallbackProducts: ShowcaseProduct[] = [
  {
    id: "fallback-1",
    name: "Ao thun Cotton Compact",
    category: "Ao thun nam",
    salePrice: 199000,
    basePrice: 249000,
    badge: "Ban chay",
  },
  {
    id: "fallback-2",
    name: "Quan lot Boxer Modal",
    category: "Quan lot",
    salePrice: 159000,
    basePrice: 199000,
    badge: "Moi",
  },
  {
    id: "fallback-3",
    name: "Ao polo AiryTech",
    category: "Polo",
    salePrice: 349000,
    basePrice: 429000,
    badge: "Deal",
  },
  {
    id: "fallback-4",
    name: "Combo 3 ao thun co tron",
    category: "Combo",
    salePrice: 499000,
    basePrice: 597000,
    badge: "Tiet kiem",
  },
  {
    id: "fallback-5",
    name: "Quan short Everyday",
    category: "Quan short",
    salePrice: 269000,
    basePrice: 329000,
    badge: "Hot",
  },
  {
    id: "fallback-6",
    name: "Ao tanktop MoveFit",
    category: "Do the thao",
    salePrice: 219000,
    basePrice: 269000,
    badge: "New",
  },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const resolveImageUrl = (product: Product): string | undefined => {
  const image = product.media?.find((item) => item.type === "image")?.url;

  if (!image) {
    return undefined;
  }

  if (/^https?:\/\//i.test(image)) {
    return image;
  }

  const normalizedPath = image.startsWith("/") ? image : `/${image}`;
  return `${apiBaseUrl}${normalizedPath}`;
};

export function StoreHomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchProducts = async () => {
      setLoading(true);

      try {
        const result = await productService.getProducts({
          page: 1,
          limit: 8,
          status: "active",
          sort: { createdAt: -1 },
        });

        if (active) {
          setProducts(result.docs);
        }
      } catch {
        if (active) {
          setProducts([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchProducts();

    return () => {
      active = false;
    };
  }, []);

  const showcaseProducts = useMemo<ShowcaseProduct[]>(() => {
    if (products.length === 0) {
      return fallbackProducts;
    }

    return products.slice(0, 8).map((product, index) => ({
      id: product._id,
      name: product.name,
      category: product.category?.name ?? "San pham moi",
      salePrice: product.pricing.salePrice,
      basePrice: product.pricing.basePrice,
      imageUrl: resolveImageUrl(product),
      badge: product.isNew
        ? "Moi"
        : product.isBestseller
          ? "Ban chay"
          : product.isFeatured
            ? "Noi bat"
            : index % 2 === 0
              ? "Hot"
              : "Deal",
    }));
  }, [products]);

  return (
    <div className="space-y-8 md:space-y-12">
      <section className="cool-hero p-6 md:p-10">
        <div className="cool-hero-content max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Spring Collection 2026
          </p>
          <Title level={1} className="mb-4! mt-3! text-3xl! leading-tight! text-slate-900! md:text-5xl!">
            Mac dep moi ngay, thoai mai nhu do mac nha.
          </Title>
          <Paragraph className="mb-6! max-w-xl! text-base! leading-7! text-slate-600!">
            Home page duoc dung theo phong cach Coolmate: bo cuc sach, khung banner lon,
            danh muc ro rang va card san pham toi gian de tap trung vao conversion.
          </Paragraph>

          <div className="flex flex-wrap gap-3">
            <Link to="/register">
              <Button type="primary" size="large" className="h-11! rounded-full! bg-slate-900! px-6! shadow-none!">
                Mua ngay
              </Button>
            </Link>
            <Button size="large" className="h-11! rounded-full! border-slate-300! px-6!">
              Xem combo tiet kiem
            </Button>
          </div>

          <div className="mt-7 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="cool-stat-card">
              <p className="cool-stat-value">120K+</p>
              <p className="cool-stat-label">Khach hang hang thang</p>
            </div>
            <div className="cool-stat-card">
              <p className="cool-stat-value">4.9/5</p>
              <p className="cool-stat-label">Danh gia trung binh</p>
            </div>
            <div className="cool-stat-card">
              <p className="cool-stat-value">60 ngay</p>
              <p className="cool-stat-label">Doi tra mien phi</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <Title level={3} className="m-0! text-2xl! text-slate-900!">
              Danh muc noi bat
            </Title>
            <Paragraph className="mb-0! mt-1! text-slate-600!">
              Chon nhanh theo nhu cau phoi do hang ngay.
            </Paragraph>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categoryHighlights.map((item) => (
            <button key={item.title} type="button" className="cool-category-card text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {item.kicker}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <Title level={3} className="m-0! text-2xl! text-slate-900!">
              San pham dang duoc quan tam
            </Title>
            <Paragraph className="mb-0! mt-1! text-slate-600!">
              Lay tu du lieu backend, fallback san pham demo khi he thong chua co data.
            </Paragraph>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`loading-${index}`} className="cool-skeleton-card" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {showcaseProducts.map((product) => {
              const hasDiscount = product.basePrice > product.salePrice;
              const discountPercent = hasDiscount
                ? Math.round(((product.basePrice - product.salePrice) / product.basePrice) * 100)
                : 0;

              return (
                <article key={product.id} className="cool-product-card group">
                  <div className="cool-product-media">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="cool-product-fallback">RIO</div>
                    )}
                    <span className="cool-product-badge">{product.badge}</span>
                    {hasDiscount ? (
                      <span className="cool-product-discount">-{discountPercent}%</span>
                    ) : null}
                  </div>

                  <div className="p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                      {product.category}
                    </p>
                    <h3 className="mt-2 min-h-12 text-base font-semibold leading-6 text-slate-900">
                      {product.name}
                    </h3>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-lg font-bold text-slate-900">
                        {formatCurrency(product.salePrice)}
                      </span>
                      {hasDiscount ? (
                        <span className="text-sm text-slate-400 line-through">
                          {formatCurrency(product.basePrice)}
                        </span>
                      ) : null}
                    </div>
                    <Button block className="mt-4! h-10! rounded-full! border-slate-300!">
                      Them vao gio
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {reasons.map((item) => (
          <article key={item.title} className="cool-feature-card">
            <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
          </article>
        ))}
      </section>

      <section className="cool-combo-banner">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Super Combo
          </p>
          <Title level={2} className="mb-3! mt-3! text-3xl! text-slate-900! md:text-4xl!">
            Mua nhieu tiet kiem nhieu
          </Title>
          <Paragraph className="mb-0! max-w-xl! text-base! leading-7! text-slate-600!">
            Chon combo 3, 5, 7 san pham de toi uu chi phi, phu hop cho nhu cau mac di lam
            va di choi trong ca tuan.
          </Paragraph>
        </div>
        <div className="mt-6 md:mt-0 md:text-right">
          <Button type="primary" size="large" className="h-11! rounded-full! bg-slate-900! px-7! shadow-none!">
            Kham pha combo
          </Button>
        </div>
      </section>

      <section className="cool-newsletter">
        <div>
          <Title level={4} className="mb-1! mt-0! text-slate-900!">
            Nhan uu dai hang tuan
          </Title>
          <Paragraph className="mb-0! text-slate-600!">
            Dang ky email de cap nhat bo suu tap moi va ma giam gia doc quyen.
          </Paragraph>
        </div>
        <div className="cool-newsletter-form">
          <input type="email" placeholder="Nhap email cua ban" className="cool-newsletter-input" />
          <Button type="primary" className="h-11! rounded-full! bg-slate-900! px-6! shadow-none!">
            Dang ky
          </Button>
        </div>
      </section>
    </div>
  );
}
