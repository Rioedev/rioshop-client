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
import { orderService, type OrderRecord } from "../../../services/orderService";
import { useAuthStore } from "../../../stores/authStore";

const statusLabelMap: Record<string, string> = {
  pending: "Cho xac nhan",
  confirmed: "Da xac nhan",
  packing: "Dang dong goi",
  shipping: "Dang giao",
  delivered: "Da giao",
  cancelled: "Da huy",
  returned: "Hoan tra",
};

export function StoreOrdersPage() {
  const location = useLocation();
  const [messageApi, contextHolder] = message.useMessage();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const highlightedOrderId = useMemo(
    () => (location.state as { orderId?: string } | null)?.orderId,
    [location.state],
  );

  const orderMetrics = useMemo(() => {
    const pendingCount = orders.filter((item) => ["pending", "confirmed", "packing", "shipping"].includes(item.status)).length;
    const deliveredCount = orders.filter((item) => item.status === "delivered").length;

    return [
      {
        label: "Tong don",
        value: orders.length,
        description: "So don hang dang hien thi trong tai khoan.",
      },
      {
        label: "Dang xu ly",
        value: pendingCount,
        description: "Bao gom don cho xac nhan, dong goi va dang giao.",
      },
      {
        label: "Hoan tat",
        value: deliveredCount,
        description: "Cac don da giao thanh cong.",
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
      const msg = error instanceof Error ? error.message : "Khong the tai danh sach don hang";
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
      await orderService.cancelOrder(order.id, "Khach hang yeu cau huy don");
      messageApi.success("Da huy don hang");
      await loadOrders(page);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Khong the huy don";
      messageApi.error(msg);
    }
  };

  if (!isAuthenticated) {
    return (
      <StoreEmptyState
        kicker="Don hang"
        title="Ban can dang nhap de xem don hang"
        description="Dang nhap de theo doi trang thai van chuyen, lich su mua sam va cap nhat moi nhat cho tung don."
        action={
          <Link to="/login">
            <Button type="primary" className={storeButtonClassNames.primary}>
              Dang nhap
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
        kicker="Order hub"
        title="Don hang cua toi"
        description="Kiem tra nhanh tien do giao hang, tong gia tri va hanh dong tiep theo cho moi don trong tai khoan cua ban."
        action={
          <Button className={storeButtonClassNames.secondary} onClick={() => void loadOrders(page)} loading={loading}>
            Tai lai
          </Button>
        }
      >
        <StoreMetricGrid items={orderMetrics} />
      </StoreHeroSection>

      <StorePanelSection kicker="Lich su mua sam" title="Danh sach don gan day">
        {orders.length === 0 && !loading ? (
          <StoreInlineNote
            title="Ban chua co don hang nao."
            description="San pham ban mua sau nay se xuat hien o day de theo doi trang thai va giao hang."
          />
        ) : null}

        <div className="space-y-3">
          {orders.map((order) => {
            const canCancel = ["pending", "confirmed"].includes(order.status);
            const highlighted = highlightedOrderId && highlightedOrderId === order.id;

            return (
              <article key={order.id} className={`store-order-card ${highlighted ? "is-highlighted" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="m-0 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Ma don</p>
                    <h3 className="m-0 mt-1 text-xl font-black tracking-[-0.04em] text-slate-900">{order.orderNumber}</h3>
                    <p className="m-0 mt-2 text-sm text-slate-500">
                      Dat luc {order.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : "Dang cap nhat"}
                    </p>
                  </div>

                  <div className="text-right">
                    <StoreStatusPill status={order.status} label={statusLabelMap[order.status] ?? order.status} />
                    <p className="m-0 mt-2 text-lg font-black tracking-[-0.04em] text-slate-900">
                      {formatStoreCurrency(order.pricing.total)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {order.items.slice(0, 3).map((item, index) => (
                    <div key={`${order.id}-${item.productId ?? index}`} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-slate-700">{item.productName ?? "San pham"}</span>
                      <span className="text-slate-500">x{item.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {canCancel ? (
                    <Button className={storeButtonClassNames.dangerCompact} onClick={() => void onCancelOrder(order)}>
                      Huy don
                    </Button>
                  ) : null}
                  <Button className={storeButtonClassNames.secondaryCompact}>Theo doi van chuyen</Button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button disabled={page <= 1 || loading} className={storeButtonClassNames.ghostCompact} onClick={() => void loadOrders(page - 1)}>
            Truoc
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
