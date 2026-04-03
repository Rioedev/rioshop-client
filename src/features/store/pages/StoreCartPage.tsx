import { Button, InputNumber, Progress, Select, message } from "antd";
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
import {
  formatStoreCurrency,
  resolveStoreProductColors,
  resolveStoreProductThumbnail,
} from "../utils/storeFormatting";
import {
  blockNonNumericAndOverflowKey,
  blockOverflowPaste,
  clampQuantityByStock,
  getSafeMaxQuantity,
} from "../utils/quantityInputGuards";
import { cartService, toCartCouponMeta, toCartStoreItems } from "../../../services/cartService";
import { couponService, type Coupon } from "../../../services/couponService";
import { productService, type Product } from "../../../services/productService";
import { shippingService, type ShippingPolicy } from "../../../services/shippingService";
import { buildCartItemId, type CartItem, useCartStore } from "../../../stores/cartStore";
import { useAuthStore } from "../../../stores/authStore";
import { getErrorMessage } from "../../../utils/errorMessage";
import {
  formatCouponCondition,
  formatCouponExpiry,
  formatCouponValue,
  readSavedCouponCodes,
} from "../shared/home";

const DEFAULT_SHIPPING_POLICY: ShippingPolicy = {
  freeShipEnabled: true,
  freeShipThreshold: 299000,
  freeShipEligibleMethods: ["standard", "express"],
  sameDayFlatFee: 45000,
  ghnFallbackStandardFee: 20000,
  ghnFallbackExpressFee: 30000,
};

