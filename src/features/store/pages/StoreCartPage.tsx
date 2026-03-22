import { Button, Input, InputNumber, Progress, message } from "antd";
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
import {
  blockNonNumericAndOverflowKey,
  blockOverflowPaste,
  clampQuantityByStock,
  getSafeMaxQuantity,
} from "../utils/quantityInputGuards";
import { cartService, toCartStoreItems } from "../../../services/cartService";
import { productService, type Product } from "../../../services/productService";
import { buildCartItemId, type CartItem, useCartStore } from "../../../stores/cartStore";
import { useAuthStore } from "../../../stores/authStore";

export function StoreCartPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const items = useCartStore((state) => state.items);
  const setCartItems = useCartStore((state) => state.setItems);
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

  const resolveItemId = (item: (typeof items)[number]) =>
    item.itemId || buildCartItemId({ productId: item.productId, variantSku: item.variantSku });
  const resolveItemMaxQuantity = (item: CartItem) =>
    getSafeMaxQuantity(item.availableStock, getSafeMaxQuantity(item.quantity, 1));

  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : "Không thể xử lý giỏ hàng";

  const handleUpdateQuantity = async (item: CartItem, quantity: number) => {
    const itemId = resolveItemId(item);
    const maxQuantity = resolveItemMaxQuantity(item);
    const nextQuantity = clampQuantityByStock(quantity, maxQuantity, 1);

    if (Number(quantity) > maxQuantity) {
      messageApi.warning(`Số lượng vượt tồn kho. Còn lại ${maxQuantity} sản phẩm.`);
    }

    if (!isAuthenticated) {
      updateQuantity(itemId, nextQuantity);
      return;
    }

    try {
      const cart = await cartService.updateItem(itemId, nextQuantity);
      setCartItems(toCartStoreItems(cart));
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!isAuthenticated) {
      removeItem(itemId);
      return;
    }

    try {
      const cart = await cartService.removeItem(itemId);
      setCartItems(toCartStoreItems(cart));
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleClearCart = async () => {
    if (!isAuthenticated) {
      clearCart();
      return;
    }

    try {
      const cart = await cartService.clearCart();
      setCartItems(toCartStoreItems(cart));
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleAddRecommendation = async (item: Product) => {
    const image = resolveStoreProductThumbnail(item);
    const variant = (item.variants ?? []).find((entry) => entry.isActive !== false && Number(entry.stock || 0) > 0) ?? null;
    if (!variant?.sku) {
      messageApi.error("Sản phẩm đã hết hàng hoặc chưa có biến thể hợp lệ.");
      return;
    }

    const variantLabel = `${variant.color?.name?.trim() || "Mặc định"} / ${(variant.sizeLabel || variant.size).trim()}`;
    const price = Math.max(
      0,
      item.pricing.salePrice + Number(variant.additionalPrice || 0),
    );

    if (isAuthenticated) {
      try {
        const cart = await cartService.addItem({
          productId: item._id,
          variantSku: variant.sku,
          quantity: 1,
        });
        setCartItems(toCartStoreItems(cart));
        messageApi.success("Đã thêm vào giỏ hàng");
      } catch (error) {
        messageApi.error(getErrorMessage(error));
      }
      return;
    }

    addCartItem({
      productId: item._id,
      slug: item.slug,
      name: `${item.name} - ${variantLabel}`,
      price,
      imageUrl: image,
      variantSku: variant.sku,
      variantLabel,
      availableStock: Math.max(1, Number(variant.stock || 1)),
      quantity: 1,
    });
    messageApi.success("Đã thêm vào giỏ hàng");
  };

  if (items.length === 0) {
    return (
      <StoreEmptyState
        kicker="Cart"
        title="Giỏ hàng đang trống"
        description="Bạn chưa có sản phẩm nào trong giỏ. Quay lại trang sản phẩm để tiếp tục mua sắm."
        action={
          <Link to="/">
            <Button type="primary" className={storeButtonClassNames.primary}>
              Tiếp tục mua sắm
            </Button>
          </Link>
        }
      />
    );
  }

  const cartMetrics = [
    {
      label: "Số lượng",
      value: totalItems,
      description: "Tổng số sản phẩm đang nằm trong giỏ.",
    },
    {
      label: "Tạm tính",
      value: formatStoreCurrency(subtotal),
      description: "Tổng giá trị hàng hóa trước phí vận chuyển.",
    },
    {
      label: "Freeship",
      value: amountToFreeShip > 0 ? formatStoreCurrency(amountToFreeShip) : "Đã đạt",
      description: amountToFreeShip > 0
        ? "Giá trị còn thiếu để đạt ngưỡng miễn phí giao hàng."
        : "Đơn hàng hiện tại đã đủ điều kiện freeship.",
    },
  ];

  return (
    <StorePageShell>
      {contextHolder}
      <StoreHeroSection
        kicker="Tổng quan giỏ hàng"
        title="Giỏ hàng của bạn"
        description="Kiểm tra nhanh tổng giá trị, tiến độ freeship và những sản phẩm bạn đang sẵn sàng đặt mua."
        action={
          <Link to="/products">
            <Button className={storeButtonClassNames.secondary}>Xem thêm sản phẩm</Button>
          </Link>
        }
      >
        <StoreMetricGrid items={cartMetrics} />
      </StoreHeroSection>

      <div className="cart-page-grid">
        <StorePanelFrame className="cart-list-wrap space-y-4">
          <div className="cart-free-ship-box">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="m-0 text-sm font-semibold text-slate-700">Tiến độ nhận freeship</p>
              {amountToFreeShip > 0 ? (
                <span className="text-sm text-slate-500">Thêm {formatStoreCurrency(amountToFreeShip)} để được miễn phí vận chuyển</span>
              ) : (
                <span className="text-sm font-semibold text-emerald-600">Bạn đã đủ điều kiện freeship</span>
              )}
            </div>
            <Progress percent={freeShipProgress} showInfo={false} strokeColor="#0f172a" trailColor="#e2e8f0" />
          </div>

          <StoreSectionHeader
            kicker="Chi tiết giỏ hàng"
            title="Sản phẩm đã chọn"
            action={
              <Button className={storeButtonClassNames.ghost} onClick={() => void handleClearCart()}>
                Xóa tất cả
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
                    Đơn giá: <strong className="text-slate-900">{formatStoreCurrency(item.price)}</strong>
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <InputNumber
                      min={1}
                      max={resolveItemMaxQuantity(item)}
                      value={item.quantity}
                      onChange={(value) => void handleUpdateQuantity(item, Number(value ?? 1))}
                      onKeyDown={(event) => blockNonNumericAndOverflowKey(event, resolveItemMaxQuantity(item))}
                      onPaste={(event) => blockOverflowPaste(event, resolveItemMaxQuantity(item))}
                      className="w-28! rounded-xl!"
                    />
                    <span className="text-xs text-slate-500">Tồn kho: {resolveItemMaxQuantity(item)}</span>
                    <Button
                      className={storeButtonClassNames.dangerCompact}
                      onClick={() => void handleRemoveItem(resolveItemId(item))}
                    >
                      Xóa
                    </Button>
                  </div>
                </div>

                <div className="cart-item-price">{formatStoreCurrency(item.price * item.quantity)}</div>
              </article>
            ))}
          </div>

          {recommendations.length > 0 ? (
            <div className="space-y-3">
              <StoreSectionHeader kicker="Gợi ý thêm" title="Có thể bạn cũng thích" />
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
                        onClick={() => void handleAddRecommendation(item)}
                      >
                        Thêm
                      </Button>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
        </StorePanelFrame>

        <StorePanelFrame className="cart-summary-card">
          <StoreSectionHeader kicker="Tóm tắt thanh toán" title="Tóm tắt đơn hàng" />

          <div className="cart-summary-row">
            <span>Tạm tính</span>
            <strong>{formatStoreCurrency(subtotal)}</strong>
          </div>
          <div className="cart-summary-row">
            <span>Phí vận chuyển</span>
            <strong>{shippingFee === 0 ? "Miễn phí" : formatStoreCurrency(shippingFee)}</strong>
          </div>
          <div className="cart-summary-row is-total">
            <span>Tổng cộng</span>
            <strong>{formatStoreCurrency(total)}</strong>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Mã giảm giá</p>
            <div className="flex gap-2">
              <Input placeholder="Nhập mã" className="rounded-full!" />
              <Button className={storeButtonClassNames.ghostCompact}>Áp dụng</Button>
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
            Tiếp tục mua sắm
          </Link>
        </StorePanelFrame>
      </div>
    </StorePageShell>
  );
}

