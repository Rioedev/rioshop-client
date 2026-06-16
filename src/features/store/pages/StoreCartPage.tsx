import { Button, Checkbox, InputNumber, Progress, Select, message } from "antd";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { StoreProductGridCard } from "../components/StoreProductGridCard";
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
  resolveStoreImageUrl,
  resolveStoreProductThumbnail,
} from "../utils/storeFormatting";
import { toStoreColorSwatches } from "../utils/productSwatches";
import {
  blockNonNumericAndOverflowKey,
  blockOverflowPaste,
  clampQuantityByStock,
  getSafeMaxQuantity,
} from "../utils/quantityInputGuards";
import { cartService, toCartCouponMeta, toCartStoreItems } from "../../../services/cartService";
import { couponService, type Coupon } from "../../../services/couponService";
import {
  productService,
  type CartProductRecommendation,
  type Product,
} from "../../../services/productService";
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

const resolveCartItemId = (item: CartItem) =>
  item.itemId || buildCartItemId({ productId: item.productId, variantSku: item.variantSku });

const getCouponSelectionBlockReason = (
  coupon: Coupon,
  selectedSubtotal: number,
  selectedQuantity: number,
) => {
  if (selectedQuantity <= 0) {
    return "Vui lòng chọn sản phẩm trước khi áp mã.";
  }

  const minOrderValue = Number(coupon.minOrderValue || 0);
  if (minOrderValue > 0 && selectedSubtotal < minOrderValue) {
    return `Đơn hàng cần tối thiểu ${formatStoreCurrency(minOrderValue)} để dùng mã ${coupon.code}.`;
  }

  return "";
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
  const [recommendations, setRecommendations] = useState<CartProductRecommendation[]>([]);
  const [selectedCouponCode, setSelectedCouponCode] = useState<string | undefined>(undefined);
  const [savedCoupons, setSavedCoupons] = useState<Coupon[]>([]);
  const [savedCouponCodes, setSavedCouponCodes] = useState<string[]>([]);
  const [savedCouponsLoading, setSavedCouponsLoading] = useState(false);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [clearingCoupon, setClearingCoupon] = useState(false);
  const [shippingPolicy, setShippingPolicy] = useState<ShippingPolicy>(DEFAULT_SHIPPING_POLICY);
  const [shippingPolicyLoading, setShippingPolicyLoading] = useState(true);
  const [selectedCheckoutItemIds, setSelectedCheckoutItemIds] = useState<string[]>([]);
  const selectionInitializedRef = useRef(false);
  const previousCartItemIdsRef = useRef<string[]>([]);

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

  const { subtotal, totalItems } = useMemo(() => {
    const subtotalValue = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const quantityValue = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      subtotal: subtotalValue,
      totalItems: quantityValue,
    };
  }, [items]);

  const unavailableSavedCouponCodes = useMemo(() => {
    const availableCodes = new Set(savedCoupons.map((coupon) => coupon.code.trim().toUpperCase()));
    return savedCouponCodes.filter((code) => !availableCodes.has(code));
  }, [savedCouponCodes, savedCoupons]);

  useEffect(() => {
    let active = true;

    const loadRecommendations = async () => {
      const productIds = [...new Set(items.map((item) => item.productId).filter(Boolean))];
      if (productIds.length === 0) {
        setRecommendations([]);
        return;
      }

      try {
        const result = await productService.getCartRecommendations(productIds, 4);

        if (!active) {
          return;
        }

        setRecommendations(result);
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

  const resolveItemMaxQuantity = (item: CartItem) =>
    getSafeMaxQuantity(item.availableStock, getSafeMaxQuantity(item.quantity, 1));

  const cartItemIds = useMemo(() => items.map((item) => resolveCartItemId(item)), [items]);

  useEffect(() => {
    setSelectedCheckoutItemIds((currentSelectedIds) => {
      const previousCartItemIds = previousCartItemIdsRef.current;
      const currentCartItemIdSet = new Set(cartItemIds);
      const selectedIdSet = new Set(currentSelectedIds);
      const wasEverythingSelected =
        previousCartItemIds.length > 0 && previousCartItemIds.every((itemId) => selectedIdSet.has(itemId));

      previousCartItemIdsRef.current = cartItemIds;

      if (!selectionInitializedRef.current || wasEverythingSelected) {
        selectionInitializedRef.current = true;
        return cartItemIds;
      }

      return currentSelectedIds.filter((itemId) => currentCartItemIdSet.has(itemId));
    });
  }, [cartItemIds]);

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
    const itemId = resolveCartItemId(item);
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

  const selectedCheckoutItemIdSet = useMemo(
    () => new Set(selectedCheckoutItemIds),
    [selectedCheckoutItemIds],
  );
  const selectedCheckoutItems = useMemo(
    () => items.filter((item) => selectedCheckoutItemIdSet.has(resolveCartItemId(item))),
    [items, selectedCheckoutItemIdSet],
  );
  const isAllCheckoutItemsSelected = items.length > 0 && selectedCheckoutItems.length === items.length;
  const selectedCheckoutQuantity = selectedCheckoutItems.reduce((sum, item) => sum + item.quantity, 0);
  const selectedCheckoutSubtotal = selectedCheckoutItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const {
    freeShipProgress,
    amountToFreeShip,
    isFreeShipTracked,
    isEligibleForFreeShip,
  } = useMemo(() => {
    const threshold = Math.max(0, Number(shippingPolicy.freeShipThreshold || 0));
    const trackFreeShip = shippingPolicy.freeShipEnabled && threshold > 0;
    const hasSelectedItems = selectedCheckoutQuantity > 0;

    return {
      freeShipProgress:
        trackFreeShip && hasSelectedItems
          ? Math.min(100, Math.round((selectedCheckoutSubtotal / threshold) * 100))
          : 0,
      amountToFreeShip:
        trackFreeShip && hasSelectedItems
          ? Math.max(0, threshold - selectedCheckoutSubtotal)
          : threshold,
      isFreeShipTracked: trackFreeShip,
      isEligibleForFreeShip:
        trackFreeShip && hasSelectedItems && selectedCheckoutSubtotal >= threshold,
    };
  }, [selectedCheckoutQuantity, selectedCheckoutSubtotal, shippingPolicy]);
  const savedCouponByCode = useMemo(
    () => new Map(savedCoupons.map((coupon) => [coupon.code.trim().toUpperCase(), coupon] as const)),
    [savedCoupons],
  );
  const selectedCoupon = selectedCouponCode
    ? savedCouponByCode.get(selectedCouponCode.trim().toUpperCase())
    : undefined;
  const selectedCouponBlockReason = selectedCoupon
    ? getCouponSelectionBlockReason(
        selectedCoupon,
        selectedCheckoutSubtotal,
        selectedCheckoutQuantity,
      )
    : "";
  const appliedCoupon = couponCode
    ? savedCouponByCode.get(couponCode.trim().toUpperCase())
    : undefined;
  const appliedCouponBlockReason = appliedCoupon
    ? getCouponSelectionBlockReason(
        appliedCoupon,
        selectedCheckoutSubtotal,
        selectedCheckoutQuantity,
      )
    : "";
  const selectedCheckoutDiscountValue = Math.max(
    0,
    appliedCouponBlockReason
      ? 0
      : Math.min(Number(couponDiscount || 0), selectedCheckoutSubtotal),
  );
  const selectedCheckoutTotal = Math.max(
    0,
    selectedCheckoutSubtotal - selectedCheckoutDiscountValue,
  );
  const checkoutUrl = useMemo(() => {
    const params = new URLSearchParams();
    selectedCheckoutItemIds.forEach((itemId) => params.append("item", itemId));
    const queryString = params.toString();
    return queryString ? `/checkout?${queryString}` : "/checkout";
  }, [selectedCheckoutItemIds]);
  const checkoutNavigationUrl = isAuthenticated
    ? checkoutUrl
    : `/login?redirect=${encodeURIComponent(checkoutUrl)}`;

  const handleToggleCheckoutItem = (itemId: string, checked: boolean) => {
    setSelectedCheckoutItemIds((currentSelectedIds) => {
      if (checked) {
        return currentSelectedIds.includes(itemId)
          ? currentSelectedIds
          : [...currentSelectedIds, itemId];
      }

      return currentSelectedIds.filter((selectedItemId) => selectedItemId !== itemId);
    });
  };

  const handleToggleAllCheckoutItems = (checked: boolean) => {
    setSelectedCheckoutItemIds(checked ? cartItemIds : []);
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
      (item.pricing.regularPrice ?? item.pricing.salePrice) + Number(variant.additionalPrice || 0),
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

    const coupon = savedCouponByCode.get(nextCode);
    const blockReason = coupon
      ? getCouponSelectionBlockReason(
          coupon,
          selectedCheckoutSubtotal,
          selectedCheckoutQuantity,
        )
      : "";

    if (blockReason) {
      messageApi.warning(blockReason);
      return;
    }

    setApplyingCoupon(true);
    try {
      const validation = await couponService.validateCoupon({
        code: nextCode,
        orderValue: selectedCheckoutSubtotal,
        productIds: selectedCheckoutItems.map((item) => item.productId),
      });

      if (!validation.isValid) {
        messageApi.warning(getErrorMessage(new Error(validation.reason || "Mã giảm giá không đủ điều kiện.")));
        return;
      }

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
      value: selectedCheckoutQuantity <= 0
        ? "Chưa chọn"
        : !isFreeShipTracked
          ? "Theo chính sách"
          : amountToFreeShip > 0
            ? formatStoreCurrency(amountToFreeShip)
            : "Đã đạt",
      description: !isFreeShipTracked
        ? "Chính sách freeship được áp ở bước thanh toán theo phương thức giao."
        : selectedCheckoutQuantity <= 0
          ? "Chọn sản phẩm để kiểm tra điều kiện miễn phí giao hàng."
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
              ) : selectedCheckoutQuantity <= 0 ? (
                <span className="text-sm text-slate-500">Chọn sản phẩm để tính điều kiện freeship</span>
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
              <div className="cart-selection-actions">
                <Checkbox
                  checked={isAllCheckoutItemsSelected}
                  indeterminate={selectedCheckoutItems.length > 0 && !isAllCheckoutItemsSelected}
                  onChange={(event) => handleToggleAllCheckoutItems(event.target.checked)}
                >
                  Chọn tất cả
                </Checkbox>
                <Button className={storeButtonClassNames.ghost} onClick={() => void handleClearCart()}>
                  Xóa tất cả
                </Button>
              </div>
            }
          />

          <div className="space-y-3">
            {items.map((item) => {
              const itemId = resolveCartItemId(item);
              return (
                <article
                  key={item.itemId ?? `${item.productId}-${item.variantSku ?? "default"}`}
                  className="cart-item-card cart-item-card--selectable"
                >
                  <Checkbox
                    className="cart-item-check"
                    checked={selectedCheckoutItemIdSet.has(itemId)}
                    aria-label={`Chọn ${item.name} để thanh toán`}
                    onChange={(event) => handleToggleCheckoutItem(itemId, event.target.checked)}
                  />
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
                      onClick={() => void handleRemoveItem(itemId)}
                    >
                      Xóa
                    </Button>
                  </div>
                </div>

                <div className="cart-item-price">{formatStoreCurrency(item.price * item.quantity)}</div>
              </article>
              );
            })}
          </div>

          {recommendations.length > 0 ? (
            <div className="space-y-3">
              <StoreSectionHeader kicker="Gợi ý thêm" title="Có thể bạn cũng thích" />
              <div className="cart-recommend-grid">
                {recommendations.map(({ product: item }) => {
                  const image = resolveStoreProductThumbnail(item);
                  const colorSwatches = toStoreColorSwatches(item, image).map((color) => ({
                    ...color,
                    imageUrl: resolveStoreImageUrl(color.imageUrl),
                  }));
                  const regularPrice = item.pricing.regularPrice ?? item.pricing.salePrice;
                  const compareAtPrice = item.pricing.compareAtPrice ?? item.pricing.basePrice;
                  const hasDiscount = Number(compareAtPrice || 0) > regularPrice;
                  const discountLabel = hasDiscount
                    ? `-${Math.round(((Number(compareAtPrice) - regularPrice) / Number(compareAtPrice)) * 100)}%`
                    : undefined;

                  return (
                    <StoreProductGridCard
                      key={item._id}
                      href={`/products/${item.slug}`}
                      imageUrl={image}
                      name={item.name}
                      price={formatStoreCurrency(regularPrice)}
                      originalPrice={hasDiscount ? formatStoreCurrency(Number(compareAtPrice)) : undefined}
                      categoryLabel={item.category?.name ?? "Sản phẩm"}
                      badge={discountLabel}
                      colorSwatches={colorSwatches}
                      footer={
                        <Button
                          size="small"
                          className={`${storeButtonClassNames.secondaryCompact} cart-recommend-add`}
                          onClick={() => void handleAddRecommendation(item)}
                        >
                          Thêm
                        </Button>
                      }
                    />
                  );
                })}
              </div>
            </div>
          ) : null}
        </StorePanelFrame>

        <StorePanelFrame className="cart-summary-card">
          <StoreSectionHeader kicker="Tóm tắt thanh toán" title="Tóm tắt đơn hàng" />

          <div className="cart-summary-row">
            <span>Đã chọn</span>
            <strong>{selectedCheckoutQuantity} sản phẩm</strong>
          </div>
          <div className="cart-summary-row">
            <span>Tạm tính</span>
            <strong>{formatStoreCurrency(selectedCheckoutSubtotal)}</strong>
          </div>
          <div className="cart-summary-row">
            <span>Phí vận chuyển</span>
            <strong>
              {selectedCheckoutQuantity <= 0
                ? "Chưa chọn sản phẩm"
                : isFreeShipTracked && isEligibleForFreeShip
                ? "Đủ điều kiện freeship"
                : "Tính theo GHN ở bước thanh toán"}
            </strong>
          </div>
          {selectedCheckoutDiscountValue > 0 ? (
            <div className="cart-summary-row cart-summary-row-discount">
              <span>Giảm giá{couponCode ? ` (${couponCode})` : ""}</span>
              <strong>-{formatStoreCurrency(selectedCheckoutDiscountValue)}</strong>
            </div>
          ) : null}
          <div className="cart-summary-row is-total">
            <span>Tổng tạm tính</span>
            <strong>{formatStoreCurrency(selectedCheckoutTotal)}</strong>
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
                  const blockReason = getCouponSelectionBlockReason(
                    coupon,
                    selectedCheckoutSubtotal,
                    selectedCheckoutQuantity,
                  );
                  return {
                    value: normalizedCode,
                    couponCode: normalizedCode,
                    disabled: Boolean(blockReason),
                    label: (
                      <div style={{ whiteSpace: "normal", lineHeight: 1.35 }}>
                        <div>
                          {normalizedCode} - {formatCouponValue(coupon)}
                        </div>
                        <div className="text-xs text-slate-500">{formatCouponCondition(coupon)}</div>
                        {blockReason ? (
                          <div className="text-xs text-amber-600">{blockReason}</div>
                        ) : null}
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
                  Boolean(selectedCouponBlockReason) ||
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
            {selectedCouponBlockReason ? (
              <p className="mt-2 text-xs text-amber-600">{selectedCouponBlockReason}</p>
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
            {appliedCouponBlockReason ? (
              <p className="mt-2 text-xs text-amber-600">
                {appliedCouponBlockReason} Mã sẽ không được áp dụng cho nhóm sản phẩm đang chọn.
              </p>
            ) : null}
          </div>

          <Link
            to={checkoutNavigationUrl}
            className="mt-5 block"
            onClick={(event) => {
              if (selectedCheckoutItems.length === 0) {
                event.preventDefault();
                messageApi.warning("Vui lòng chọn ít nhất một sản phẩm để thanh toán.");
                return;
              }

              if (appliedCouponBlockReason) {
                event.preventDefault();
                messageApi.warning(appliedCouponBlockReason);
              }
            }}
          >
            <Button
              type="primary"
              block
              size="large"
              disabled={selectedCheckoutItems.length === 0}
              className="store-home-v3-primary-btn h-11! rounded-full! font-bold! shadow-none!"
            >
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

