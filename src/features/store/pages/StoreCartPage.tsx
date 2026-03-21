import { Button, Input, InputNumber, Progress } from "antd";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  StoreEmptyState,
  StoreMetricGrid,
  StorePageShell,
  StoreHeroSection,
  StorePanelFrame,
  StoreSectionHeader,
  storeButtonClassNames,
} from "../components/StorePageChrome";
import { formatStoreCurrency, resolveStoreProductThumbnail } from "../utils/storeFormatting";
import { productService, type Product } from "../../../services/productService";
import { useCartStore } from "../../../stores/cartStore";
import { useAuthStore } from "../../../stores/authStore";

export function StoreCartPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const addCartItem = useCartStore((state) => state.addItem);
  const [recommendations, setRecommendations] = useState<Product[]>([]);

  const { subtotal, shippingFee, total, freeShipProgress, amountToFreeShip, totalItems } = useMemo(() => {
    const subtotalValue = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const quantityValue = items.reduce((sum, item) => sum + item.quantity, 0);
    const threshold = 299000;
    const shipping = items.length === 0 || subtotalValue >= threshold ? 0 : 30000;
    const progress = Math.min(100, Math.round((subtotalValue / threshold) * 100));

    return {
      subtotal: subtotalValue,
      shippingFee: shipping,
      total: subtotalValue + shipping,
      freeShipProgress: progress,
      amountToFreeShip: Math.max(0, threshold - subtotalValue),
      totalItems: quantityValue,
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
      <StoreEmptyState
        kicker="Cart"
        title="Gio hang dang trong"
        description="Ban chua co san pham nao trong gio. Quay lai trang san pham de tiep tuc mua sam."
        action={
          <Link to="/">
            <Button type="primary" className={storeButtonClassNames.primary}>
              Tiep tuc mua sam
            </Button>
          </Link>
        }
      />
    );
  }

  const cartMetrics = [
    {
      label: "So luong",
      value: totalItems,
      description: "Tong so san pham dang nam trong gio.",
    },
    {
      label: "Tam tinh",
      value: formatStoreCurrency(subtotal),
      description: "Tong gia tri hang hoa truoc phi van chuyen.",
    },
    {
      label: "Freeship",
      value: amountToFreeShip > 0 ? formatStoreCurrency(amountToFreeShip) : "Da dat",
      description: amountToFreeShip > 0
        ? "Gia tri con thieu de dat nguong mien phi giao hang."
        : "Don hang hien tai da du dieu kien freeship.",
    },
  ];

  return (
    <StorePageShell>
      <StoreHeroSection
        kicker="Cart overview"
        title="Gio hang cua ban"
        description="Kiem tra nhanh tong gia tri, tien do freeship va nhung san pham ban dang san sang dat mua."
        action={
          <Link to="/products">
            <Button className={storeButtonClassNames.secondary}>Xem them san pham</Button>
          </Link>
        }
      >
        <StoreMetricGrid items={cartMetrics} />
      </StoreHeroSection>

      <div className="cart-page-grid">
        <StorePanelFrame className="cart-list-wrap space-y-4">
          <div className="cart-free-ship-box">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="m-0 text-sm font-semibold text-slate-700">Tien do nhan freeship</p>
              {amountToFreeShip > 0 ? (
                <span className="text-sm text-slate-500">Them {formatStoreCurrency(amountToFreeShip)} de duoc mien phi van chuyen</span>
              ) : (
                <span className="text-sm font-semibold text-emerald-600">Ban da du dieu kien freeship</span>
              )}
            </div>
            <Progress percent={freeShipProgress} showInfo={false} strokeColor="#0f172a" trailColor="#e2e8f0" />
          </div>

          <StoreSectionHeader
            kicker="Chi tiet gio hang"
            title="San pham da chon"
            action={
              <Button className={storeButtonClassNames.ghost} onClick={clearCart}>
                Xoa tat ca
              </Button>
            }
          />

          <div className="space-y-3">
            {items.map((item) => (
              <article key={item.itemId ?? `${item.productId}-${item.variantSku ?? "default"}`} className="cart-item-card">
                <Link to={`/products/${item.slug}`} className="cart-item-image">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="product-main-fallback">RIO</div>
                  )}
                </Link>

                <div className="cart-item-info">
                  <Link to={`/products/${item.slug}`} className="text-base font-semibold text-slate-900 hover:text-slate-700">
                    {item.name}
                  </Link>
                  <p className="mt-2 text-sm text-slate-500">
                    Don gia: <strong className="text-slate-900">{formatStoreCurrency(item.price)}</strong>
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <InputNumber
                      min={1}
                      value={item.quantity}
                      onChange={(value) => updateQuantity(item.itemId ?? `${item.productId}::${item.variantSku ?? "__default__"}`, Number(value ?? 1))}
                      className="w-28! rounded-xl!"
                    />
                    <Button
                      className={storeButtonClassNames.dangerCompact}
                      onClick={() => removeItem(item.itemId ?? `${item.productId}::${item.variantSku ?? "__default__"}`)}
                    >
                      Xoa
                    </Button>
                  </div>
                </div>

                <div className="cart-item-price">{formatStoreCurrency(item.price * item.quantity)}</div>
              </article>
            ))}
          </div>

          {recommendations.length > 0 ? (
            <div className="space-y-3">
              <StoreSectionHeader kicker="Goi y them" title="Co the ban cung thich" />
              <div className="cart-recommend-grid">
                {recommendations.map((item) => {
                  const image = resolveStoreProductThumbnail(item);

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
                        <p className="m-0 mt-1 text-sm font-bold text-slate-700">{formatStoreCurrency(item.pricing.salePrice)}</p>
                      </div>
                      <Button
                        size="small"
                        className={storeButtonClassNames.secondaryCompact}
                        onClick={() => {
                          const variant = (item.variants ?? []).find((entry) => entry.isActive !== false) ?? null;
                          const variantLabel = variant
                            ? `${variant.color?.name?.trim() || "Mac dinh"} / ${(variant.sizeLabel || variant.size).trim()}`
                            : undefined;
                          const price = Math.max(
                            0,
                            item.pricing.salePrice + Number(variant?.additionalPrice || 0),
                          );

                          addCartItem({
                            productId: item._id,
                            slug: item.slug,
                            name: variantLabel ? `${item.name} - ${variantLabel}` : item.name,
                            price,
                            imageUrl: image,
                            variantSku: variant?.sku,
                            variantLabel,
                            quantity: 1,
                          });
                        }}
                      >
                        Them
                      </Button>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
        </StorePanelFrame>

        <StorePanelFrame className="cart-summary-card">
          <StoreSectionHeader kicker="Summary" title="Tom tat don hang" />

          <div className="cart-summary-row">
            <span>Tam tinh</span>
            <strong>{formatStoreCurrency(subtotal)}</strong>
          </div>
          <div className="cart-summary-row">
            <span>Phi van chuyen</span>
            <strong>{shippingFee === 0 ? "Mien phi" : formatStoreCurrency(shippingFee)}</strong>
          </div>
          <div className="cart-summary-row is-total">
            <span>Tong cong</span>
            <strong>{formatStoreCurrency(total)}</strong>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Ma giam gia</p>
            <div className="flex gap-2">
              <Input placeholder="Nhap ma" className="rounded-full!" />
              <Button className={storeButtonClassNames.ghostCompact}>Ap dung</Button>
            </div>
          </div>

          <Link
            to={isAuthenticated ? "/checkout" : "/login?redirect=%2Fcheckout"}
            className="mt-5 block"
          >
            <Button type="primary" block size="large" className="store-home-v3-primary-btn h-11! rounded-full! font-bold! shadow-none!">
              {isAuthenticated ? "Thanh toán" : "Đăng nhập để thanh toán"}
            </Button>
          </Link>
          <Link to="/" className="mt-3 block text-center text-sm text-slate-600 hover:text-slate-900">
            Tiep tuc mua sam
          </Link>
        </StorePanelFrame>
      </div>
    </StorePageShell>
  );
}
