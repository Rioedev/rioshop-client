import { Button, Input, Select, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  StoreEmptyState,
  StoreInlineNote,
  StoreMetricGrid,
  StorePageShell,
  StoreHeroSection,
  StorePanelFrame,
  StoreSectionHeader,
  storeButtonClassNames,
} from "../components/StorePageChrome";
import { cartService, toCartCouponMeta, toCartStoreItems } from "../../../services/cartService";
import { formatStoreCurrency } from "../utils/storeFormatting";
import { orderService } from "../../../services/orderService";
import { paymentService } from "../../../services/paymentService";
import { analyticsTracker } from "../../../services/analyticsTracker";
import {
  shippingService,
  type GhnDistrict,
  type GhnProvince,
  type GhnWard,
} from "../../../services/shippingService";
import { useAuthStore } from "../../../stores/authStore";
import { useCartStore } from "../../../stores/cartStore";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export function StoreCheckoutPage() {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const cartItems = useCartStore((state) => state.items);
  const couponCode = useCartStore((state) => state.couponCode);
  const couponDiscount = useCartStore((state) => state.couponDiscount);
  const clearCart = useCartStore((state) => state.clearCart);
  const setCartItems = useCartStore((state) => state.setItems);

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [shippingMethod, setShippingMethod] = useState<"standard" | "express" | "same_day">("standard");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "momo" | "vnpay" | "bank_transfer">("cod");
  const [submitting, setSubmitting] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [shippingFeeLoading, setShippingFeeLoading] = useState(false);
  const [provinces, setProvinces] = useState<GhnProvince[]>([]);
  const [districts, setDistricts] = useState<GhnDistrict[]>([]);
  const [wards, setWards] = useState<GhnWard[]>([]);
  const [provinceId, setProvinceId] = useState<number | undefined>(undefined);
  const [districtId, setDistrictId] = useState<number | undefined>(undefined);
  const [wardCode, setWardCode] = useState<string | undefined>(undefined);
  const [shippingFee, setShippingFee] = useState(0);

  const selectedProvince = useMemo(
    () => provinces.find((item) => item.ProvinceID === provinceId) ?? null,
    [provinceId, provinces],
  );
  const selectedDistrict = useMemo(
    () => districts.find((item) => item.DistrictID === districtId) ?? null,
    [districtId, districts],
  );
  const selectedWard = useMemo(
    () => wards.find((item) => item.WardCode === wardCode) ?? null,
    [wardCode, wards],
  );

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  );

  const packageProfile = useMemo(() => {
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    return {
      weight: Math.max(100, totalQuantity * 300),
      length: 20,
      width: 15,
      height: Math.max(5, totalQuantity * 4),
    };
  }, [cartItems]);

  const { discountValue, total } = useMemo(() => {
    const discount = Math.max(0, Math.min(Number(couponDiscount || 0), subtotal + shippingFee));
    return {
      discountValue: discount,
      total: Math.max(0, subtotal + shippingFee - discount),
    };
  }, [couponDiscount, shippingFee, subtotal]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let mounted = true;

    const loadProvinces = async () => {
      setLocationLoading(true);
      try {
        const provinceList = await shippingService.getGhnProvinces();
        if (!mounted) {
          return;
        }
        setProvinces(provinceList);
        const preferred = provinceList.find((item) => item.ProvinceID === 201);
        setProvinceId((prev) => prev ?? preferred?.ProvinceID ?? provinceList[0]?.ProvinceID);
      } catch (error) {
        const text = error instanceof Error ? error.message : "Không tải được danh sách tỉnh/thành GHN";
        messageApi.error(text);
      } finally {
        if (mounted) {
          setLocationLoading(false);
        }
      }
    };

    void loadProvinces();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, messageApi]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (!provinceId) {
      setDistricts([]);
      setDistrictId(undefined);
      return;
    }

    let mounted = true;
    const loadDistricts = async () => {
      setLocationLoading(true);
      try {
        const districtList = await shippingService.getGhnDistricts(provinceId);
        if (!mounted) {
          return;
        }
        setDistricts(districtList);
        setDistrictId((prev) => {
          if (prev && districtList.some((item) => item.DistrictID === prev)) {
            return prev;
          }
          const preferred = districtList.find((item) =>
            item.DistrictName.toLowerCase().includes("bac tu liem"),
          );
          return preferred?.DistrictID ?? districtList[0]?.DistrictID;
        });
      } catch (error) {
        const text = error instanceof Error ? error.message : "Không tải được danh sách quận/huyện GHN";
        messageApi.error(text);
      } finally {
        if (mounted) {
          setLocationLoading(false);
        }
      }
    };

    setWards([]);
    setWardCode(undefined);
    void loadDistricts();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, messageApi, provinceId]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (!districtId) {
      setWards([]);
      setWardCode(undefined);
      return;
    }

    let mounted = true;
    const loadWards = async () => {
      setLocationLoading(true);
      try {
        const wardList = await shippingService.getGhnWards(districtId);
        if (!mounted) {
          return;
        }
        setWards(wardList);
        setWardCode((prev) => {
          if (prev && wardList.some((item) => item.WardCode === prev)) {
            return prev;
          }
          const preferred = wardList.find((item) => item.WardName.toLowerCase().includes("phu dien"));
          return preferred?.WardCode ?? wardList[0]?.WardCode;
        });
      } catch (error) {
        const text = error instanceof Error ? error.message : "Không tải được danh sách phường/xã GHN";
        messageApi.error(text);
      } finally {
        if (mounted) {
          setLocationLoading(false);
        }
      }
    };

    void loadWards();
    return () => {
      mounted = false;
    };
  }, [districtId, isAuthenticated, messageApi]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (subtotal <= 0) {
      setShippingFee(0);
      return;
    }

    if (shippingMethod === "same_day") {
      setShippingFee(45000);
      return;
    }

    if (!districtId || !wardCode) {
      setShippingFee(0);
      return;
    }

    let mounted = true;
    const quoteFee = async () => {
      setShippingFeeLoading(true);
      try {
        const result = await shippingService.calculateGhnFee({
          toDistrictId: districtId,
          toWardCode: wardCode,
          shippingMethod,
          insuranceValue: subtotal,
          packageProfile,
        });
        if (!mounted) {
          return;
        }
        setShippingFee(Math.max(0, Number(result.totalFee || 0)));
      } catch (error) {
        if (!mounted) {
          return;
        }
        const fallbackFee = shippingMethod === "express" ? 30000 : 20000;
        setShippingFee(fallbackFee);
        const text = error instanceof Error ? error.message : "Không tính được phí GHN, tạm dùng phí mặc định.";
        messageApi.warning(text);
      } finally {
        if (mounted) {
          setShippingFeeLoading(false);
        }
      }
    };

    void quoteFee();
    return () => {
      mounted = false;
    };
  }, [districtId, isAuthenticated, messageApi, packageProfile, shippingMethod, subtotal, wardCode]);

  const invalidProductIds = cartItems.filter((item) => !objectIdPattern.test(item.productId));
  const itemsMissingVariant = cartItems.filter((item) => !item.variantSku?.trim());

  if (!isAuthenticated) {
    return (
      <StoreEmptyState
        kicker="Thanh toán"
        title="Bạn cần đăng nhập để thanh toán"
        description="Vui lòng đăng nhập để tiếp tục đặt hàng, lưu địa chỉ nhận và theo dõi lịch sử đơn mua."
        action={
          <Link to="/login?redirect=%2Fcheckout">
            <Button type="primary" className={storeButtonClassNames.primary}>
              Đăng nhập ngay
            </Button>
          </Link>
        }
      />
    );
  }

  if (cartItems.length === 0) {
    return (
      <StoreEmptyState
        kicker="Thanh toán"
        title="Giỏ hàng đang trống"
        description="Chọn thêm sản phẩm trước khi tiến hành thanh toán và xác nhận đơn hàng."
        action={
          <Link to="/products">
            <Button type="primary" className={storeButtonClassNames.primary}>
              Đi mua sắm
            </Button>
          </Link>
        }
      />
    );
  }

  const onPlaceOrder = async () => {
    if (!fullName.trim() || !phone.trim() || !address.trim()) {
      messageApi.warning("Vui lòng nhập đầy đủ họ tên, số điện thoại và địa chỉ.");
      return;
    }

    if (!provinceId || !districtId || !wardCode || !selectedProvince || !selectedDistrict || !selectedWard) {
      messageApi.warning("Vui lòng chọn đầy đủ Tỉnh/Thành, Quận/Huyện và Phường/Xã theo dữ liệu GHN.");
      return;
    }

    if (shippingFeeLoading) {
      messageApi.info("Hệ thống đang tính phí vận chuyển GHN, vui lòng thử lại sau vài giây.");
      return;
    }

    if (invalidProductIds.length > 0) {
      messageApi.error("Có sản phẩm dữ liệu cũ trong giỏ hàng, vui lòng xóa và thêm lại.");
      return;
    }

    if (itemsMissingVariant.length > 0) {
      messageApi.error("Có sản phẩm chưa chọn size/màu. Vui lòng xóa và thêm lại đúng biến thể.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await orderService.createOrder({
        customerSnapshot: {
          name: fullName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim(),
        },
        items: cartItems.map((item) => ({
          productId: item.productId,
          variantSku: item.variantSku!,
          productName: item.name,
          variantLabel: item.variantLabel || "Mặc định",
          image: item.imageUrl ?? "https://dummyimage.com/400x400/e2e8f0/0f172a&text=RIO",
          unitPrice: item.price,
          quantity: item.quantity,
          totalPrice: item.price * item.quantity,
        })),
        shippingAddress: {
          line1: address.trim(),
          provinceId: selectedProvince.ProvinceID,
          provinceName: selectedProvince.ProvinceName,
          districtId: selectedDistrict.DistrictID,
          districtName: selectedDistrict.DistrictName,
          wardCode: selectedWard.WardCode,
          wardName: selectedWard.WardName,
          city: selectedProvince.ProvinceName,
          country: "Vietnam",
        },
        shippingFee,
        pricing: {
          shippingFee,
          currency: "VND",
        },
        couponCode: couponCode || undefined,
        couponDiscount: couponCode ? discountValue : undefined,
        paymentMethod,
        paymentStatus: "pending",
        shippingMethod,
        shippingCarrier: shippingMethod === "same_day" ? "Ahamove" : "GHN",
        note: note.trim() || undefined,
        source: "web",
      });

      void analyticsTracker.track({
        event: "purchase",
        userId: user?.id,
        orderId: created.id,
        properties: {
          orderNumber: created.orderNumber,
          paymentMethod,
          paymentStatus: created.paymentStatus,
          shippingMethod,
          itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
          total: created.pricing.total,
          currency: created.pricing.currency,
        },
      });

      clearCart();
      try {
        const cleared = await cartService.clearCart();
        const couponMeta = toCartCouponMeta(cleared);
        setCartItems(
          toCartStoreItems(cleared),
          user?.id ?? null,
          couponMeta.couponCode,
          couponMeta.couponDiscount,
        );
      } catch {
        // Keep local cart cleared to avoid blocking checkout flow if cart API is unavailable.
      }

      if (paymentMethod === "momo") {
        try {
          const initiated = await paymentService.createPayment({
            orderId: created.id,
            method: "momo",
            returnUrl: `${window.location.origin}/payment/momo-return`,
          });

          const gatewayResponse = initiated.gatewayResponse ?? {};
          const payUrl =
            (gatewayResponse.payUrl as string | undefined) ||
            (gatewayResponse.deeplink as string | undefined) ||
            (gatewayResponse.qrCodeUrl as string | undefined) ||
            null;

          if (payUrl) {
            window.location.href = payUrl;
            return;
          }

          messageApi.warning("Đã tạo đơn và lệnh thanh toán MoMo test nhưng chưa lấy được link thanh toán.");
          navigate("/orders", { state: { orderId: created.id } });
          return;
        } catch (error) {
          const paymentMessage = error instanceof Error ? error.message : "Không tạo được giao dịch MoMo test";
          messageApi.warning(`Đơn đã tạo nhưng lỗi MoMo: ${paymentMessage}`);
          navigate("/orders", { state: { orderId: created.id } });
          return;
        }
      }

      messageApi.success("Đặt hàng thành công");
      navigate("/orders", { state: { orderId: created.id } });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Đặt hàng thất bại";
      messageApi.error(messageText);
    } finally {
      setSubmitting(false);
    }
  };

  const checkoutMetrics = [
    {
      label: "Tạm tính",
      value: formatStoreCurrency(subtotal),
      description: "Giá trị hàng hóa trước phí giao và các ưu đãi.",
    },
    {
      label: "Vận chuyển",
      value: formatStoreCurrency(shippingFee),
      description: "Phí tạm tính dựa trên cách giao hàng bạn đang chọn.",
    },
    {
      label: "Thanh toán",
      value: formatStoreCurrency(total),
      description: "Tổng số tiền dự kiến cần thanh toán cho đơn này.",
    },
  ];

  return (
    <StorePageShell>
      {contextHolder}

      <StoreHeroSection
        kicker="Thanh toán"
        title="Hoàn tất đơn hàng"
        description="Xác nhận thông tin người nhận, phương thức giao và cách thanh toán trước khi đặt hàng."
        action={
          <Link to="/cart">
            <Button className={storeButtonClassNames.secondary}>Quay lại giỏ hàng</Button>
          </Link>
        }
      >
        <StoreMetricGrid items={checkoutMetrics} />
      </StoreHeroSection>

      <div className="cart-page-grid">
        <StorePanelFrame className="cart-list-wrap space-y-4">
          <StoreSectionHeader kicker="Thông tin giao nhận" title="Địa chỉ và liên hệ" />

          {invalidProductIds.length > 0 ? (
            <StoreInlineNote
              tone="warning"
              title="Có sản phẩm dữ liệu cũ trong giỏ hàng"
              description="Hệ thống yêu cầu productId hợp lệ. Vui lòng xóa item cũ và thêm lại từ trang chi tiết sản phẩm."
            />
          ) : null}

          {itemsMissingVariant.length > 0 ? (
            <StoreInlineNote
              tone="warning"
              title="Chưa chọn biến thể đầy đủ"
              description="Mỗi sản phẩm cần có SKU biến thể (màu/size) để hệ thống giữ tồn kho chính xác."
            />
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-sm font-semibold text-slate-600">Họ và tên</p>
              <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-slate-600">Số điện thoại</p>
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-slate-600">Email</p>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-slate-600">Tỉnh/Thành phố (GHN)</p>
              <Select
                value={provinceId}
                loading={locationLoading && provinces.length === 0}
                options={provinces.map((item) => ({
                  value: item.ProvinceID,
                  label: item.ProvinceName,
                }))}
                onChange={(value) => setProvinceId(value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-sm font-semibold text-slate-600">Quận/Huyện</p>
              <Select
                value={districtId}
                loading={locationLoading && districts.length === 0}
                options={districts.map((item) => ({
                  value: item.DistrictID,
                  label: item.DistrictName,
                }))}
                onChange={(value) => setDistrictId(value)}
                className="w-full"
              />
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-slate-600">Phường/Xã</p>
              <Select
                value={wardCode}
                loading={locationLoading && wards.length === 0}
                options={wards.map((item) => ({
                  value: item.WardCode,
                  label: item.WardName,
                }))}
                onChange={(value) => setWardCode(value)}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <p className="mb-1 text-sm font-semibold text-slate-600">Địa chỉ nhận hàng</p>
            <Input.TextArea rows={3} value={address} onChange={(event) => setAddress(event.target.value)} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-sm font-semibold text-slate-600">Hình thức vận chuyển</p>
              <Select
                value={shippingMethod}
                options={[
                  { value: "standard", label: "Tiêu chuẩn (2-4 ngày)" },
                  { value: "express", label: "Nhanh (1-2 ngày)" },
                  { value: "same_day", label: "Trong ngày (nội thành)" },
                ]}
                onChange={(value) => setShippingMethod(value)}
                className="w-full"
              />
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-slate-600">Hình thức thanh toán</p>
              <Select
                value={paymentMethod}
                options={[
                  { value: "cod", label: "Thanh toán khi nhận hàng" },
                  { value: "momo", label: "MoMo" },
                  { value: "vnpay", label: "VNPay" },
                  { value: "bank_transfer", label: "Chuyển khoản ngân hàng" },
                ]}
                onChange={(value) => setPaymentMethod(value)}
                className="w-full"
              />
            </div>
          </div>

          {shippingMethod !== "same_day" && shippingFeeLoading ? (
            <p className="m-0 text-xs text-slate-500">Đang tính phí vận chuyển GHN...</p>
          ) : null}

          <div>
            <p className="mb-1 text-sm font-semibold text-slate-600">Ghi chú đơn hàng</p>
            <Input.TextArea rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
          </div>

          <div className="space-y-2">
            {cartItems.map((item) => (
              <article key={item.itemId ?? `${item.productId}-${item.variantSku ?? "default"}`} className="cart-item-card">
                <div className="cart-item-image">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="product-main-fallback">RIO</div>
                  )}
                </div>
                <div className="cart-item-info">
                  <p className="m-0 text-sm font-semibold text-slate-900">{item.name}</p>
                  <p className="m-0 mt-1 text-xs text-slate-500">Số lượng: {item.quantity}</p>
                </div>
                <div className="cart-item-price">{formatStoreCurrency(item.price * item.quantity)}</div>
              </article>
            ))}
          </div>
        </StorePanelFrame>

        <StorePanelFrame className="cart-summary-card">
          <StoreSectionHeader kicker="Tóm tắt thanh toán" title="Tóm tắt đơn hàng" />

          <div className="cart-summary-row">
            <span>Tạm tính</span>
            <strong>{formatStoreCurrency(subtotal)}</strong>
          </div>
          <div className="cart-summary-row">
            <span>Phí vận chuyển</span>
            <strong>{formatStoreCurrency(shippingFee)}</strong>
          </div>
          {discountValue > 0 ? (
            <div className="cart-summary-row cart-summary-row-discount">
              <span>Giảm giá{couponCode ? ` (${couponCode})` : ""}</span>
              <strong>-{formatStoreCurrency(discountValue)}</strong>
            </div>
          ) : null}
          <div className="cart-summary-row is-total">
            <span>Tổng cộng</span>
            <strong>{formatStoreCurrency(total)}</strong>
          </div>

          <Button
            type="primary"
            block
            size="large"
            loading={submitting}
            className="store-home-v3-primary-btn mt-5! h-11! rounded-full! font-bold! shadow-none!"
            onClick={() => void onPlaceOrder()}
          >
            Đặt hàng
          </Button>
          <Link to="/cart" className="mt-3 block text-center text-sm text-slate-600 hover:text-slate-900">
            Quay lại giỏ hàng
          </Link>
        </StorePanelFrame>
      </div>
    </StorePageShell>
  );
}

