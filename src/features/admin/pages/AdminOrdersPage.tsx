import { AxiosError } from "axios";
import {
  Button,
  Card,
  Col,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OrderRecord, OrderStatus, PaymentStatus } from "../../../services/orderService";
import { subscribeAdminRealtime } from "../../../services/socketClient";
import { useOrderStore } from "../../../stores/orderStore";

const { Paragraph, Title, Text } = Typography;

const STATUS_LABEL_MAP: Record<OrderStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  packing: "Đang đóng gói",
  ready_to_ship: "Chờ lấy hàng",
  shipping: "Đang giao",
  delivered: "Đã giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  returned: "Đã hoàn",
};

const STATUS_COLOR_MAP: Record<OrderStatus, string> = {
  pending: "gold",
  confirmed: "blue",
  packing: "cyan",
  ready_to_ship: "geekblue",
  shipping: "processing",
  delivered: "green",
  completed: "success",
  cancelled: "red",
  returned: "purple",
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

  return STATUS_LABEL_MAP[order.status] ?? order.status;
};

const PAYMENT_STATUS_LABEL_MAP: Record<PaymentStatus, string> = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  refunded: "Đã hoàn tiền",
  failed: "Thất bại",
};

const PAYMENT_STATUS_COLOR_MAP: Record<PaymentStatus, string> = {
  pending: "gold",
  paid: "green",
  refunded: "purple",
  failed: "red",
};

const STATUS_FILTER_OPTIONS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "Tất cả trạng thái đơn" },
  { value: "pending", label: STATUS_LABEL_MAP.pending },
  { value: "confirmed", label: STATUS_LABEL_MAP.confirmed },
  { value: "packing", label: STATUS_LABEL_MAP.packing },
  { value: "ready_to_ship", label: STATUS_LABEL_MAP.ready_to_ship },
  { value: "shipping", label: STATUS_LABEL_MAP.shipping },
  { value: "delivered", label: STATUS_LABEL_MAP.delivered },
  { value: "completed", label: STATUS_LABEL_MAP.completed },
  { value: "cancelled", label: STATUS_LABEL_MAP.cancelled },
  { value: "returned", label: STATUS_LABEL_MAP.returned },
];

const PAYMENT_STATUS_FILTER_OPTIONS: { value: PaymentStatus | "all"; label: string }[] = [
  { value: "all", label: "Tất cả trạng thái thanh toán" },
  { value: "pending", label: PAYMENT_STATUS_LABEL_MAP.pending },
  { value: "paid", label: PAYMENT_STATUS_LABEL_MAP.paid },
  { value: "refunded", label: PAYMENT_STATUS_LABEL_MAP.refunded },
  { value: "failed", label: PAYMENT_STATUS_LABEL_MAP.failed },
];

const PAYMENT_STATUS_UPDATE_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "pending", label: PAYMENT_STATUS_LABEL_MAP.pending },
  { value: "paid", label: PAYMENT_STATUS_LABEL_MAP.paid },
  { value: "refunded", label: PAYMENT_STATUS_LABEL_MAP.refunded },
  { value: "failed", label: PAYMENT_STATUS_LABEL_MAP.failed },
];

const STATUS_TRANSITION_MAP: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "packing", "ready_to_ship", "shipping", "cancelled"],
  confirmed: ["packing", "ready_to_ship", "shipping", "cancelled"],
  packing: ["ready_to_ship", "shipping", "cancelled"],
  ready_to_ship: ["shipping", "cancelled"],
  shipping: ["delivered", "returned", "cancelled"],
  delivered: ["completed", "returned"],
  completed: [],
  cancelled: [],
  returned: [],
};

const formatCurrency = new Intl.NumberFormat("vi-VN");

const getErrorMessage = (error: unknown) => {
  if (error instanceof AxiosError) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Yêu cầu thất bại";
};

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const formatAddress = (value: unknown) => {
  if (!value) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
};

const isCancellableOrder = (status: OrderStatus) => ["pending", "confirmed"].includes(status);

const getStatusUpdateOptions = (currentStatus: OrderStatus): { value: OrderStatus; label: string }[] => {
  const nextStatuses = STATUS_TRANSITION_MAP[currentStatus] || [];
  const uniqueStatuses = [currentStatus, ...nextStatuses].filter(
    (status, index, source) => source.indexOf(status) === index,
  );

  return uniqueStatuses.map((status) => ({
    value: status,
    label: status === currentStatus ? `${STATUS_LABEL_MAP[status]} (giữ nguyên)` : STATUS_LABEL_MAP[status],
  }));
};

