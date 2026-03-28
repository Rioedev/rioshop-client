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
  pending: "Chá» thanh toÃ¡n",
  paid: "ÄÃ£ thanh toÃ¡n",
  refunded: "ÄÃ£ hoÃ n tiá»n",
  failed: "Tháº¥t báº¡i",
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
  { value: "all", label: "Táº¥t cáº£ tráº¡ng thÃ¡i thanh toÃ¡n" },
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
  return "YÃªu cáº§u tháº¥t báº¡i";
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
    label: status === currentStatus ? `${STATUS_LABEL_MAP[status]} (giá»¯ nguyÃªn)` : STATUS_LABEL_MAP[status],
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
      messageApi.info("ÄÆ¡n hÃ ng chÆ°a cÃ³ thay Ä‘á»•i.");
      return;
    }

    try {
      await updateOrderStatus(managingOrder.id, {
        status: manageStatus,
        paymentStatus: managePaymentStatus,
        note: manageNote.trim() || undefined,
      });
      messageApi.success("Cáº­p nháº­t Ä‘Æ¡n hÃ ng thÃ nh cÃ´ng.");
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
      await cancelOrder(managingOrder.id, manageNote.trim() || "Há»§y Ä‘Æ¡n tá»« trang quáº£n trá»‹");
      messageApi.success("Há»§y Ä‘Æ¡n hÃ ng thÃ nh cÃ´ng.");
      closeManageModal();
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const columns: ColumnsType<OrderRecord> = [
    {
      title: "MÃ£ Ä‘Æ¡n",
      dataIndex: "orderNumber",
      key: "orderNumber",
      width: 150,
    },
    {
      title: "KhÃ¡ch hÃ ng",
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
      title: "Sáº£n pháº©m",
      key: "items",
      width: 100,
      render: (_, record) => record.items.length,
    },
    {
      title: "Tá»•ng tiá»n",
      key: "total",
      width: 170,
      render: (_, record) => `${formatCurrency.format(record.pricing.total)} ${record.pricing.currency}`,
    },
    {
      title: "Thanh toÃ¡n",
      key: "payment",
      width: 170,
      render: (_, record) => (
        <Tag color={PAYMENT_STATUS_COLOR_MAP[record.paymentStatus]}>
          {PAYMENT_STATUS_LABEL_MAP[record.paymentStatus]}
        </Tag>
      ),
    },
    {
      title: "Tráº¡ng thÃ¡i",
      key: "status",
      width: 150,
      render: (_, record) => (
        <Tag color={STATUS_COLOR_MAP[record.status]}>{getOrderStatusLabel(record)}</Tag>
      ),
    },
    {
      title: "Táº¡o lÃºc",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (value?: string) => formatDateTime(value),
    },
    {
      title: "Thao tÃ¡c",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Button size="small" onClick={() => openManageModal(record)} disabled={saving}>
          Quáº£n lÃ½
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {contextHolder}

      <div>
        <Title level={3} className="mb-1! mt-0!">
          Quáº£n lÃ½ Ä‘Æ¡n hÃ ng
        </Title>
        <Paragraph className="mb-0!" type="secondary">
          Theo dÃµi Ä‘Æ¡n hÃ ng theo thá»i gian thá»±c, má»Ÿ há»™p quáº£n lÃ½ Ä‘á»ƒ cáº­p nháº­t tráº¡ng thÃ¡i xá»­ lÃ½ vÃ  thanh toÃ¡n gá»n hÆ¡n.
        </Paragraph>
      </div>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}>
          <Card>
            <Text type="secondary">Chá» xÃ¡c nháº­n (trang hiá»‡n táº¡i)</Text>
            <Title level={3} className="mb-0! mt-1!">
              {pendingCount}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Text type="secondary">Äang giao (trang hiá»‡n táº¡i)</Text>
            <Title level={3} className="mb-0! mt-1!">
              {shippingCount}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Text type="secondary">ÄÃ£ giao (trang hiá»‡n táº¡i)</Text>
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
            placeholder="TÃ¬m theo mÃ£ Ä‘Æ¡n, tÃªn khÃ¡ch, email, sá»‘ Ä‘iá»‡n thoáº¡i"
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
            showTotal: (value) => `Tá»•ng ${value} Ä‘Æ¡n hÃ ng`,
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
        title={managingOrder ? `Quáº£n lÃ½ Ä‘Æ¡n ${managingOrder.orderNumber}` : "Quáº£n lÃ½ Ä‘Æ¡n hÃ ng"}
        open={Boolean(managingOrder)}
        onCancel={closeManageModal}
        width={960}
        footer={[
          <Button key="close" onClick={closeManageModal} disabled={saving}>
            ÄÃ³ng
          </Button>,
          <Popconfirm
            key="cancel"
            title="Há»§y Ä‘Æ¡n hÃ ng"
            description="Chá»‰ nÃªn há»§y Ä‘Æ¡n khi khÃ¡ch yÃªu cáº§u hoáº·c Ä‘Æ¡n gáº·p sá»± cá»‘."
            okText="Há»§y Ä‘Æ¡n"
            cancelText="Bá» qua"
            onConfirm={() => void handleCancelOrder()}
            disabled={!managingOrder || !isCancellableOrder(managingOrder.status) || saving}
          >
            <Button
              danger
              disabled={!managingOrder || !isCancellableOrder(managingOrder.status) || saving}
            >
              Há»§y Ä‘Æ¡n
            </Button>
          </Popconfirm>,
          <Button
            key="save"
            type="primary"
            onClick={() => void handleUpdateOrder()}
            loading={saving}
            disabled={!managingOrder || !hasManageChanges}
          >
            LÆ°u cáº­p nháº­t
          </Button>,
        ]}
      >
        {managingOrder ? (
          <div className="space-y-4">
            <Card size="small" title="Äiá»u phá»‘i Ä‘Æ¡n hÃ ng">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <Text type="secondary">Tráº¡ng thÃ¡i hiá»‡n táº¡i</Text>
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
                    <Text type="secondary">ÄÆ¡n á»Ÿ tráº¡ng thÃ¡i cuá»‘i, khÃ´ng thá»ƒ chuyá»ƒn tiáº¿p.</Text>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <div>
                    <Text type="secondary">Thanh toÃ¡n hiá»‡n táº¡i</Text>
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
                placeholder="Ghi chÃº quáº£n trá»‹ (tÃ¹y chá»n)"
                autoSize={{ minRows: 2, maxRows: 4 }}
                maxLength={500}
                disabled={saving}
              />
            </Card>

            <div className="grid gap-3 md:grid-cols-2">
              <Card size="small" title="ThÃ´ng tin khÃ¡ch hÃ ng">
                <div><Text strong>TÃªn:</Text> {managingOrder.customerName}</div>
                <div><Text strong>Email:</Text> {managingOrder.customerEmail || "-"}</div>
                <div><Text strong>Sá»‘ Ä‘iá»‡n thoáº¡i:</Text> {managingOrder.customerPhone || "-"}</div>
              </Card>
              <Card size="small" title="ThÃ´ng tin váº­n chuyá»ƒn">
                <div><Text strong>PhÆ°Æ¡ng thá»©c:</Text> {managingOrder.shippingMethod || "-"}</div>
                <div><Text strong>ÄÆ¡n vá»‹ váº­n chuyá»ƒn:</Text> {managingOrder.shippingCarrier || "-"}</div>
                <div>
                  <Text strong>Äá»‹a chá»‰:</Text>
                  <pre className="mt-1 whitespace-pre-wrap break-words rounded bg-slate-50 p-2 text-xs">
                    {formatAddress(managingOrder.shippingAddress)}
                  </pre>
                </div>
              </Card>
            </div>

            <Card size="small" title="Sáº£n pháº©m trong Ä‘Æ¡n">
              <div className="space-y-3">
                {managingOrder.items.map((line, index) => (
                  <div key={`${line.variantSku}-${index}`} className="rounded border border-slate-200 p-3">
                    <div><Text strong>{line.productName || "Sáº£n pháº©m"}</Text></div>
                    <div>SKU biáº¿n thá»ƒ: {line.variantSku || "-"}</div>
                    <div>PhÃ¢n loáº¡i: {line.variantLabel || "-"}</div>
                    <div>Sá»‘ lÆ°á»£ng: {line.quantity}</div>
                    <div>ÄÆ¡n giÃ¡: {formatCurrency.format(line.unitPrice)} VND</div>
                    <div>ThÃ nh tiá»n: {formatCurrency.format(line.totalPrice)} VND</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card size="small" title="Tá»•ng há»£p thanh toÃ¡n">
              <div><Text strong>Táº¡m tÃ­nh:</Text> {formatCurrency.format(managingOrder.pricing.subtotal)} VND</div>
              <div><Text strong>Giáº£m giÃ¡:</Text> {formatCurrency.format(managingOrder.pricing.discount)} VND</div>
              <div><Text strong>PhÃ­ váº­n chuyá»ƒn:</Text> {formatCurrency.format(managingOrder.pricing.shippingFee)} VND</div>
              <div><Text strong>Tá»•ng thanh toÃ¡n:</Text> {formatCurrency.format(managingOrder.pricing.total)} VND</div>
            </Card>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}


