import { Button, Input, InputNumber, Progress, Typography } from "antd";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { productService, type Product } from "../../../services/productService";
import { useCartStore } from "../../../stores/cartStore";

const { Paragraph, Title } = Typography;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000").replace(/\/$/, "");

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

export function StoreCartPage() {
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const addCartItem = useCartStore((state) => state.addItem);
  const [recommendations, setRecommendations] = useState<Product[]>([]);

  const { subtotal, shippingFee, total, freeShipProgress, amountToFreeShip } = useMemo(() => {
    const subtotalValue = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const threshold = 299000;
    const shipping = items.length === 0 || subtotalValue >= threshold ? 0 : 30000;
    const progress = Math.min(100, Math.round((subtotalValue / threshold) * 100));

    return {
      subtotal: subtotalValue,
      shippingFee: shipping,
      total: subtotalValue + shipping,
      freeShipProgress: progress,
      amountToFreeShip: Math.max(0, threshold - subtotalValue),
    };
  }, [items]);

  useEffect(() => {
    let active = true;

    const loadRecommendations = async () => {
      try {
        const result = await productService.getProducts({
          page: 1,
          limit: 8,
          status: "active",
          sort: { isFeatured: -1, totalSold: -1, createdAt: -1 },
        });

        if (!active) {
          return;
        }

        const inCartIds = new Set(items.map((item) => item.productId));
        setRecommendations(result.docs.filter((item) => !inCartIds.has(item._id)).slice(0, 3));
      } catch {
        if (active) {
          setRecommendations([]);
        }
      }
    };

    void loadRecommendations();

    return () => {
      active = false;
    };
  }, [items]);

  if (items.length === 0) {
    return (
      <section className="cart-empty-state">
        <Title level={3} className="mb-2! mt-0!">
          Gio hang dang trong
        </Title>
        <Paragraph className="mb-4! text-slate-600!">
          Ban chua co san pham nao trong gio. Chon them tu trang chu de tiep tuc.
        </Paragraph>
        <Link to="/">
          <Button type="primary" className="rounded-full! bg-slate-900! px-6! shadow-none!">
            Tiep tuc mua sam
          </Button>
        </Link>
      </section>
    );
  }

  return (
    <div className="cart-page-grid">
      <section className="cart-list-wrap space-y-4">
        <div className="cart-free-ship-box">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-sm font-semibold text-slate-700">Tien do nhan freeship</p>
            {amountToFreeShip > 0 ? (
              <span className="text-sm text-slate-500">Them {formatCurrency(amountToFreeShip)} de duoc mien phi van chuyen</span>
            ) : (
              <span className="text-sm font-semibold text-emerald-600">Ban da du dieu kien freeship</span>
            )}
          </div>
          <Progress percent={freeShipProgress} showInfo={false} strokeColor="#0f172a" trailColor="#e2e8f0" />
        </div>

        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <Title level={3} className="m-0!">
            Gio hang cua ban
          </Title>
          <Button className="rounded-full!" onClick={clearCart}>
            Xoa tat ca
          </Button>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.productId} className="cart-item-card">
              <Link to={`/products/${item.slug}`} className="cart-item-image">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="product-main-fallback">RIO</div>
                )}
              </Link>

              <div className="cart-item-info">
                <Link
                  to={`/products/${item.slug}`}
                  className="text-base font-semibold text-slate-900 hover:text-slate-700"
                >
                  {item.name}
                </Link>
                <p className="mt-2 text-sm text-slate-500">
                  Don gia: <strong className="text-slate-900">{formatCurrency(item.price)}</strong>
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <InputNumber
                    min={1}
                    value={item.quantity}
                    onChange={(value) => updateQuantity(item.productId, Number(value ?? 1))}
                    className="w-28! rounded-xl!"
                  />
                  <Button danger type="text" onClick={() => removeItem(item.productId)}>
                    Xoa
                  </Button>
                </div>
              </div>

              <div className="cart-item-price">{formatCurrency(item.price * item.quantity)}</div>
            </article>
          ))}
        </div>

        <div className="cart-recommend-grid">
          {recommendations.map((item) => {
            const image = resolveImageUrl(item.media?.find((media) => media.type === "image")?.url);
            return (
            <article key={item._id} className="cart-rec-card">
              <div className="cart-rec-image">
                {image ? (
                  <img src={image} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="product-main-fallback">RIO</div>
                )}
              </div>
              <div>
                <p className="m-0 text-sm font-semibold text-slate-900">{item.name}</p>
                <p className="m-0 mt-1 text-sm font-bold text-slate-700">{formatCurrency(item.pricing.salePrice)}</p>
              </div>
              <Button
                size="small"
                className="rounded-full!"
                onClick={() =>
                  addCartItem({
                    productId: item._id,
                    slug: item.slug,
                    name: item.name,
                    price: item.pricing.salePrice,
                    imageUrl: image,
                    quantity: 1,
                  })
                }
              >
                Them
              </Button>
            </article>
            );
          })}
        </div>
      </section>

      <aside className="cart-summary-card">
        <Title level={4} className="mb-4! mt-0!">
          Tom tat don hang
        </Title>

        <div className="cart-summary-row">
          <span>Tam tinh</span>
          <strong>{formatCurrency(subtotal)}</strong>
        </div>
        <div className="cart-summary-row">
          <span>Phi van chuyen</span>
          <strong>{shippingFee === 0 ? "Mien phi" : formatCurrency(shippingFee)}</strong>
        </div>
        <div className="cart-summary-row is-total">
          <span>Tong cong</span>
          <strong>{formatCurrency(total)}</strong>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Ma giam gia</p>
          <div className="flex gap-2">
            <Input placeholder="Nhap ma" className="rounded-full!" />
            <Button className="rounded-full!">Ap dung</Button>
          </div>
        </div>

        <Link to="/checkout" className="mt-4 block">
          <Button type="primary" block size="large" className="h-11! rounded-full! bg-slate-900! shadow-none!">
            Thanh toan
          </Button>
        </Link>
        <Link to="/" className="mt-3 block text-center text-sm text-slate-600 hover:text-slate-900">
          Tiep tuc mua sam
        </Link>
      </aside>
    </div>
  );
}
