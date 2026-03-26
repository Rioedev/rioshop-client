import { Button, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  StoreEmptyState,
  StoreHeroSection,
  StoreInlineNote,
  StoreMetricGrid,
  StorePageShell,
  StorePanelSection,
  StoreStatusPill,
  storeButtonClassNames,
} from "../components/StorePageChrome";
import { formatStoreCurrency, resolveStoreImageUrl } from "../utils/storeFormatting";
import { paymentService } from "../../../services/paymentService";
import {
  orderService,
  type OrderRecord,
  type PaymentMethod,
  type PaymentStatus,
} from "../../../services/orderService";
import { useAuthStore } from "../../../stores/authStore";

const orderStatusLabelMap: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  packing: "Đang đóng gói",
  ready_to_ship: "Chờ lấy hàng",
  shipping: "Đang giao",
  delivered: "Đã giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  returned: "Hoàn trả",
};
const ONLINE_PAYMENT_METHODS = new Set(["momo", "vnpay", "zalopay", "card", "bank_transfer"]);

const getOrderStatusLabel = (order: Pick<OrderRecord, "status" | "paymentStatus" | "paymentMethod">) => {
  if (
    order.status === "pending" &&
    order.paymentStatus === "pending" &&
    ONLINE_PAYMENT_METHODS.has(order.paymentMethod)
  ) {
    return "Chờ thanh toán";
  }

  return orderStatusLabelMap[order.status] ?? order.status;
};

const paymentStatusLabelMap: Record<PaymentStatus, string> = {
  pending: "ChÆ°a thanh toÃ¡n",
  paid: "ÄÃ£ thanh toÃ¡n",
  failed: "Thanh toÃ¡n lá»—i",
  refunded: "ÄÃ£ hoÃ n tiá»n",
};

const paymentMethodLabelMap: Record<PaymentMethod, string> = {
  momo: "VÃ­ MoMo",
  vnpay: "VNPay",
  zalopay: "ZaloPay",
  cod: "Thanh toÃ¡n khi nháº­n hÃ ng",
  bank_transfer: "Chuyá»ƒn khoáº£n ngÃ¢n hÃ ng",
  card: "Tháº» ngÃ¢n hÃ ng",
};

const pickFirstText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
};

const formatShippingAddress = (shippingAddress: unknown) => {
  if (!shippingAddress) {
    return "Äang cáº­p nháº­t";
  }

  if (typeof shippingAddress === "string") {
    return shippingAddress.trim() || "Äang cáº­p nháº­t";
  }

  if (typeof shippingAddress !== "object") {
    return String(shippingAddress);
  }

  const value = shippingAddress as Record<string, unknown>;
  const line1 = pickFirstText(value.line1, value.addressLine1, value.street, value.address);
  const line2 = pickFirstText(value.line2, value.addressLine2, value.ward);
  const district = pickFirstText(value.district);
  const city = pickFirstText(value.city, value.province, value.state);
  const country = pickFirstText(value.country);

  const normalized = [line1, line2, district, city, country].filter(
    (part): part is string => Boolean(part),
  );

  if (normalized.length > 0) {
    return normalized.join(", ");
  }

  return "Äang cáº­p nháº­t";
};

const formatDateTime = (value?: string) => {
  if (!value) {
    return "Äang cáº­p nháº­t";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Äang cáº­p nháº­t";
  }

  return parsedDate.toLocaleString("vi-VN");
};

