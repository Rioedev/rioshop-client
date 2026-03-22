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
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
  returned: "Hoàn trả",
};

const paymentStatusLabelMap: Record<PaymentStatus, string> = {
  pending: "Chưa thanh toán",
  paid: "Đã thanh toán",
  failed: "Thanh toán lỗi",
  refunded: "Đã hoàn tiền",
};

const paymentMethodLabelMap: Record<PaymentMethod, string> = {
  momo: "Ví MoMo",
  vnpay: "VNPay",
  zalopay: "ZaloPay",
  cod: "Thanh toán khi nhận hàng",
  bank_transfer: "Chuyển khoản ngân hàng",
  card: "Thẻ ngân hàng",
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
    return "Đang cập nhật";
  }

  if (typeof shippingAddress === "string") {
    return shippingAddress.trim() || "Đang cập nhật";
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

  return "Đang cập nhật";
};

const formatDateTime = (value?: string) => {
  if (!value) {
    return "Đang cập nhật";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Đang cập nhật";
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
      const messageText = error instanceof Error ? error.message : "Không thể tải chi tiết đơn hàng";
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
      ["pending", "confirmed", "packing", "shipping"].includes(order.status)
    );
  }, [order]);

  const overviewMetrics = useMemo(() => {
    if (!order) {
      return [];
    }

    return [
      {
        label: "Tổng thanh toán",
        value: formatStoreCurrency(order.pricing.total),
        description: "Tổng tiền gồm giá sản phẩm, giảm trừ và phí vận chuyển.",
      },
      {
        label: "Trạng thái đơn",
        value: orderStatusLabelMap[order.status] ?? order.status,
        description: "Cập nhật tiến độ xử lý giao hàng của đơn.",
      },
      {
        label: "Trạng thái thanh toán",
        value: paymentStatusLabelMap[order.paymentStatus] ?? order.paymentStatus,
        description: "Theo dõi tình trạng thanh toán hiện tại.",
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
        messageApi.warning("Không lấy được link thanh toán MoMo, vui lòng thử lại.");
        return;
      }

      window.location.href = payUrl;
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Không thể tạo lại giao dịch MoMo";
      messageApi.error(messageText);
    } finally {
      setRetryingPayment(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <StoreEmptyState
        kicker="Chi tiết đơn hàng"
        title="Bạn cần đăng nhập để xem đơn hàng"
        description="Đăng nhập để xem đầy đủ sản phẩm, trạng thái giao hàng và thanh toán."
        action={
          <Link to="/login">
            <Button type="primary" className={storeButtonClassNames.primary}>
              Đăng nhập
            </Button>
          </Link>
        }
      />
    );
  }

  if (!loading && !order) {
    return (
      <StoreEmptyState
        kicker="Chi tiết đơn hàng"
        title="Không tìm thấy đơn hàng"
        description="Đơn hàng có thể đã bị xóa hoặc bạn không có quyền xem đơn này."
        action={
          <Link to="/orders">
            <Button type="primary" className={storeButtonClassNames.primary}>
              Quay lại danh sách đơn
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
        kicker="Chi tiết đơn hàng"
        title={order ? `Đơn ${order.orderNumber}` : "Đang tải đơn hàng..."}
        description={
          order
            ? `Đặt lúc ${formatDateTime(order.createdAt)}`
            : "Vui lòng chờ trong giây lát để tải dữ liệu đơn hàng."
        }
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <Link to="/orders">
              <Button className={storeButtonClassNames.secondary}>Danh sách đơn</Button>
            </Link>
            {canRetryMomoPayment ? (
              <Button
                type="primary"
                className={storeButtonClassNames.primary}
                onClick={() => void onRetryMomoPayment()}
                loading={retryingPayment}
              >
                Thanh toán lại
              </Button>
            ) : null}
            <Button className={storeButtonClassNames.ghost} onClick={() => void loadOrderDetail()} loading={loading}>
              Tải lại
            </Button>
          </div>
        }
      >
        {order ? <StoreMetricGrid items={overviewMetrics} /> : null}
      </StoreHeroSection>

      {order ? (
        <>
          <StorePanelSection kicker="Thanh toán & vận chuyển" title="Thông tin đơn hàng">
            <div className="grid gap-3 md:grid-cols-2">
              <article className="store-page-info-card">
                <span>Người nhận</span>
                <strong>{order.customerName || "Đang cập nhật"}</strong>
                <p>Số điện thoại: {order.customerPhone || "Đang cập nhật"}</p>
              </article>
              <article className="store-page-info-card">
                <span>Email liên hệ</span>
                <strong>{order.customerEmail || "Đang cập nhật"}</strong>
                <p>Địa chỉ giao: {formatShippingAddress(order.shippingAddress)}</p>
              </article>
              <article className="store-page-info-card">
                <span>Thanh toán</span>
                <strong>{paymentMethodLabelMap[order.paymentMethod] ?? order.paymentMethod}</strong>
                <p className="m-0">
                  <StoreStatusPill
                    status={`payment-${order.paymentStatus}`}
                    label={paymentStatusLabelMap[order.paymentStatus] ?? order.paymentStatus}
                  />
                </p>
              </article>
              <article className="store-page-info-card">
                <span>Vận chuyển</span>
                <strong>{order.shippingCarrier || "Đang cập nhật"}</strong>
                <p>
                  Phương thức:{" "}
                  {order.shippingMethod === "same_day"
                    ? "Hỏa tốc"
                    : order.shippingMethod === "express"
                      ? "Nhanh"
                      : "Tiêu chuẩn"}
                </p>
              </article>
            </div>

            {order.note ? (
              <div className="mt-4">
                <StoreInlineNote title="Ghi chú đơn hàng" description={order.note} />
              </div>
            ) : null}
          </StorePanelSection>

          <StorePanelSection kicker="Sản phẩm" title="Những gì có trong đơn hàng của bạn">
            {order.items.length === 0 ? (
              <StoreInlineNote
                title="Đơn hàng chưa có sản phẩm"
                description="Nếu dữ liệu này không đúng, bạn có thể tải lại hoặc liên hệ hỗ trợ."
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
                              <img src={imageSource} alt={item.productName ?? "Sản phẩm"} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs font-black tracking-[0.2em] text-slate-500">
                                RIO
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="m-0 truncate text-base font-bold text-slate-900">{item.productName ?? "Sản phẩm"}</p>
                            <p className="m-0 mt-1 text-sm text-slate-600">
                              Biến thể: {item.variantLabel || "Mặc định"} • SKU: {item.variantSku || "Đang cập nhật"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="m-0 text-sm text-slate-500">Số lượng: {item.quantity}</p>
                          <p className="m-0 mt-1 text-lg font-black tracking-[-0.03em] text-slate-900">
                            {formatStoreCurrency(item.totalPrice)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-200 pt-3 text-sm text-slate-600">
                        <span>Đơn giá</span>
                        <strong className="text-slate-900">{formatStoreCurrency(item.unitPrice)}</strong>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </StorePanelSection>

          <StorePanelSection kicker="Lịch sử" title="Dòng thời gian đơn hàng">
            {order.timeline.length === 0 ? (
              <StoreInlineNote title="Chưa có lịch sử cập nhật" description="Các thay đổi trạng thái đơn sẽ xuất hiện tại đây." />
            ) : (
              <div className="space-y-3">
                {order.timeline.map((event, index) => (
                  <article key={`${order.id}-timeline-${index}`} className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <StoreStatusPill
                        status={event.status}
                        label={orderStatusLabelMap[event.status || ""] ?? event.status ?? "Cập nhật"}
                      />
                      <p className="m-0 text-sm text-slate-500">{formatDateTime(event.at)}</p>
                    </div>
                    <p className="m-0 mt-2 text-sm text-slate-700">{event.note || "Đang cập nhật trạng thái đơn hàng."}</p>
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

