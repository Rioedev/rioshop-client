import { Alert, Button, Tag, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { orderService, type OrderRecord } from "../../../services/orderService";
import { useAuthStore } from "../../../stores/authStore";

const { Paragraph, Title } = Typography;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const statusColorMap: Record<string, string> = {
  pending: "gold",
  confirmed: "blue",
  packing: "cyan",
  shipping: "purple",
  delivered: "green",
  cancelled: "red",
  returned: "volcano",
};

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
      <section className="cart-empty-state">
        <Title level={3} className="m-0! mb-2!">
          Ban can dang nhap de xem don hang
        </Title>
        <Paragraph className="mb-4! text-slate-600!">Dang nhap de theo doi trang thai van chuyen va lich su mua sam.</Paragraph>
        <Link to="/login">
          <Button type="primary" className="rounded-full! bg-slate-900! px-6! shadow-none!">
            Dang nhap
          </Button>
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
      {contextHolder}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Title level={3} className="m-0!">
          Don hang cua toi
        </Title>
        <Button className="rounded-full!" onClick={() => void loadOrders(page)} loading={loading}>
          Tai lai
        </Button>
      </div>

      {orders.length === 0 && !loading ? (
        <Alert type="info" showIcon message="Ban chua co don hang nao." />
      ) : null}

      <div className="space-y-3">
        {orders.map((order) => {
          const canCancel = ["pending", "confirmed"].includes(order.status);
          const highlighted = highlightedOrderId && highlightedOrderId === order.id;

          return (
            <article
              key={order.id}
              className={`rounded-2xl border p-4 ${highlighted ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="m-0 text-xs uppercase tracking-[0.16em] text-slate-500">Ma don</p>
                  <h4 className="m-0 mt-1 text-lg font-black text-slate-900">{order.orderNumber}</h4>
                  <p className="m-0 mt-1 text-sm text-slate-500">
                    Dat luc:{" "}
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleString("vi-VN")
                      : "Dang cap nhat"}
                  </p>
                </div>
                <div className="text-right">
                  <Tag color={statusColorMap[order.status] ?? "default"} className="m-0! rounded-full! px-3! py-1!">
                    {statusLabelMap[order.status] ?? order.status}
                  </Tag>
                  <p className="m-0 mt-2 text-base font-extrabold text-slate-900">{formatCurrency(order.pricing.total)}</p>
                </div>
              </div>

              <div className="mt-3 grid gap-2">
                {order.items.slice(0, 3).map((item, index) => (
                  <div key={`${order.id}-${item.productId ?? index}`} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-slate-700">{item.productName ?? "San pham"}</span>
                    <span className="text-slate-500">x{item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {canCancel ? (
                  <Button danger className="rounded-full!" onClick={() => void onCancelOrder(order)}>
                    Huy don
                  </Button>
                ) : null}
                <Button className="rounded-full!">Theo doi van chuyen</Button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button
          disabled={page <= 1 || loading}
          className="rounded-full!"
          onClick={() => void loadOrders(page - 1)}
        >
          Truoc
        </Button>
        <span className="text-sm text-slate-500">
          Trang {page} / {Math.max(1, totalPages)}
        </span>
        <Button
          disabled={page >= totalPages || loading}
          className="rounded-full!"
          onClick={() => void loadOrders(page + 1)}
        >
          Sau
        </Button>
      </div>
    </section>
  );
}

