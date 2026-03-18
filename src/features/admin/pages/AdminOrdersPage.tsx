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
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import type { OrderRecord, OrderStatus, PaymentStatus } from "../../../services/orderService";
import { useOrderStore } from "../../../stores/orderStore";

const { Paragraph, Title, Text } = Typography;

const STATUS_LABEL_MAP: Record<OrderStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  packing: "Đang đóng gói",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
  returned: "Đã hoàn",
};

const STATUS_COLOR_MAP: Record<OrderStatus, string> = {
  pending: "gold",
  confirmed: "blue",
  packing: "cyan",
  shipping: "processing",
  delivered: "green",
  cancelled: "red",
  returned: "purple",
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
  { value: "shipping", label: STATUS_LABEL_MAP.shipping },
  { value: "delivered", label: STATUS_LABEL_MAP.delivered },
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

const STATUS_UPDATE_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: STATUS_LABEL_MAP.pending },
  { value: "confirmed", label: STATUS_LABEL_MAP.confirmed },
  { value: "packing", label: STATUS_LABEL_MAP.packing },
  { value: "shipping", label: STATUS_LABEL_MAP.shipping },
  { value: "delivered", label: STATUS_LABEL_MAP.delivered },
  { value: "cancelled", label: STATUS_LABEL_MAP.cancelled },
  { value: "returned", label: STATUS_LABEL_MAP.returned },
];

const PAYMENT_STATUS_UPDATE_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "pending", label: PAYMENT_STATUS_LABEL_MAP.pending },
  { value: "paid", label: PAYMENT_STATUS_LABEL_MAP.paid },
  { value: "refunded", label: PAYMENT_STATUS_LABEL_MAP.refunded },
  { value: "failed", label: PAYMENT_STATUS_LABEL_MAP.failed },
];

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

export function AdminOrdersPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [searchText, setSearchText] = useState("");
  const [detailOrder, setDetailOrder] = useState<OrderRecord | null>(null);
  const [statusDraft, setStatusDraft] = useState<Record<string, OrderStatus>>({});
  const [paymentStatusDraft, setPaymentStatusDraft] = useState<Record<string, PaymentStatus>>({});

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

  useEffect(() => {
    const nextStatusDraft: Record<string, OrderStatus> = {};
    const nextPaymentDraft: Record<string, PaymentStatus> = {};

    orders.forEach((order) => {
      nextStatusDraft[order.id] = order.status;
      nextPaymentDraft[order.id] = order.paymentStatus;
    });

    setStatusDraft(nextStatusDraft);
    setPaymentStatusDraft(nextPaymentDraft);
  }, [orders]);

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

  const pendingCount = orders.filter((item) => item.status === "pending").length;
  const shippingCount = orders.filter((item) => item.status === "shipping").length;
  const completedCount = orders.filter((item) => item.status === "delivered").length;

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

  const handleUpdateOrder = async (order: OrderRecord) => {
    const nextStatus = statusDraft[order.id] ?? order.status;
    const nextPaymentStatus = paymentStatusDraft[order.id] ?? order.paymentStatus;

    if (nextStatus === order.status && nextPaymentStatus === order.paymentStatus) {
      messageApi.info("Đơn hàng chưa có thay đổi.");
      return;
    }

    try {
      await updateOrderStatus(order.id, {
        status: nextStatus,
        paymentStatus: nextPaymentStatus,
      });
      messageApi.success("Cập nhật đơn hàng thành công.");
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleCancelOrder = async (order: OrderRecord) => {
    try {
      await cancelOrder(order.id, "Hủy đơn từ trang quản trị");
      messageApi.success("Hủy đơn hàng thành công.");
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const columns: ColumnsType<OrderRecord> = [
    {
      title: "Mã đơn",
      dataIndex: "orderNumber",
      key: "orderNumber",
      width: 140,
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
        <Tag color={STATUS_COLOR_MAP[record.status]}>{STATUS_LABEL_MAP[record.status]}</Tag>
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
      width: 300,
      render: (_, record) => (
        <Space wrap>
          <Select<OrderStatus>
            size="small"
            value={statusDraft[record.id] ?? record.status}
            options={STATUS_UPDATE_OPTIONS}
            style={{ minWidth: 140 }}
            onChange={(value) => setStatusDraft((prev) => ({ ...prev, [record.id]: value }))}
            disabled={saving}
          />
          <Select<PaymentStatus>
            size="small"
            value={paymentStatusDraft[record.id] ?? record.paymentStatus}
            options={PAYMENT_STATUS_UPDATE_OPTIONS}
            style={{ minWidth: 150 }}
            onChange={(value) => setPaymentStatusDraft((prev) => ({ ...prev, [record.id]: value }))}
            disabled={saving}
          />
          <Button size="small" onClick={() => void handleUpdateOrder(record)} loading={saving}>
            Lưu
          </Button>
          <Button size="small" onClick={() => setDetailOrder(record)}>
            Chi tiết
          </Button>
          <Popconfirm
            title="Hủy đơn hàng"
            description="Chỉ nên hủy đơn khi khách yêu cầu hoặc đơn gặp sự cố."
            okText="Hủy đơn"
            cancelText="Bỏ qua"
            onConfirm={() => void handleCancelOrder(record)}
            disabled={saving || !["pending", "confirmed"].includes(record.status)}
          >
            <Button
              size="small"
              danger
              disabled={saving || !["pending", "confirmed"].includes(record.status)}
            >
              Hủy đơn
            </Button>
          </Popconfirm>
        </Space>
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
          Theo dõi đơn hàng theo thời gian thực, cập nhật trạng thái xử lý và thanh toán trực tiếp tại bảng.
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
          scroll={{ x: 1700 }}
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
        title={detailOrder ? `Chi tiết đơn ${detailOrder.orderNumber}` : "Chi tiết đơn hàng"}
        open={Boolean(detailOrder)}
        onCancel={() => setDetailOrder(null)}
        footer={null}
        width={900}
      >
        {detailOrder ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Card size="small" title="Thông tin khách hàng">
                <div><Text strong>Tên:</Text> {detailOrder.customerName}</div>
                <div><Text strong>Email:</Text> {detailOrder.customerEmail || "-"}</div>
                <div><Text strong>Số điện thoại:</Text> {detailOrder.customerPhone || "-"}</div>
              </Card>
              <Card size="small" title="Thông tin vận chuyển">
                <div><Text strong>Phương thức:</Text> {detailOrder.shippingMethod || "-"}</div>
                <div><Text strong>Đơn vị vận chuyển:</Text> {detailOrder.shippingCarrier || "-"}</div>
                <div>
                  <Text strong>Địa chỉ:</Text>
                  <pre className="mt-1 whitespace-pre-wrap break-words rounded bg-slate-50 p-2 text-xs">
                    {formatAddress(detailOrder.shippingAddress)}
                  </pre>
                </div>
              </Card>
            </div>

            <Card size="small" title="Sản phẩm trong đơn">
              <div className="space-y-3">
                {detailOrder.items.map((line, index) => (
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
              <div><Text strong>Tạm tính:</Text> {formatCurrency.format(detailOrder.pricing.subtotal)} VND</div>
              <div><Text strong>Giảm giá:</Text> {formatCurrency.format(detailOrder.pricing.discount)} VND</div>
              <div><Text strong>Phí vận chuyển:</Text> {formatCurrency.format(detailOrder.pricing.shippingFee)} VND</div>
              <div><Text strong>Tổng thanh toán:</Text> {formatCurrency.format(detailOrder.pricing.total)} VND</div>
            </Card>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