export function AdminOrdersPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [searchText, setSearchText] = useState("");
  const [managingOrder, setManagingOrder] = useState<OrderRecord | null>(null);
  const [manageStatus, setManageStatus] = useState<OrderStatus>("pending");
  const [managePaymentStatus, setManagePaymentStatus] = useState<PaymentStatus>("pending");
  const [manageNote, setManageNote] = useState("");

  const orders = useOrderStore((state) => state.orders);
  const loading = useOrderStore((state) => state.loading);
  const saving = useOrderStore((state) => state.saving);
  const page = useOrderStore((state) => state.page);
  const pageSize = useOrderStore((state) => state.pageSize);
  const total = useOrderStore((state) => state.total);
  const statusFilter = useOrderStore((state) => state.statusFilter);
  const paymentStatusFilter = useOrderStore((state) => state.paymentStatusFilter);
  const loadOrders = useOrderStore((state) => state.loadOrders);
  const setStatusFilter = useOrderStore((state) => state.setStatusFilter);
  const setPaymentStatusFilter = useOrderStore((state) => state.setPaymentStatusFilter);
  const updateOrderStatus = useOrderStore((state) => state.updateOrderStatus);
  const cancelOrder = useOrderStore((state) => state.cancelOrder);
  const realtimeRefreshTimerRef = useRef<number | null>(null);

  const refreshCurrentOrderPage = useCallback(() => {
    void loadOrders({
      page,
      pageSize,
      statusFilter,
      paymentStatusFilter,
    }).catch((error) => {
      messageApi.error(getErrorMessage(error));
    });
  }, [loadOrders, messageApi, page, pageSize, paymentStatusFilter, statusFilter]);

  useEffect(() => {
    void loadOrders({
      page: 1,
      pageSize: 10,
      statusFilter: "all",
      paymentStatusFilter: "all",
    }).catch((error) => {
      messageApi.error(getErrorMessage(error));
    });
  }, [loadOrders, messageApi]);

  const scheduleRealtimeRefresh = useCallback(() => {
    if (realtimeRefreshTimerRef.current) {
      window.clearTimeout(realtimeRefreshTimerRef.current);
    }

    realtimeRefreshTimerRef.current = window.setTimeout(() => {
      refreshCurrentOrderPage();
    }, 600);
  }, [refreshCurrentOrderPage]);

  useEffect(
    () => () => {
      if (realtimeRefreshTimerRef.current) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const unsubscribe = subscribeAdminRealtime({
      onOrderUpdated: () => {
        scheduleRealtimeRefresh();
      },
    });

    return () => {
      unsubscribe();
    };
  }, [scheduleRealtimeRefresh]);

  const filteredOrders = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return orders;

    return orders.filter((order) =>
      order.orderNumber.toLowerCase().includes(keyword) ||
      order.customerName.toLowerCase().includes(keyword) ||
      (order.customerEmail ?? "").toLowerCase().includes(keyword) ||
      (order.customerPhone ?? "").toLowerCase().includes(keyword),
    );
  }, [orders, searchText]);

  const pendingCount = orders.filter((item) =>
    ["pending", "confirmed", "packing", "ready_to_ship", "shipping"].includes(item.status),
  ).length;
  const shippingCount = orders.filter((item) => item.status === "shipping").length;
  const completedCount = orders.filter((item) => item.status === "completed").length;

  const canChangeOrderStatus = managingOrder
    ? STATUS_TRANSITION_MAP[managingOrder.status].length > 0
    : false;

  const manageStatusOptions = useMemo(
    () => getStatusUpdateOptions(managingOrder?.status || "pending"),
    [managingOrder?.status],
  );

  const hasManageChanges = useMemo(() => {
    if (!managingOrder) {
      return false;
    }

    return (
      manageStatus !== managingOrder.status ||
      managePaymentStatus !== managingOrder.paymentStatus ||
      Boolean(manageNote.trim())
    );
  }, [manageNote, managePaymentStatus, manageStatus, managingOrder]);

  const openManageModal = (order: OrderRecord) => {
    setManagingOrder(order);
    setManageStatus(order.status);
    setManagePaymentStatus(order.paymentStatus);
    setManageNote("");
  };

  const closeManageModal = () => {
    if (saving) {
      return;
    }
    setManagingOrder(null);
    setManageStatus("pending");
    setManagePaymentStatus("pending");
    setManageNote("");
  };

  const handleChangeStatusFilter = async (value: OrderStatus | "all") => {
    setStatusFilter(value);
    try {
      await loadOrders({
        page: 1,
        pageSize,
        statusFilter: value,
        paymentStatusFilter,
      });
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleChangePaymentFilter = async (value: PaymentStatus | "all") => {
    setPaymentStatusFilter(value);
    try {
      await loadOrders({
        page: 1,
        pageSize,
        statusFilter,
        paymentStatusFilter: value,
      });
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleUpdateOrder = async () => {
    if (!managingOrder) {
      return;
    }

    if (!hasManageChanges) {
      messageApi.info("Đơn hàng chưa có thay đổi.");
      return;
    }

    try {
      await updateOrderStatus(managingOrder.id, {
        status: manageStatus,
        paymentStatus: managePaymentStatus,
        note: manageNote.trim() || undefined,
      });
      messageApi.success("Cập nhật đơn hàng thành công.");
      closeManageModal();
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleCancelOrder = async () => {
    if (!managingOrder) {
      return;
    }

    try {
      await cancelOrder(managingOrder.id, manageNote.trim() || "Hủy đơn từ trang quản trị");
      messageApi.success("Hủy đơn hàng thành công.");
      closeManageModal();
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const columns: ColumnsType<OrderRecord> = [
    {
      title: "Mã đơn",
      dataIndex: "orderNumber",
      key: "orderNumber",
      width: 150,
    },
    {
      title: "Khách hàng",
      key: "customer",
      width: 220,
      render: (_, record) => (
        <div>
          <div>{record.customerName}</div>
          <Text type="secondary">{record.customerPhone || record.customerEmail || "-"}</Text>
        </div>
      ),
    },
    {
      title: "Sản phẩm",
      key: "items",
      width: 100,
      render: (_, record) => record.items.length,
    },
    {
      title: "Tổng tiền",
      key: "total",
      width: 170,
      render: (_, record) => `${formatCurrency.format(record.pricing.total)} ${record.pricing.currency}`,
    },
    {
      title: "Thanh toán",
      key: "payment",
      width: 170,
      render: (_, record) => (
        <Tag color={PAYMENT_STATUS_COLOR_MAP[record.paymentStatus]}>
          {PAYMENT_STATUS_LABEL_MAP[record.paymentStatus]}
        </Tag>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 150,
      render: (_, record) => (
        <Tag color={STATUS_COLOR_MAP[record.status]}>{getOrderStatusLabel(record)}</Tag>
      ),
    },
    {
      title: "Tạo lúc",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (value?: string) => formatDateTime(value),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Button size="small" onClick={() => openManageModal(record)} disabled={saving}>
          Quản lý
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {contextHolder}

      <div>
        <Title level={3} className="mb-1! mt-0!">
          Quản lý đơn hàng
        </Title>
        <Paragraph className="mb-0!" type="secondary">
          Theo dõi đơn hàng theo thời gian thực, mở hộp quản lý để cập nhật trạng thái xử lý và thanh toán gọn hơn.
        </Paragraph>
      </div>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}>
          <Card>
            <Text type="secondary">Chờ xác nhận (trang hiện tại)</Text>
            <Title level={3} className="mb-0! mt-1!">
              {pendingCount}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Text type="secondary">Đang giao (trang hiện tại)</Text>
            <Title level={3} className="mb-0! mt-1!">
              {shippingCount}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Text type="secondary">Đã giao (trang hiện tại)</Text>
            <Title level={3} className="mb-0! mt-1! text-emerald-600!">
              {completedCount}
            </Title>
          </Card>
        </Col>
      </Row>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            allowClear
            placeholder="Tìm theo mã đơn, tên khách, email, số điện thoại"
            className="min-w-[280px] max-w-[420px]"
          />
          <Select<OrderStatus | "all">
            value={statusFilter}
            options={STATUS_FILTER_OPTIONS}
            onChange={(value) => void handleChangeStatusFilter(value)}
            className="min-w-[230px]"
          />
          <Select<PaymentStatus | "all">
            value={paymentStatusFilter}
            options={PAYMENT_STATUS_FILTER_OPTIONS}
            onChange={(value) => void handleChangePaymentFilter(value)}
            className="min-w-[260px]"
          />
        </div>

        <Table<OrderRecord>
          rowKey="id"
          columns={columns}
          dataSource={filteredOrders}
          loading={loading || saving}
          scroll={{ x: 1300 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (value) => `Tổng ${value} đơn hàng`,
          }}
          onChange={(pagination: TablePaginationConfig) => {
            const nextPage = pagination.current ?? page;
            const nextPageSize = pagination.pageSize ?? pageSize;
            void loadOrders({
              page: nextPage,
              pageSize: nextPageSize,
              statusFilter,
              paymentStatusFilter,
            }).catch((error) => {
              messageApi.error(getErrorMessage(error));
            });
          }}
        />
      </Card>

      <Modal
        title={managingOrder ? `Quản lý đơn ${managingOrder.orderNumber}` : "Quản lý đơn hàng"}
        open={Boolean(managingOrder)}
        onCancel={closeManageModal}
        width={960}
        footer={[
          <Button key="close" onClick={closeManageModal} disabled={saving}>
            Đóng
          </Button>,
          <Popconfirm
            key="cancel"
            title="Hủy đơn hàng"
            description="Chỉ nên hủy đơn khi khách yêu cầu hoặc đơn gặp sự cố."
            okText="Hủy đơn"
            cancelText="Bỏ qua"
            onConfirm={() => void handleCancelOrder()}
            disabled={!managingOrder || !isCancellableOrder(managingOrder.status) || saving}
          >
            <Button
              danger
              disabled={!managingOrder || !isCancellableOrder(managingOrder.status) || saving}
            >
              Hủy đơn
            </Button>
          </Popconfirm>,
          <Button
            key="save"
            type="primary"
            onClick={() => void handleUpdateOrder()}
            loading={saving}
            disabled={!managingOrder || !hasManageChanges}
          >
            Lưu cập nhật
          </Button>,
        ]}
      >
        {managingOrder ? (
          <div className="space-y-4">
            <Card size="small" title="Điều phối đơn hàng">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <Text type="secondary">Trạng thái hiện tại</Text>
                    <div className="mt-1">
                      <Tag color={STATUS_COLOR_MAP[managingOrder.status]}>
                        {getOrderStatusLabel(managingOrder)}
                      </Tag>
                    </div>
                  </div>
                  <Select<OrderStatus>
                    value={manageStatus}
                    options={manageStatusOptions}
                    onChange={(value) => setManageStatus(value)}
                    disabled={saving || !canChangeOrderStatus}
                  />
                  {!canChangeOrderStatus ? (
                    <Text type="secondary">Đơn ở trạng thái cuối, không thể chuyển tiếp.</Text>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <div>
                    <Text type="secondary">Thanh toán hiện tại</Text>
                    <div className="mt-1">
                      <Tag color={PAYMENT_STATUS_COLOR_MAP[managingOrder.paymentStatus]}>
                        {PAYMENT_STATUS_LABEL_MAP[managingOrder.paymentStatus]}
                      </Tag>
                    </div>
                  </div>
                  <Select<PaymentStatus>
                    value={managePaymentStatus}
                    options={PAYMENT_STATUS_UPDATE_OPTIONS}
                    onChange={(value) => setManagePaymentStatus(value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <Input.TextArea
                className="mt-3"
                value={manageNote}
                onChange={(event) => setManageNote(event.target.value)}
                placeholder="Ghi chú quản trị (tùy chọn)"
                autoSize={{ minRows: 2, maxRows: 4 }}
                maxLength={500}
                disabled={saving}
              />
            </Card>

            <div className="grid gap-3 md:grid-cols-2">
              <Card size="small" title="Thông tin khách hàng">
                <div><Text strong>Tên:</Text> {managingOrder.customerName}</div>
                <div><Text strong>Email:</Text> {managingOrder.customerEmail || "-"}</div>
                <div><Text strong>Số điện thoại:</Text> {managingOrder.customerPhone || "-"}</div>
              </Card>
              <Card size="small" title="Thông tin vận chuyển">
                <div><Text strong>Phương thức:</Text> {managingOrder.shippingMethod || "-"}</div>
                <div><Text strong>Đơn vị vận chuyển:</Text> {managingOrder.shippingCarrier || "-"}</div>
                <div>
                  <Text strong>Địa chỉ:</Text>
                  <pre className="mt-1 whitespace-pre-wrap break-words rounded bg-slate-50 p-2 text-xs">
                    {formatAddress(managingOrder.shippingAddress)}
                  </pre>
                </div>
              </Card>
            </div>

            <Card size="small" title="Sản phẩm trong đơn">
              <div className="space-y-3">
                {managingOrder.items.map((line, index) => (
                  <div key={`${line.variantSku}-${index}`} className="rounded border border-slate-200 p-3">
                    <div><Text strong>{line.productName || "Sản phẩm"}</Text></div>
                    <div>SKU biến thể: {line.variantSku || "-"}</div>
                    <div>Phân loại: {line.variantLabel || "-"}</div>
                    <div>Số lượng: {line.quantity}</div>
                    <div>Đơn giá: {formatCurrency.format(line.unitPrice)} VND</div>
                    <div>Thành tiền: {formatCurrency.format(line.totalPrice)} VND</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card size="small" title="Tổng hợp thanh toán">
              <div><Text strong>Tạm tính:</Text> {formatCurrency.format(managingOrder.pricing.subtotal)} VND</div>
              <div><Text strong>Giảm giá:</Text> {formatCurrency.format(managingOrder.pricing.discount)} VND</div>
              <div><Text strong>Phí vận chuyển:</Text> {formatCurrency.format(managingOrder.pricing.shippingFee)} VND</div>
              <div><Text strong>Tổng thanh toán:</Text> {formatCurrency.format(managingOrder.pricing.total)} VND</div>
            </Card>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}


