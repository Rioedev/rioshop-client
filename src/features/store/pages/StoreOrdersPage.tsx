import { Button, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  StoreEmptyState,
  StoreInlineNote,
  StoreMetricGrid,
  StorePageShell,
  StorePanelSection,
  StoreHeroSection,
  StoreStatusPill,
  storeButtonClassNames,
} from "../components/StorePageChrome";
import { formatStoreCurrency } from "../utils/storeFormatting";
import { orderService, type OrderRecord, type PaymentStatus } from "../../../services/orderService";
import { paymentService } from "../../../services/paymentService";
import { useAuthStore } from "../../../stores/authStore";

const statusLabelMap: Record<string, string> = {
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

  return statusLabelMap[order.status] ?? order.status;
};

const paymentStatusLabelMap: Record<PaymentStatus, string> = {
  pending: "Chưa thanh toán",
  paid: "Đã thanh toán",
  failed: "Thanh toán lỗi",
  refunded: "Đã hoàn tiền",
};

export function StoreOrdersPage() {
  const location = useLocation();
  const [messageApi, contextHolder] = message.useMessage();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  const highlightedOrderId = useMemo(
    () => (location.state as { orderId?: string } | null)?.orderId,
    [location.state],
  );

  const orderMetrics = useMemo(() => {
    const pendingCount = orders.filter((item) =>
      ["pending", "confirmed", "packing", "ready_to_ship", "shipping"].includes(item.status),
    ).length;
    const completedCount = orders.filter((item) => item.status === "completed").length;

    return [
      {
        label: "Tổng đơn",
        value: orders.length,
        description: "Số đơn hàng đang hiển thị trong tài khoản.",
      },
      {
        label: "Đang xử lý",
        value: pendingCount,
        description: "Bao gồm đơn chờ xác nhận, đóng gói và đang giao.",
      },
      {
        label: "Hoàn tất",
        value: completedCount,
        description: "Các đơn đã giao thành công.",
      },
    ];
  }, [orders]);

  const loadOrders = async (nextPage = page) => {
    setLoading(true);
    try {
      const result = await orderService.getOrders({ page: nextPage, limit: 8 });
      setOrders(result.docs);
      setPage(result.page);
      setTotalPages(result.totalPages);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Không thể tải danh sách đơn hàng";
      messageApi.error(msg);
      setOrders([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setOrders([]);
      setLoading(false);
      return;
    }

    void loadOrders(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const onCancelOrder = async (order: OrderRecord) => {
    try {
      await orderService.cancelOrder(order.id, "Khách hàng yêu cầu hủy đơn");
      messageApi.success("Đã hủy đơn hàng");
      await loadOrders(page);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Không thể hủy đơn";
      messageApi.error(msg);
    }
  };

  const onRetryMomoPayment = async (order: OrderRecord) => {
    setPayingOrderId(order.id);
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
      const msg = error instanceof Error ? error.message : "Không thể tạo lại giao dịch MoMo";
      messageApi.error(msg);
    } finally {
      setPayingOrderId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <StoreEmptyState
        kicker="Đơn hàng"
        title="Bạn cần đăng nhập để xem đơn hàng"
        description="Đăng nhập để theo dõi trạng thái vận chuyển, lịch sử mua sắm và cập nhật mới nhất cho từng đơn."
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

  return (
    <StorePageShell>
      {contextHolder}

      <StoreHeroSection
        kicker="Trung tâm đơn hàng"
        title="Đơn hàng của tôi"
        description="Kiểm tra nhanh tiến độ giao hàng, tổng giá trị và hành động tiếp theo cho mỗi đơn trong tài khoản của bạn."
        action={
          <Button className={storeButtonClassNames.secondary} onClick={() => void loadOrders(page)} loading={loading}>
            Tải lại
          </Button>
        }
      >
        <StoreMetricGrid items={orderMetrics} />
      </StoreHeroSection>

      <StorePanelSection kicker="Lịch sử mua sắm" title="Danh sách đơn gần đây">
        {orders.length === 0 && !loading ? (
          <StoreInlineNote
            title="Bạn chưa có đơn hàng nào."
            description="Sản phẩm bạn mua sau này sẽ xuất hiện ở đây để theo dõi trạng thái và giao hàng."
          />
        ) : null}

        <div className="space-y-3">
          {orders.map((order) => {
            const canCancel = ["pending", "confirmed"].includes(order.status);
            const canRetryMomoPayment =
              order.paymentMethod === "momo" &&
              ["pending", "failed"].includes(order.paymentStatus) &&
              ["pending", "confirmed", "packing", "ready_to_ship", "shipping"].includes(order.status);
            const highlighted = highlightedOrderId && highlightedOrderId === order.id;

            return (
              <article key={order.id} className={`store-order-card ${highlighted ? "is-highlighted" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="m-0 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Mã đơn</p>
                    <h3 className="m-0 mt-1 text-xl font-black tracking-[-0.04em] text-slate-900">{order.orderNumber}</h3>
                    <p className="m-0 mt-2 text-sm text-slate-500">
                      Đặt lúc {order.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : "Đang cập nhật"}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <StoreStatusPill status={order.status} label={getOrderStatusLabel(order)} />
                      <StoreStatusPill
                        status={`payment-${order.paymentStatus}`}
                        label={paymentStatusLabelMap[order.paymentStatus] ?? order.paymentStatus}
                      />
                    </div>
                    <p className="m-0 mt-2 text-lg font-black tracking-[-0.04em] text-slate-900">
                      {formatStoreCurrency(order.pricing.total)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {order.items.slice(0, 3).map((item, index) => (
                    <div key={`${order.id}-${item.productId ?? index}`} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-slate-700">{item.productName ?? "Sản phẩm"}</span>
                      <span className="text-slate-500">x{item.quantity}</span>
                    </div>
                  ))}
                  {order.items.length > 3 ? (
                    <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      +{order.items.length - 3} sản phẩm khác
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/orders/${order.id}`}>
                    <Button className={storeButtonClassNames.secondaryCompact}>Xem chi tiết</Button>
                  </Link>
                  {canRetryMomoPayment ? (
                    <Button
                      type="primary"
                      loading={payingOrderId === order.id}
                      className={storeButtonClassNames.primaryCompact}
                      onClick={() => void onRetryMomoPayment(order)}
                    >
                      Thanh toán lại
                    </Button>
                  ) : null}
                  {canCancel ? (
                    <Button className={storeButtonClassNames.dangerCompact} onClick={() => void onCancelOrder(order)}>
                      Hủy đơn
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button disabled={page <= 1 || loading} className={storeButtonClassNames.ghostCompact} onClick={() => void loadOrders(page - 1)}>
            Trước
          </Button>
          <span className="text-sm text-slate-500">
            Trang {page} / {Math.max(1, totalPages)}
          </span>
          <Button disabled={page >= totalPages || loading} className={storeButtonClassNames.ghostCompact} onClick={() => void loadOrders(page + 1)}>
            Sau
          </Button>
        </div>
      </StorePanelSection>
    </StorePageShell>
  );
}

