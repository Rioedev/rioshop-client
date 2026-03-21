import { Button, Input, Select, message } from "antd";
import { useMemo, useState } from "react";
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
import { formatStoreCurrency } from "../utils/storeFormatting";
import { orderService } from "../../../services/orderService";
import { useAuthStore } from "../../../stores/authStore";
import { useCartStore } from "../../../stores/cartStore";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export function StoreCheckoutPage() {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const cartItems = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Ho Chi Minh");
  const [district, setDistrict] = useState("");
  const [note, setNote] = useState("");
  const [shippingMethod, setShippingMethod] = useState<"standard" | "express" | "same_day">("standard");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "momo" | "vnpay" | "bank_transfer">("cod");
  const [submitting, setSubmitting] = useState(false);

  const { subtotal, shippingFee, total } = useMemo(() => {
    const subtotalValue = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const fee = shippingMethod === "same_day" ? 45000 : shippingMethod === "express" ? 30000 : 20000;

    return {
      subtotal: subtotalValue,
      shippingFee: subtotalValue === 0 ? 0 : fee,
      total: subtotalValue + (subtotalValue === 0 ? 0 : fee),
    };
  }, [cartItems, shippingMethod]);

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
          district: district.trim(),
          city,
          country: "Vietnam",
        },
        shippingFee,
        pricing: {
          shippingFee,
          currency: "VND",
        },
        paymentMethod,
        paymentStatus: paymentMethod === "cod" ? "pending" : "paid",
        shippingMethod,
        shippingCarrier: shippingMethod === "same_day" ? "Ahamove" : "GHN",
        note: note.trim() || undefined,
        source: "web",
      });

      clearCart();
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
              <p className="mb-1 text-sm font-semibold text-slate-600">Thành phố</p>
              <Select
                value={city}
                options={[
                  { value: "Ho Chi Minh", label: "Hồ Chí Minh" },
                  { value: "Ha Noi", label: "Hà Nội" },
                  { value: "Da Nang", label: "Đà Nẵng" },
                ]}
                onChange={(value) => setCity(value)}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <p className="mb-1 text-sm font-semibold text-slate-600">Quận/Huyện</p>
            <Input value={district} onChange={(event) => setDistrict(event.target.value)} />
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