export function StoreCartPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const items = useCartStore((state) => state.items);
  const couponCode = useCartStore((state) => state.couponCode);
  const couponDiscount = useCartStore((state) => state.couponDiscount);
  const setCartItems = useCartStore((state) => state.setItems);
  const setCoupon = useCartStore((state) => state.setCoupon);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const addCartItem = useCartStore((state) => state.addItem);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [selectedCouponCode, setSelectedCouponCode] = useState<string | undefined>(undefined);
  const [savedCoupons, setSavedCoupons] = useState<Coupon[]>([]);
  const [savedCouponCodes, setSavedCouponCodes] = useState<string[]>([]);
  const [savedCouponsLoading, setSavedCouponsLoading] = useState(false);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [clearingCoupon, setClearingCoupon] = useState(false);
  const [shippingPolicy, setShippingPolicy] = useState<ShippingPolicy>(DEFAULT_SHIPPING_POLICY);
  const [shippingPolicyLoading, setShippingPolicyLoading] = useState(true);

  useEffect(() => {
    setSelectedCouponCode(couponCode ?? undefined);
  }, [couponCode]);

  useEffect(() => {
    const savedCodes = readSavedCouponCodes();
    setSavedCouponCodes(savedCodes);

    if (savedCodes.length === 0) {
      setSavedCoupons([]);
      return;
    }

    let active = true;
    const loadSavedCoupons = async () => {
      setSavedCouponsLoading(true);
      try {
        const result = isAuthenticated
          ? await couponService.getMyAvailableCoupons({ page: 1, limit: 100 })
          : await couponService.getActiveCoupons({ page: 1, limit: 100 });
        if (!active) {
          return;
        }

        const activeCouponByCode = new Map(
          result.docs.map((coupon) => [coupon.code.trim().toUpperCase(), coupon] as const),
        );
        const orderedSavedCoupons = savedCodes
          .map((code) => activeCouponByCode.get(code))
          .filter((coupon): coupon is Coupon => Boolean(coupon));

        setSavedCoupons(orderedSavedCoupons);
      } catch {
        if (active) {
          setSavedCoupons([]);
        }
      } finally {
        if (active) {
          setSavedCouponsLoading(false);
        }
      }
    };

    void loadSavedCoupons();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    let active = true;

    const loadShippingPolicy = async () => {
      try {
        const policy = await shippingService.getShippingPolicy();
        if (!active) {
          return;
        }
        setShippingPolicy({
          ...DEFAULT_SHIPPING_POLICY,
          ...policy,
        });
      } catch {
        if (active) {
          setShippingPolicy(DEFAULT_SHIPPING_POLICY);
        }
      } finally {
        if (active) {
          setShippingPolicyLoading(false);
        }
      }
    };

    void loadShippingPolicy();
    return () => {
      active = false;
    };
  }, []);

  const {
    subtotal,
    discountValue,
    total,
    freeShipProgress,
    amountToFreeShip,
    totalItems,
    isFreeShipTracked,
    isEligibleForFreeShip,
  } = useMemo(() => {
    const subtotalValue = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const quantityValue = items.reduce((sum, item) => sum + item.quantity, 0);
    const threshold = Math.max(0, Number(shippingPolicy.freeShipThreshold || 0));
    const trackFreeShip = shippingPolicy.freeShipEnabled && threshold > 0;
    const eligible = trackFreeShip && subtotalValue >= threshold;
    const progress = trackFreeShip ? Math.min(100, Math.round((subtotalValue / threshold) * 100)) : 0;
    const discount = Math.max(0, Math.min(Number(couponDiscount || 0), subtotalValue));

    return {
      subtotal: subtotalValue,
      discountValue: discount,
      total: Math.max(0, subtotalValue - discount),
      freeShipProgress: progress,
      amountToFreeShip: trackFreeShip ? Math.max(0, threshold - subtotalValue) : 0,
      totalItems: quantityValue,
      isFreeShipTracked: trackFreeShip,
      isEligibleForFreeShip: eligible,
    };
  }, [couponDiscount, items, shippingPolicy]);

  const unavailableSavedCouponCodes = useMemo(() => {
    const availableCodes = new Set(savedCoupons.map((coupon) => coupon.code.trim().toUpperCase()));
    return savedCouponCodes.filter((code) => !availableCodes.has(code));
  }, [savedCouponCodes, savedCoupons]);

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

  const syncCartFromServer = (cart: Awaited<ReturnType<typeof cartService.getCart>>) => {
    const couponMeta = toCartCouponMeta(cart);
    setCartItems(
      toCartStoreItems(cart),
      undefined,
      couponMeta.couponCode,
      couponMeta.couponDiscount,
    );
  };

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
      syncCartFromServer(cart);
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
      syncCartFromServer(cart);
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
      syncCartFromServer(cart);
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
        syncCartFromServer(cart);
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

  const handleApplyCoupon = async () => {
    if (!isAuthenticated) {
      messageApi.warning("Vui lòng đăng nhập để áp dụng mã giảm giá.");
      return;
    }

    const nextCode = selectedCouponCode?.trim().toUpperCase() ?? "";
    if (!nextCode) {
      messageApi.warning("Vui lòng chọn mã giảm giá.");
      return;
    }

    setApplyingCoupon(true);
    try {
      const cart = await cartService.applyCoupon(nextCode);
      syncCartFromServer(cart);
      messageApi.success(`Áp dụng mã ${nextCode} thành công.`);
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleClearCoupon = async () => {
    if (!couponCode) {
      return;
    }

    if (!isAuthenticated) {
      setCoupon(null, 0);
      setSelectedCouponCode(undefined);
      return;
    }

    setClearingCoupon(true);
    try {
      const cart = await cartService.clearCoupon();
      syncCartFromServer(cart);
      setSelectedCouponCode(undefined);
      messageApi.success("Đã gỡ mã giảm giá.");
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    } finally {
      setClearingCoupon(false);
    }
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
      value: !isFreeShipTracked ? "Theo chính sách" : amountToFreeShip > 0 ? formatStoreCurrency(amountToFreeShip) : "Đã đạt",
      description: !isFreeShipTracked
        ? "Chính sách freeship được áp ở bước thanh toán theo phương thức giao."
        : amountToFreeShip > 0
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
              {shippingPolicyLoading ? (
                <span className="text-sm text-slate-500">Đang tải chính sách freeship...</span>
              ) : !isFreeShipTracked ? (
                <span className="text-sm text-slate-500">Freeship được áp ở bước checkout theo phương thức giao.</span>
              ) : amountToFreeShip > 0 ? (
                <span className="text-sm text-slate-500">Thêm {formatStoreCurrency(amountToFreeShip)} để được miễn phí vận chuyển</span>
              ) : (
                <span className="text-sm font-semibold text-emerald-600">Bạn đã đủ điều kiện freeship</span>
              )}
            </div>
            <Progress
              percent={isFreeShipTracked ? freeShipProgress : 0}
              showInfo={false}
              strokeColor="#0f172a"
              railColor="#e2e8f0"
            />
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
                  const colorChips = resolveStoreProductColors(item);
                  const visibleColorChips = colorChips.slice(0, 5);
                  const extraColorCount = Math.max(0, colorChips.length - visibleColorChips.length);

                  return (
                    <article key={item._id} className="cart-rec-card">
                      <div className="cart-rec-image">
                        {image ? (
                          <img src={image} alt={item.name} className="h-full w-full object-contain" />
                        ) : (
                          <div className="product-main-fallback">RIO</div>
                        )}
                      </div>
                      <div className="cart-rec-content">
                        <p className="cart-rec-title">{item.name}</p>
                        {visibleColorChips.length > 0 ? (
                          <div className="cart-rec-color-row" aria-label="Màu sắc sản phẩm">
                            {visibleColorChips.map((color) => (
                              <span
                                key={`${item._id}-${color.name}-${color.hex}`}
                                className="cart-rec-color-dot"
                                style={{ background: color.hex }}
                                title={color.name}
                              />
                            ))}
                            {extraColorCount > 0 ? <span className="cart-rec-color-more">+{extraColorCount}</span> : null}
                          </div>
                        ) : null}
                        <p className="cart-rec-price">{formatStoreCurrency(item.pricing.salePrice)}</p>
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
            <strong>
              {isFreeShipTracked && isEligibleForFreeShip
                ? "Đủ điều kiện freeship"
                : "Tính theo GHN ở bước thanh toán"}
            </strong>
          </div>
          {discountValue > 0 ? (
            <div className="cart-summary-row cart-summary-row-discount">
              <span>Giảm giá{couponCode ? ` (${couponCode})` : ""}</span>
              <strong>-{formatStoreCurrency(discountValue)}</strong>
            </div>
          ) : null}
          <div className="cart-summary-row is-total">
            <span>Tổng tạm tính</span>
            <strong>{formatStoreCurrency(total)}</strong>
          </div>
          <p className="mt-2 text-xs text-slate-500">Phí vận chuyển chính xác sẽ được tính theo GHN ở bước thanh toán.</p>

          <div className="mt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Mã giảm giá</p>
            <div className="flex gap-2">
              <Select
                value={selectedCouponCode}
                onChange={(value) => setSelectedCouponCode(value)}
                placeholder={
                  !isAuthenticated
                    ? "Đăng nhập để chọn mã"
                    : savedCouponsLoading
                      ? "Đang tải mã đã lưu..."
                      : savedCoupons.length === 0
                        ? "Chưa có mã đã lưu"
                        : "Chọn mã giảm giá đã lưu"
                }
                options={savedCoupons.map((coupon) => {
                  const normalizedCode = coupon.code.trim().toUpperCase();
                  const expiry = formatCouponExpiry(coupon.expiresAt);
                  return {
                    value: normalizedCode,
                    couponCode: normalizedCode,
                    label: (
                      <div style={{ whiteSpace: "normal", lineHeight: 1.35 }}>
                        <div>
                          {normalizedCode} - {formatCouponValue(coupon)}
                        </div>
                        <div className="text-xs text-slate-500">{formatCouponCondition(coupon)}</div>
                        <div className="text-xs text-slate-500">HSD {expiry}</div>
                      </div>
                    ),
                  };
                })}
                optionLabelProp="couponCode"
                loading={savedCouponsLoading}
                disabled={!isAuthenticated || savedCoupons.length === 0 || applyingCoupon || clearingCoupon}
                className="flex-1"
                popupMatchSelectWidth={false}
              />
              <Button
                className={storeButtonClassNames.ghostCompact}
                loading={applyingCoupon}
                disabled={
                  !selectedCouponCode ||
                  selectedCouponCode === couponCode ||
                  applyingCoupon ||
                  clearingCoupon ||
                  !isAuthenticated
                }
                onClick={() => void handleApplyCoupon()}
              >
                Áp dụng
              </Button>
            </div>
            {isAuthenticated && !savedCouponsLoading && savedCoupons.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">Bạn chưa lưu mã nào. Hãy vào trang chủ để lưu mã.</p>
            ) : null}
            {isAuthenticated && unavailableSavedCouponCodes.length > 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                {`Mã không còn hiệu lực: ${unavailableSavedCouponCodes.join(", ")}`}
              </p>
            ) : null}
            {couponCode ? (
              <div className="cart-coupon-chip mt-3">
                <span>Mã đang dùng: {couponCode}</span>
                <Button
                  type="link"
                  size="small"
                  loading={clearingCoupon}
                  className="px-0! text-slate-600!"
                  onClick={() => void handleClearCoupon()}
                >
                  Bỏ mã
                </Button>
              </div>
            ) : null}
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

