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
import { getErrorMessage } from "../../../utils/errorMessage";

const { Paragraph, Title, Text } = Typography;

const STATUS_LABEL_MAP: Record<OrderStatus, string> = {
  pending: "Ch? xác nh?n",
  confirmed: "Ðã xác nh?n",
  packing: "Ðang dóng gói",
  ready_to_ship: "Ch? l?y hàng",
  shipping: "Ðang giao",
  delivered: "Ðã giao",
  completed: "Hoàn thành",
  cancelled: "Ðã h?y",
  returned: "Ðã hoàn",
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
    return "Ch? thanh toán";
  }

  return STATUS_LABEL_MAP[order.status] ?? order.status;
};

const PAYMENT_STATUS_LABEL_MAP: Record<PaymentStatus, string> = {
  pending: "Ch? thanh toán",
  paid: "Ðã thanh toán",
  refunded: "Ðã hoàn ti?n",
  failed: "Th?t b?i",
};

const PAYMENT_STATUS_COLOR_MAP: Record<PaymentStatus, string> = {
  pending: "gold",
  paid: "green",
  refunded: "purple",
  failed: "red",
};

const STATUS_FILTER_OPTIONS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "T?t c? tr?ng thái don" },
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
  { value: "all", label: "T?t c? tr?ng thái thanh toán" },
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
    label: status === currentStatus ? `${STATUS_LABEL_MAP[status]} (gi? nguyên)` : STATUS_LABEL_MAP[status],
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
      messageApi.info("Ðon hàng chua có thay d?i.");
      return;
    }

    try {
      await updateOrderStatus(managingOrder.id, {
        status: manageStatus,
        paymentStatus: managePaymentStatus,
        note: manageNote.trim() || undefined,
      });
      messageApi.success("C?p nh?t don hàng thành công.");
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
      await cancelOrder(managingOrder.id, manageNote.trim() || "H?y don t? trang qu?n tr?");
      messageApi.success("H?y don hàng thành công.");
      closeManageModal();
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const columns: ColumnsType<OrderRecord> = [
    {
      title: "Mã don",
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
      title: "S?n ph?m",
      key: "items",
      width: 100,
      render: (_, record) => record.items.length,
    },
    {
      title: "T?ng ti?n",
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
      title: "Tr?ng thái",
      key: "status",
      width: 150,
      render: (_, record) => (
        <Tag color={STATUS_COLOR_MAP[record.status]}>{getOrderStatusLabel(record)}</Tag>
      ),
    },
    {
      title: "T?o lúc",
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
          Qu?n lý
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {contextHolder}

      <div>
        <Title level={3} className="mb-1! mt-0!">
          Qu?n lý don hàng
        </Title>
        <Paragraph className="mb-0!" type="secondary">
          Theo dõi don hàng theo th?i gian th?c, m? h?p qu?n lý d? c?p nh?t tr?ng thái x? lý và thanh toán g?n hon.
        </Paragraph>
      </div>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}>
          <Card>
            <Text type="secondary">Ch? xác nh?n (trang hi?n t?i)</Text>
            <Title level={3} className="mb-0! mt-1!">
              {pendingCount}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Text type="secondary">Ðang giao (trang hi?n t?i)</Text>
            <Title level={3} className="mb-0! mt-1!">
              {shippingCount}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Text type="secondary">Ðã giao (trang hi?n t?i)</Text>
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
            placeholder="Tìm theo mã don, tên khách, email, s? di?n tho?i"
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
            showTotal: (value) => `T?ng ${value} don hàng`,
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
        title={managingOrder ? `Qu?n lý don ${managingOrder.orderNumber}` : "Qu?n lý don hàng"}
        open={Boolean(managingOrder)}
        onCancel={closeManageModal}
        width={960}
        footer={[
          <Button key="close" onClick={closeManageModal} disabled={saving}>
            Ðóng
          </Button>,
          <Popconfirm
            key="cancel"
            title="H?y don hàng"
            description="Ch? nên h?y don khi khách yêu c?u ho?c don g?p s? c?."
            okText="H?y don"
            cancelText="B? qua"
            onConfirm={() => void handleCancelOrder()}
            disabled={!managingOrder || !isCancellableOrder(managingOrder.status) || saving}
          >
            <Button
              danger
              disabled={!managingOrder || !isCancellableOrder(managingOrder.status) || saving}
            >
              H?y don
            </Button>
          </Popconfirm>,
          <Button
            key="save"
            type="primary"
            onClick={() => void handleUpdateOrder()}
            loading={saving}
            disabled={!managingOrder || !hasManageChanges}
          >
            Luu c?p nh?t
          </Button>,
        ]}
      >
        {managingOrder ? (
          <div className="space-y-4">
            <Card size="small" title="Ði?u ph?i don hàng">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <Text type="secondary">Tr?ng thái hi?n t?i</Text>
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
                    <Text type="secondary">Ðon ? tr?ng thái cu?i, không th? chuy?n ti?p.</Text>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <div>
                    <Text type="secondary">Thanh toán hi?n t?i</Text>
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
                placeholder="Ghi chú qu?n tr? (tùy ch?n)"
                autoSize={{ minRows: 2, maxRows: 4 }}
                maxLength={500}
                disabled={saving}
              />
            </Card>

            <div className="grid gap-3 md:grid-cols-2">
              <Card size="small" title="Thông tin khách hàng">
                <div><Text strong>Tên:</Text> {managingOrder.customerName}</div>
                <div><Text strong>Email:</Text> {managingOrder.customerEmail || "-"}</div>
                <div><Text strong>S? di?n tho?i:</Text> {managingOrder.customerPhone || "-"}</div>
              </Card>
              <Card size="small" title="Thông tin v?n chuy?n">
                <div><Text strong>Phuong th?c:</Text> {managingOrder.shippingMethod || "-"}</div>
                <div><Text strong>Ðon v? v?n chuy?n:</Text> {managingOrder.shippingCarrier || "-"}</div>
                <div>
                  <Text strong>Ð?a ch?:</Text>
                  <pre className="mt-1 whitespace-pre-wrap break-words rounded bg-slate-50 p-2 text-xs">
                    {formatAddress(managingOrder.shippingAddress)}
                  </pre>
                </div>
              </Card>
            </div>

            <Card size="small" title="S?n ph?m trong don">
              <div className="space-y-3">
                {managingOrder.items.map((line, index) => (
                  <div key={`${line.variantSku}-${index}`} className="rounded border border-slate-200 p-3">
                    <div><Text strong>{line.productName || "S?n ph?m"}</Text></div>
                    <div>SKU bi?n th?: {line.variantSku || "-"}</div>
                    <div>Phân lo?i: {line.variantLabel || "-"}</div>
                    <div>S? lu?ng: {line.quantity}</div>
                    <div>Ðon giá: {formatCurrency.format(line.unitPrice)} VND</div>
                    <div>Thành ti?n: {formatCurrency.format(line.totalPrice)} VND</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card size="small" title="T?ng h?p thanh toán">
              <div><Text strong>T?m tính:</Text> {formatCurrency.format(managingOrder.pricing.subtotal)} VND</div>
              <div><Text strong>Gi?m giá:</Text> {formatCurrency.format(managingOrder.pricing.discount)} VND</div>
              <div><Text strong>Phí v?n chuy?n:</Text> {formatCurrency.format(managingOrder.pricing.shippingFee)} VND</div>
              <div><Text strong>T?ng thanh toán:</Text> {formatCurrency.format(managingOrder.pricing.total)} VND</div>
            </Card>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}