export function StoreOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [messageApi, contextHolder] = message.useMessage();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryingPayment, setRetryingPayment] = useState(false);

  const loadOrderDetail = async () => {
    if (!id) {
      setOrder(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await orderService.getOrderById(id);
      setOrder(result);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "KhÃ´ng thá»ƒ táº£i chi tiáº¿t Ä‘Æ¡n hÃ ng";
      messageApi.error(messageText);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setOrder(null);
      setLoading(false);
      return;
    }

    void loadOrderDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isAuthenticated]);

  const canRetryMomoPayment = useMemo(() => {
    if (!order) {
      return false;
    }

    return (
      order.paymentMethod === "momo" &&
      ["pending", "failed"].includes(order.paymentStatus) &&
      ["pending", "confirmed", "packing", "ready_to_ship", "shipping"].includes(order.status)
    );
  }, [order]);

  const overviewMetrics = useMemo(() => {
    if (!order) {
      return [];
    }

    return [
      {
        label: "Tá»•ng thanh toÃ¡n",
        value: formatStoreCurrency(order.pricing.total),
        description: "Tá»•ng tiá»n gá»“m giÃ¡ sáº£n pháº©m, giáº£m trá»« vÃ  phÃ­ váº­n chuyá»ƒn.",
      },
      {
        label: "Tráº¡ng thÃ¡i Ä‘Æ¡n",
        value: getOrderStatusLabel(order),
        description: "Cáº­p nháº­t tiáº¿n Ä‘á»™ xá»­ lÃ½ giao hÃ ng cá»§a Ä‘Æ¡n.",
      },
      {
        label: "Tráº¡ng thÃ¡i thanh toÃ¡n",
        value: paymentStatusLabelMap[order.paymentStatus] ?? order.paymentStatus,
        description: "Theo dÃµi tÃ¬nh tráº¡ng thanh toÃ¡n hiá»‡n táº¡i.",
      },
    ];
  }, [order]);

  const onRetryMomoPayment = async () => {
    if (!order) {
      return;
    }

    setRetryingPayment(true);
    try {
      const initiated = await paymentService.createPayment({
        orderId: order.id,
        method: "momo",
        returnUrl: `${window.location.origin}/payment/momo-return`,
      });

      const gatewayResponse = initiated.gatewayResponse ?? {};
      const payUrl =
        (gatewayResponse.payUrl as string | undefined) ||
        (gatewayResponse.deeplink as string | undefined) ||
        (gatewayResponse.qrCodeUrl as string | undefined) ||
        null;

      if (!payUrl) {
        messageApi.warning("KhÃ´ng láº¥y Ä‘Æ°á»£c link thanh toÃ¡n MoMo, vui lÃ²ng thá»­ láº¡i.");
        return;
      }

      window.location.href = payUrl;
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "KhÃ´ng thá»ƒ táº¡o láº¡i giao dá»‹ch MoMo";
      messageApi.error(messageText);
    } finally {
      setRetryingPayment(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <StoreEmptyState
        kicker="Chi tiáº¿t Ä‘Æ¡n hÃ ng"
        title="Báº¡n cáº§n Ä‘Äƒng nháº­p Ä‘á»ƒ xem Ä‘Æ¡n hÃ ng"
        description="ÄÄƒng nháº­p Ä‘á»ƒ xem Ä‘áº§y Ä‘á»§ sáº£n pháº©m, tráº¡ng thÃ¡i giao hÃ ng vÃ  thanh toÃ¡n."
        action={
          <Link to="/login">
            <Button type="primary" className={storeButtonClassNames.primary}>
              ÄÄƒng nháº­p
            </Button>
          </Link>
        }
      />
    );
  }

  if (!loading && !order) {
    return (
      <StoreEmptyState
        kicker="Chi tiáº¿t Ä‘Æ¡n hÃ ng"
        title="KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n hÃ ng"
        description="ÄÆ¡n hÃ ng cÃ³ thá»ƒ Ä‘Ã£ bá»‹ xÃ³a hoáº·c báº¡n khÃ´ng cÃ³ quyá»n xem Ä‘Æ¡n nÃ y."
        action={
          <Link to="/orders">
            <Button type="primary" className={storeButtonClassNames.primary}>
              Quay láº¡i danh sÃ¡ch Ä‘Æ¡n
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <StorePageShell>
      {contextHolder}

      <StoreHeroSection
        kicker="Chi tiáº¿t Ä‘Æ¡n hÃ ng"
        title={order ? `ÄÆ¡n ${order.orderNumber}` : "Äang táº£i Ä‘Æ¡n hÃ ng..."}
        description={
          order
            ? `Äáº·t lÃºc ${formatDateTime(order.createdAt)}`
            : "Vui lÃ²ng chá» trong giÃ¢y lÃ¡t Ä‘á»ƒ táº£i dá»¯ liá»‡u Ä‘Æ¡n hÃ ng."
        }
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <Link to="/orders">
              <Button className={storeButtonClassNames.secondary}>Danh sÃ¡ch Ä‘Æ¡n</Button>
            </Link>
            {canRetryMomoPayment ? (
              <Button
                type="primary"
                className={storeButtonClassNames.primary}
                onClick={() => void onRetryMomoPayment()}
                loading={retryingPayment}
              >
                Thanh toÃ¡n láº¡i
              </Button>
            ) : null}
            <Button className={storeButtonClassNames.ghost} onClick={() => void loadOrderDetail()} loading={loading}>
              Táº£i láº¡i
            </Button>
          </div>
        }
      >
        {order ? <StoreMetricGrid items={overviewMetrics} /> : null}
      </StoreHeroSection>

      {order ? (
        <>
          <StorePanelSection kicker="Thanh toÃ¡n & váº­n chuyá»ƒn" title="ThÃ´ng tin Ä‘Æ¡n hÃ ng">
            <div className="grid gap-3 md:grid-cols-2">
              <article className="store-page-info-card">
                <span>NgÆ°á»i nháº­n</span>
                <strong>{order.customerName || "Äang cáº­p nháº­t"}</strong>
                <p>Sá»‘ Ä‘iá»‡n thoáº¡i: {order.customerPhone || "Äang cáº­p nháº­t"}</p>
              </article>
              <article className="store-page-info-card">
                <span>Email liÃªn há»‡</span>
                <strong>{order.customerEmail || "Äang cáº­p nháº­t"}</strong>
                <p>Äá»‹a chá»‰ giao: {formatShippingAddress(order.shippingAddress)}</p>
              </article>
              <article className="store-page-info-card">
                <span>Thanh toÃ¡n</span>
                <strong>{paymentMethodLabelMap[order.paymentMethod] ?? order.paymentMethod}</strong>
                <p className="m-0">
                  <StoreStatusPill
                    status={`payment-${order.paymentStatus}`}
                    label={paymentStatusLabelMap[order.paymentStatus] ?? order.paymentStatus}
                  />
                </p>
              </article>
              <article className="store-page-info-card">
                <span>Váº­n chuyá»ƒn</span>
                <strong>{order.shippingCarrier || "Äang cáº­p nháº­t"}</strong>
                <p>
                  PhÆ°Æ¡ng thá»©c:{" "}
                  {order.shippingMethod === "same_day"
                    ? "Há»a tá»‘c"
                    : order.shippingMethod === "express"
                      ? "Nhanh"
                      : "TiÃªu chuáº©n"}
                </p>
              </article>
            </div>

            {order.note ? (
              <div className="mt-4">
                <StoreInlineNote title="Ghi chÃº Ä‘Æ¡n hÃ ng" description={order.note} />
              </div>
            ) : null}
          </StorePanelSection>

          <StorePanelSection kicker="Sáº£n pháº©m" title="Nhá»¯ng gÃ¬ cÃ³ trong Ä‘Æ¡n hÃ ng cá»§a báº¡n">
            {order.items.length === 0 ? (
              <StoreInlineNote
                title="ÄÆ¡n hÃ ng chÆ°a cÃ³ sáº£n pháº©m"
                description="Náº¿u dá»¯ liá»‡u nÃ y khÃ´ng Ä‘Ãºng, báº¡n cÃ³ thá»ƒ táº£i láº¡i hoáº·c liÃªn há»‡ há»— trá»£."
              />
            ) : (
              <div className="space-y-3">
                {order.items.map((item, index) => {
                  const imageSource = resolveStoreImageUrl(item.image) || item.image;

                  return (
                    <article key={`${order.id}-${item.productId ?? index}`} className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                            {imageSource ? (
                              <img src={imageSource} alt={item.productName ?? "Sáº£n pháº©m"} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs font-black tracking-[0.2em] text-slate-500">
                                RIO
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="m-0 truncate text-base font-bold text-slate-900">{item.productName ?? "Sáº£n pháº©m"}</p>
                            <p className="m-0 mt-1 text-sm text-slate-600">
                              Biáº¿n thá»ƒ: {item.variantLabel || "Máº·c Ä‘á»‹nh"} â€¢ SKU: {item.variantSku || "Äang cáº­p nháº­t"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="m-0 text-sm text-slate-500">Sá»‘ lÆ°á»£ng: {item.quantity}</p>
                          <p className="m-0 mt-1 text-lg font-black tracking-[-0.03em] text-slate-900">
                            {formatStoreCurrency(item.totalPrice)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-200 pt-3 text-sm text-slate-600">
                        <span>ÄÆ¡n giÃ¡</span>
                        <strong className="text-slate-900">{formatStoreCurrency(item.unitPrice)}</strong>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </StorePanelSection>

          <StorePanelSection kicker="Lá»‹ch sá»­" title="DÃ²ng thá»i gian Ä‘Æ¡n hÃ ng">
            {order.timeline.length === 0 ? (
              <StoreInlineNote title="ChÆ°a cÃ³ lá»‹ch sá»­ cáº­p nháº­t" description="CÃ¡c thay Ä‘á»•i tráº¡ng thÃ¡i Ä‘Æ¡n sáº½ xuáº¥t hiá»‡n táº¡i Ä‘Ã¢y." />
            ) : (
              <div className="space-y-3">
                {order.timeline.map((event, index) => (
                  <article key={`${order.id}-timeline-${index}`} className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <StoreStatusPill
                        status={event.status}
                        label={orderStatusLabelMap[event.status || ""] ?? event.status ?? "Cáº­p nháº­t"}
                      />
                      <p className="m-0 text-sm text-slate-500">{formatDateTime(event.at)}</p>
                    </div>
                    <p className="m-0 mt-2 text-sm text-slate-700">{event.note || "Äang cáº­p nháº­t tráº¡ng thÃ¡i Ä‘Æ¡n hÃ ng."}</p>
                  </article>
                ))}
              </div>
            )}
          </StorePanelSection>
        </>
      ) : null}
    </StorePageShell>
  );
}


