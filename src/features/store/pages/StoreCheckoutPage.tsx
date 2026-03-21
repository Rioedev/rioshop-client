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
        kicker="Checkout"
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
        kicker="Checkout"
        title="Gio hang dang trong"
        description="Chon them san pham truoc khi tien hanh thanh toan va xac nhan don hang."
        action={
          <Link to="/products">
            <Button type="primary" className={storeButtonClassNames.primary}>
              Di mua sam
            </Button>
          </Link>
        }
      />
    );
  }

  const onPlaceOrder = async () => {
    if (!fullName.trim() || !phone.trim() || !address.trim()) {
      messageApi.warning("Vui long nhap day du ho ten, so dien thoai va dia chi.");
      return;
    }

    if (invalidProductIds.length > 0) {
      messageApi.error("Co san pham du lieu cu trong gio hang, vui long xoa va them lai.");
      return;
    }

    if (itemsMissingVariant.length > 0) {
      messageApi.error("Co san pham chua chon size/mau. Vui long xoa va them lai dung bien the.");
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
          variantLabel: item.variantLabel || "Default",
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
      messageApi.success("Dat hang thanh cong");
      navigate("/orders", { state: { orderId: created.id } });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Dat hang that bai";
      messageApi.error(messageText);
    } finally {
      setSubmitting(false);
    }
  };

  const checkoutMetrics = [
    {
      label: "Tam tinh",
      value: formatStoreCurrency(subtotal),
      description: "Gia tri hang hoa truoc phi giao va cac uu dai.",
    },
    {
      label: "Van chuyen",
      value: formatStoreCurrency(shippingFee),
      description: "Phi tam tinh dua tren cach giao hang ban dang chon.",
    },
    {
      label: "Thanh toan",
      value: formatStoreCurrency(total),
      description: "Tong so tien du kien can thanh toan cho don nay.",
    },
  ];

  return (
    <StorePageShell>
      {contextHolder}

      <StoreHeroSection
        kicker="Checkout"
        title="Hoan tat don hang"
        description="Xac nhan thong tin nguoi nhan, phuong thuc giao va cach thanh toan truoc khi dat hang."
        action={
          <Link to="/cart">
            <Button className={storeButtonClassNames.secondary}>Quay lai gio hang</Button>
          </Link>
        }
      >
        <StoreMetricGrid items={checkoutMetrics} />
      </StoreHeroSection>

      <div className="cart-page-grid">
        <StorePanelFrame className="cart-list-wrap space-y-4">
          <StoreSectionHeader kicker="Thong tin giao nhan" title="Dia chi va lien he" />

          {invalidProductIds.length > 0 ? (
            <StoreInlineNote
              tone="warning"
              title="Co san pham du lieu cu trong gio hang"
              description="He thong yeu cau productId hop le. Vui long xoa item cu va them lai tu trang chi tiet san pham."
            />
          ) : null}

          {itemsMissingVariant.length > 0 ? (
            <StoreInlineNote
              tone="warning"
              title="Chua chon bien the day du"
              description="Moi san pham can co SKU bien the (mau/size) de he thong giu ton kho chinh xac."
            />
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-sm font-semibold text-slate-600">Ho va ten</p>
              <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-slate-600">So dien thoai</p>
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-slate-600">Email</p>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-slate-600">Thanh pho</p>
              <Select
                value={city}
                options={[
                  { value: "Ho Chi Minh", label: "Ho Chi Minh" },
                  { value: "Ha Noi", label: "Ha Noi" },
                  { value: "Da Nang", label: "Da Nang" },
                ]}
                onChange={(value) => setCity(value)}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <p className="mb-1 text-sm font-semibold text-slate-600">Quan/Huyen</p>
            <Input value={district} onChange={(event) => setDistrict(event.target.value)} />
          </div>

          <div>
            <p className="mb-1 text-sm font-semibold text-slate-600">Dia chi nhan hang</p>
            <Input.TextArea rows={3} value={address} onChange={(event) => setAddress(event.target.value)} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-sm font-semibold text-slate-600">Hinh thuc van chuyen</p>
              <Select
                value={shippingMethod}
                options={[
                  { value: "standard", label: "Tieu chuan (2-4 ngay)" },
                  { value: "express", label: "Nhanh (1-2 ngay)" },
                  { value: "same_day", label: "Trong ngay (noi thanh)" },
                ]}
                onChange={(value) => setShippingMethod(value)}
                className="w-full"
              />
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-slate-600">Hinh thuc thanh toan</p>
              <Select
                value={paymentMethod}
                options={[
                  { value: "cod", label: "Thanh toan khi nhan hang" },
                  { value: "momo", label: "MoMo" },
                  { value: "vnpay", label: "VNPay" },
                  { value: "bank_transfer", label: "Chuyen khoan ngan hang" },
                ]}
                onChange={(value) => setPaymentMethod(value)}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <p className="mb-1 text-sm font-semibold text-slate-600">Ghi chu don hang</p>
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
                  <p className="m-0 mt-1 text-xs text-slate-500">So luong: {item.quantity}</p>
                </div>
                <div className="cart-item-price">{formatStoreCurrency(item.price * item.quantity)}</div>
              </article>
            ))}
          </div>
        </StorePanelFrame>

        <StorePanelFrame className="cart-summary-card">
          <StoreSectionHeader kicker="Payment summary" title="Tom tat don hang" />

          <div className="cart-summary-row">
            <span>Tam tinh</span>
            <strong>{formatStoreCurrency(subtotal)}</strong>
          </div>
          <div className="cart-summary-row">
            <span>Phi van chuyen</span>
            <strong>{formatStoreCurrency(shippingFee)}</strong>
          </div>
          <div className="cart-summary-row is-total">
            <span>Tong cong</span>
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
            Dat hang
          </Button>
          <Link to="/cart" className="mt-3 block text-center text-sm text-slate-600 hover:text-slate-900">
            Quay lai gio hang
          </Link>
        </StorePanelFrame>
      </div>
    </StorePageShell>
  );
}
