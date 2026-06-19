import {
  Button,
  Card,
  Checkbox,
  Col,
  Input,
  InputNumber,
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
import { useLocation, useNavigate } from "react-router-dom";
import { DownloadOutlined, PrinterOutlined } from "@ant-design/icons";
import {
  orderService,
  type OrderRecord,
  type OrderStatus,
  type PaymentStatus,
  type ReturnDisposition,
  type ReturnRequestStatus,
} from "../../../services/orderService";
import { subscribeAdminRealtime } from "../../../services/socketClient";
import { useOrderStore } from "../../../stores/orderStore";
import { downloadCsv, type CsvColumn } from "../../../utils/csvExport";
import { getErrorMessage } from "../../../utils/errorMessage";

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

const RETURN_REQUEST_TYPE_LABEL_MAP = {
  return: "Đổi hàng",
  exchange: "Đổi hàng",
} as const;

const RETURN_REQUEST_STATUS_LABEL_MAP: Record<ReturnRequestStatus, string> = {
  pending: "Chờ xử lý",
  approved: "Đã chấp nhận",
  rejected: "Đã từ chối",
  completed: "Hoàn tất",
};

const RETURN_REQUEST_STATUS_COLOR_MAP: Record<ReturnRequestStatus, string> = {
  pending: "gold",
  approved: "blue",
  rejected: "red",
  completed: "green",
};

type ExchangeLineDraft = {
  key: string;
  selected: boolean;
  productId: string;
  originalVariantSku: string;
  quantity: number;
  replacementVariantSku: string;
  returnDisposition?: ReturnDisposition;
};

const buildExchangeLineDrafts = (order: OrderRecord): ExchangeLineDraft[] => {
  const requestedItems = order.returnRequest?.requestedItems ?? [];
  const requestedMap = new Map(
    requestedItems.map((item) => [`${item.productId}::${item.originalVariantSku}`, item]),
  );
  const hasRequestedItems = requestedItems.length > 0;

  return order.items.map((line, index) => {
    const requested = requestedMap.get(`${line.productId || ""}::${line.variantSku || ""}`);
    const remaining = Math.max(1, Number(line.quantity || 0) - Number(line.returnedQty || 0));

    return {
      key: `${line.productId || "product"}::${line.variantSku || "variant"}::${index}`,
      // Khi khách đã chọn sẵn món cần đổi thì chỉ tick đúng các món đó;
      // ngược lại giữ hành vi cũ (đơn 1 món thì tự chọn).
      selected: hasRequestedItems ? Boolean(requested) : order.items.length === 1,
      productId: line.productId || "",
      originalVariantSku: line.variantSku || "",
      quantity: requested
        ? Math.min(remaining, Math.max(1, Number(requested.quantity || 1)))
        : remaining,
      replacementVariantSku: requested?.replacementVariantSku || "",
      returnDisposition: undefined,
    };
  });
};

const getReturnRequestBadgeLabel = (order: Pick<OrderRecord, "returnRequest">) => {
  if (!order.returnRequest) {
    return "";
  }

  const typeLabel = RETURN_REQUEST_TYPE_LABEL_MAP[order.returnRequest.type] || "Đổi hàng";
  const statusLabel =
    RETURN_REQUEST_STATUS_LABEL_MAP[order.returnRequest.status] || order.returnRequest.status;
  return `${typeLabel} • ${statusLabel}`;
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
  pending: ["confirmed", "packing", "ready_to_ship", "cancelled"],
  confirmed: ["packing", "ready_to_ship", "cancelled"],
  packing: ["ready_to_ship", "cancelled"],
  ready_to_ship: ["shipping", "cancelled"],
  shipping: ["delivered", "returned", "cancelled"],
  delivered: ["completed", "returned"],
  completed: ["returned"],
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

const pickFirstText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
      continue;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
};

const formatShippingAddress = (value: unknown) => {
  if (!value) return "-";

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || "-";
  }

  if (typeof value === "object") {
    const address = value as Record<string, unknown>;
    const line1 = pickFirstText(address.line1, address.addressLine1, address.street, address.address);
    const line2 = pickFirstText(address.line2, address.addressLine2, address.wardName, address.ward);
    const district = pickFirstText(address.districtName, address.district);
    const province = pickFirstText(address.provinceName, address.province, address.city);
    const country = pickFirstText(address.country);

    const parts = [line1, line2, district, province, country].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(", ");
    }

    return JSON.stringify(value);
  }

  return String(value);
};

const isCancellableOrder = (status: OrderStatus) => ["pending", "confirmed"].includes(status);

const isGhnCarrier = (carrier?: string) => (carrier || "").toString().trim().toUpperCase() === "GHN";

const getStatusUpdateOptions = (
  currentStatus: OrderStatus,
  shippingCarrier?: string,
): { value: OrderStatus; label: string }[] => {
  const nextStatuses = STATUS_TRANSITION_MAP[currentStatus] || [];
  let filteredNextStatuses = [...nextStatuses];

  if (isGhnCarrier(shippingCarrier) && currentStatus === "ready_to_ship") {
    filteredNextStatuses = filteredNextStatuses.filter((status) => status !== "shipping");
  }

  const uniqueStatuses = [currentStatus, ...filteredNextStatuses].filter(
    (status, index, source) => source.indexOf(status) === index,
  );

  return uniqueStatuses.map((status) => ({
    value: status,
    label: status === currentStatus ? `${STATUS_LABEL_MAP[status]} (giữ nguyên)` : STATUS_LABEL_MAP[status],
  }));
};

const escapeInvoiceHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const renderInvoiceHtml = (order: OrderRecord, options: { embedded?: boolean } = {}) => {
  const printedAt = new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
  const itemRows = order.items
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>
            <strong>${escapeInvoiceHtml(item.productName || "Sản phẩm")}</strong>
            <div class="muted">SKU: ${escapeInvoiceHtml(item.variantSku || "-")}</div>
            <div class="muted">Phân loại: ${escapeInvoiceHtml(item.variantLabel || "-")}</div>
          </td>
          <td class="right">${formatCurrency.format(item.unitPrice)} VND</td>
          <td class="right">${formatCurrency.format(item.quantity)}</td>
          <td class="right">${formatCurrency.format(item.totalPrice)} VND</td>
        </tr>
      `,
    )
    .join("");

  const actionBar = options.embedded
    ? ""
    : `
  <div class="actions">
    <button onclick="window.print()">In / Lưu PDF</button>
    <button onclick="window.close()">Đóng</button>
  </div>`;

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Hoa don ${escapeInvoiceHtml(order.orderNumber)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f8fafc; color: #0f172a; font-family: Arial, sans-serif; }
    .invoice { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 18mm; }
    .top { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #0f172a; padding-bottom: 18px; }
    .brand { font-size: 28px; font-weight: 800; letter-spacing: .08em; }
    .title { text-align: right; }
    .title h1 { margin: 0; font-size: 24px; }
    .muted { color: #64748b; font-size: 12px; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 22px 0; }
    .box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
    .box h2 { margin: 0 0 10px; font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: #475569; }
    .line { margin: 6px 0; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; vertical-align: top; font-size: 13px; }
    th { background: #f1f5f9; text-align: left; color: #334155; }
    .right { text-align: right; white-space: nowrap; }
    .summary { width: 320px; margin-left: auto; margin-top: 20px; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .summary-row.total { border-bottom: 0; font-size: 18px; font-weight: 800; }
    .footer { margin-top: 34px; display: flex; justify-content: space-between; gap: 24px; color: #475569; font-size: 12px; }
    .actions { position: sticky; top: 0; display: flex; justify-content: center; gap: 10px; padding: 12px; background: #0f172a; }
    .actions button { border: 0; border-radius: 999px; padding: 9px 16px; background: #fff; color: #0f172a; font-weight: 700; cursor: pointer; }
    @media print {
      body { background: #fff; }
      .actions { display: none; }
      .invoice { width: auto; min-height: auto; margin: 0; padding: 0; }
      @page { size: A4; margin: 14mm; }
    }
  </style>
</head>
<body>
  ${actionBar}
  <main class="invoice">
    <section class="top">
      <div>
        <div class="brand">RIOSHOP</div>
        <div class="muted">Hóa đơn bán hàng</div>
        <div class="muted">In lúc: ${escapeInvoiceHtml(printedAt)}</div>
      </div>
      <div class="title">
        <h1>HÓA ĐƠN</h1>
        <div class="line"><strong>Mã đơn:</strong> ${escapeInvoiceHtml(order.orderNumber)}</div>
        <div class="line"><strong>Ngày tạo:</strong> ${escapeInvoiceHtml(formatDateTime(order.createdAt))}</div>
        <div class="line"><strong>Trạng thái:</strong> ${escapeInvoiceHtml(getOrderStatusLabel(order))}</div>
      </div>
    </section>

    <section class="grid">
      <div class="box">
        <h2>Khách hàng</h2>
        <div class="line"><strong>Họ tên:</strong> ${escapeInvoiceHtml(order.customerName || "-")}</div>
        <div class="line"><strong>Điện thoại:</strong> ${escapeInvoiceHtml(order.customerPhone || "-")}</div>
        <div class="line"><strong>Email:</strong> ${escapeInvoiceHtml(order.customerEmail || "-")}</div>
      </div>
      <div class="box">
        <h2>Giao hàng & thanh toán</h2>
        <div class="line"><strong>Thanh toán:</strong> ${escapeInvoiceHtml(order.paymentMethod?.toUpperCase() || "-")} - ${escapeInvoiceHtml(PAYMENT_STATUS_LABEL_MAP[order.paymentStatus] || order.paymentStatus)}</div>
        <div class="line"><strong>Vận chuyển:</strong> ${escapeInvoiceHtml(order.shippingCarrier || order.shippingMethod || "-")}</div>
        <div class="line"><strong>Địa chỉ:</strong> ${escapeInvoiceHtml(formatShippingAddress(order.shippingAddress))}</div>
      </div>
    </section>

    <table>
      <thead>
        <tr>
          <th style="width: 42px;">#</th>
          <th>Sản phẩm</th>
          <th class="right">Đơn giá</th>
          <th class="right">SL</th>
          <th class="right">Thành tiền</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <section class="summary">
      <div class="summary-row"><span>Tạm tính</span><strong>${formatCurrency.format(order.pricing.subtotal)} VND</strong></div>
      <div class="summary-row"><span>Giảm giá</span><strong>-${formatCurrency.format(order.pricing.discount)} VND</strong></div>
      <div class="summary-row"><span>Phí vận chuyển</span><strong>${formatCurrency.format(order.pricing.shippingFee)} VND</strong></div>
      <div class="summary-row total"><span>Tổng thanh toán</span><span>${formatCurrency.format(order.pricing.total)} VND</span></div>
    </section>

    <section class="footer">
      <div>Ghi chú: ${escapeInvoiceHtml(order.note || "-")}</div>
      <div>RioShop cảm ơn quý khách.</div>
    </section>
  </main>
</body>
</html>`;
};

export function AdminOrdersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [searchText, setSearchText] = useState("");
  const [managingOrder, setManagingOrder] = useState<OrderRecord | null>(null);
  const [manageStatus, setManageStatus] = useState<OrderStatus>("pending");
  const [managePaymentStatus, setManagePaymentStatus] = useState<PaymentStatus>("pending");
  const [manageNote, setManageNote] = useState("");
  const [syncingShipment, setSyncingShipment] = useState(false);
  const [syncingActiveGhn, setSyncingActiveGhn] = useState(false);
  const [exportingOrders, setExportingOrders] = useState(false);
  const [updatingReturnRequest, setUpdatingReturnRequest] = useState(false);
  const [exchangeLineDrafts, setExchangeLineDrafts] = useState<ExchangeLineDraft[]>([]);

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
  const getOrderById = useOrderStore((state) => state.getOrderById);
  const updateOrderStatus = useOrderStore((state) => state.updateOrderStatus);
  const updateReturnRequestStatus = useOrderStore((state) => state.updateReturnRequestStatus);
  const cancelOrder = useOrderStore((state) => state.cancelOrder);
  const syncShipmentFromGhn = useOrderStore((state) => state.syncShipmentFromGhn);
  const syncActiveGhnShipments = useOrderStore((state) => state.syncActiveGhnShipments);
  const realtimeRefreshTimerRef = useRef<number | null>(null);
  const handledFocusOrderIdRef = useRef("");

  const focusOrderId = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return (query.get("focusOrderId") || "").trim();
  }, [location.search]);

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

  const applyOrderSearch = useCallback(
    (sourceOrders: OrderRecord[]) => {
      const keyword = searchText.trim().toLowerCase();
      if (!keyword) {
        return sourceOrders;
      }

      return sourceOrders.filter((order) =>
        order.orderNumber.toLowerCase().includes(keyword) ||
        order.customerName.toLowerCase().includes(keyword) ||
        (order.customerEmail ?? "").toLowerCase().includes(keyword) ||
        (order.customerPhone ?? "").toLowerCase().includes(keyword),
      );
    },
    [searchText],
  );

  const filteredOrders = useMemo(() => applyOrderSearch(orders), [applyOrderSearch, orders]);

  const pendingCount = orders.filter((item) =>
    ["pending", "confirmed", "packing", "ready_to_ship", "shipping"].includes(item.status),
  ).length;
  const shippingCount = orders.filter((item) => item.status === "shipping").length;
  const completedCount = orders.filter((item) => item.status === "completed").length;

  const canChangeOrderStatus = managingOrder
    ? STATUS_TRANSITION_MAP[managingOrder.status].length > 0
    : false;

  const manageStatusOptions = useMemo(
    () => {
      const options = getStatusUpdateOptions(
        managingOrder?.status || "pending",
        managingOrder?.shippingCarrier,
      );
      return managingOrder?.returnRequest?.type === "exchange"
        ? options.filter((option) => option.value !== "returned")
        : options;
    },
    [managingOrder?.returnRequest?.type, managingOrder?.shippingCarrier, managingOrder?.status],
  );

  const activeReturnRequest = managingOrder?.returnRequest;
  const canApproveReturnRequest = activeReturnRequest?.status === "pending";
  const canRejectReturnRequest =
    activeReturnRequest?.status === "pending" || activeReturnRequest?.status === "approved";
  const canCompleteExchangeRequest =
    activeReturnRequest?.status === "approved" && activeReturnRequest?.type === "exchange";

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

  const modalBusy = saving || updatingReturnRequest;

  const openManageModal = (order: OrderRecord) => {
    setManagingOrder(order);
    setManageStatus(order.status);
    setManagePaymentStatus(order.paymentStatus);
    setManageNote("");
    setExchangeLineDrafts(buildExchangeLineDrafts(order));
  };

  const clearFocusOrderIdFromUrl = useCallback(() => {
    const query = new URLSearchParams(location.search);
    if (!query.has("focusOrderId")) {
      return;
    }

    query.delete("focusOrderId");
    const nextSearch = query.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : "",
      },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate]);

  const closeManageModal = () => {
    if (modalBusy) {
      return;
    }
    setManagingOrder(null);
    setManageStatus("pending");
    setManagePaymentStatus("pending");
    setManageNote("");
    setExchangeLineDrafts([]);
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

  useEffect(() => {
    if (!focusOrderId) {
      return;
    }

    if (handledFocusOrderIdRef.current === focusOrderId) {
      return;
    }

    handledFocusOrderIdRef.current = focusOrderId;

    void (async () => {
      try {
        const focusedOrder = await getOrderById(focusOrderId);
        setSearchText(focusedOrder.orderNumber || "");
        openManageModal(focusedOrder);
      } catch (error) {
        messageApi.error(getErrorMessage(error, "Không thể mở đơn hàng từ thông báo"));
      } finally {
        clearFocusOrderIdFromUrl();
      }
    })();
  }, [clearFocusOrderIdFromUrl, focusOrderId, getOrderById, messageApi]);

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

  const updateExchangeLineDraft = (key: string, patch: Partial<ExchangeLineDraft>) => {
    setExchangeLineDrafts((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  };

  const handleUpdateReturnRequestStatus = async (nextStatus: ReturnRequestStatus) => {
    if (!managingOrder?.returnRequest) {
      messageApi.warning("Đơn hàng này chưa có yêu cầu đổi hàng.");
      return;
    }

    const selectedExchangeLines = exchangeLineDrafts.filter((line) => line.selected);
    if (nextStatus === "completed") {
      if (selectedExchangeLines.length === 0) {
        messageApi.warning("Hãy chọn ít nhất một sản phẩm cần đổi.");
        return;
      }

      const invalidLine = selectedExchangeLines.find(
        (line) =>
          !line.productId ||
          !line.originalVariantSku ||
          !line.replacementVariantSku ||
          !line.returnDisposition ||
          !Number.isInteger(line.quantity) ||
          line.quantity <= 0,
      );
      if (invalidLine) {
        messageApi.warning("Hãy chọn size mới, số lượng và cách xử lý hàng trả về cho mọi sản phẩm đổi.");
        return;
      }
    }

    setUpdatingReturnRequest(true);
    try {
      const updatedOrder = await updateReturnRequestStatus(managingOrder.id, {
        status: nextStatus,
        note: manageNote.trim() || undefined,
        exchangeItems:
          nextStatus === "completed"
            ? selectedExchangeLines.map((line) => ({
                productId: line.productId,
                originalVariantSku: line.originalVariantSku,
                replacementVariantSku: line.replacementVariantSku,
                quantity: line.quantity,
                returnDisposition: line.returnDisposition as ReturnDisposition,
              }))
            : undefined,
      });
      setManagingOrder(updatedOrder);
      setManageStatus(updatedOrder.status);
      setManagePaymentStatus(updatedOrder.paymentStatus);
      setManageNote("");
      setExchangeLineDrafts(buildExchangeLineDrafts(updatedOrder));
      refreshCurrentOrderPage();
      const replacementOrderNumber = updatedOrder.returnRequest?.replacementOrderNumber;
      if (nextStatus === "completed" && replacementOrderNumber) {
        messageApi.success(`Đã hoàn tất đổi hàng và tạo đơn mới ${replacementOrderNumber}.`);
      } else {
        messageApi.success("Đã cập nhật yêu cầu đổi hàng.");
      }
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    } finally {
      setUpdatingReturnRequest(false);
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

  const handleSyncCurrentShipment = async () => {
    if (!managingOrder?.shipmentId) {
      messageApi.warning("Đơn chưa có shipment để đồng bộ.");
      return;
    }

    setSyncingShipment(true);
    try {
      const result = await syncShipmentFromGhn(managingOrder.shipmentId);
      if (result.updated) {
        messageApi.success("Đồng bộ GHN thành công.");
      } else {
        messageApi.info(`GHN chưa có thay đổi mới (${result.reason || "status_unchanged"}).`);
      }

      const refreshedOrder = await getOrderById(managingOrder.id);
      setManagingOrder(refreshedOrder);
      refreshCurrentOrderPage();
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không thể đồng bộ GHN cho đơn này"));
    } finally {
      setSyncingShipment(false);
    }
  };

  const handleSyncActiveGhn = async () => {
    setSyncingActiveGhn(true);
    try {
      const result = await syncActiveGhnShipments(30);
      messageApi.success(
        `Đồng bộ GHN: ${result.updated} cập nhật, ${result.unchanged} không đổi, ${result.failed} lỗi.`,
      );
      refreshCurrentOrderPage();
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không thể đồng bộ danh sách GHN"));
    } finally {
      setSyncingActiveGhn(false);
    }
  };

  const handleExportOrders = async () => {
    setExportingOrders(true);
    try {
      const firstPage = await orderService.getOrders({
        page: 1,
        limit: 100,
        status: statusFilter,
        paymentStatus: paymentStatusFilter,
      });
      const allOrders = [...firstPage.docs];

      for (let nextPage = 2; nextPage <= firstPage.totalPages; nextPage += 1) {
        const result = await orderService.getOrders({
          page: nextPage,
          limit: 100,
          status: statusFilter,
          paymentStatus: paymentStatusFilter,
        });
        allOrders.push(...result.docs);
      }

      const exportRows = applyOrderSearch(allOrders);
      if (exportRows.length === 0) {
        messageApi.info("Không có đơn hàng phù hợp để xuất.");
        return;
      }

      const columns: CsvColumn<OrderRecord>[] = [
        { header: "Mã đơn", value: (order) => order.orderNumber },
        { header: "Khách hàng", value: (order) => order.customerName },
        { header: "Email", value: (order) => order.customerEmail || "" },
        { header: "Số điện thoại", value: (order) => order.customerPhone || "" },
        { header: "Trạng thái đơn", value: (order) => getOrderStatusLabel(order) },
        {
          header: "Trạng thái thanh toán",
          value: (order) => PAYMENT_STATUS_LABEL_MAP[order.paymentStatus] || order.paymentStatus,
        },
        { header: "Phương thức thanh toán", value: (order) => order.paymentMethod },
        { header: "Phương thức giao", value: (order) => order.shippingMethod || "" },
        { header: "Đơn vị giao", value: (order) => order.shippingCarrier || "" },
        { header: "Số sản phẩm", value: (order) => order.items.reduce((sum, item) => sum + item.quantity, 0) },
        { header: "Tạm tính", value: (order) => order.pricing.subtotal },
        { header: "Giảm giá", value: (order) => order.pricing.discount },
        { header: "Phí vận chuyển", value: (order) => order.pricing.shippingFee },
        { header: "Tổng tiền", value: (order) => order.pricing.total },
        { header: "Tiền tệ", value: (order) => order.pricing.currency },
        {
          header: "Sản phẩm",
          value: (order) =>
            order.items
              .map((item) => `${item.productName || item.productId || "Sản phẩm"} x${item.quantity}`)
              .join("; "),
        },
        { header: "Địa chỉ giao", value: (order) => formatShippingAddress(order.shippingAddress) },
        { header: "Ghi chú", value: (order) => order.note || "" },
        { header: "Tạo lúc", value: (order) => formatDateTime(order.createdAt) },
        { header: "Cập nhật lúc", value: (order) => formatDateTime(order.updatedAt) },
      ];

      downloadCsv(
        `orders-export-${new Date().toISOString().slice(0, 10)}.csv`,
        columns,
        exportRows,
      );
      messageApi.success(`Đã xuất ${exportRows.length} đơn hàng.`);
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không thể xuất đơn hàng."));
    } finally {
      setExportingOrders(false);
    }
  };

  const handlePrintInvoice = (order: OrderRecord) => {
    const existingFrame = document.getElementById("admin-order-invoice-print-frame");
    existingFrame?.remove();

    const frame = document.createElement("iframe");
    frame.id = "admin-order-invoice-print-frame";
    frame.title = `Hóa đơn ${order.orderNumber}`;
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    frame.style.visibility = "hidden";
    document.body.appendChild(frame);

    const frameDocument = frame.contentDocument || frame.contentWindow?.document;
    if (!frameDocument || !frame.contentWindow) {
      frame.remove();
      messageApi.error("Không thể tạo khung in hóa đơn. Vui lòng thử lại.");
      return;
    }

    let hasPrinted = false;
    const cleanupFrame = () => {
      window.setTimeout(() => {
        frame.remove();
      }, 500);
    };
    const printFrame = () => {
      if (hasPrinted) {
        return;
      }

      hasPrinted = true;
      frame.contentWindow?.focus();
      window.setTimeout(() => {
        frame.contentWindow?.print();
      }, 100);
    };

    frame.contentWindow.onafterprint = cleanupFrame;
    frame.onload = printFrame;
    frameDocument.open();
    frameDocument.write(renderInvoiceHtml(order, { embedded: true }));
    frameDocument.close();

    window.setTimeout(printFrame, 250);
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
      title: "Đổi hàng",
      key: "returnRequest",
      width: 220,
      render: (_, record) =>
        record.returnRequest ? (
          <Tag color={RETURN_REQUEST_STATUS_COLOR_MAP[record.returnRequest.status]}>
            {getReturnRequestBadgeLabel(record)}
          </Tag>
        ) : (
          <Text type="secondary">-</Text>
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
      width: 210,
      render: (_, record) => (
        <div className="flex flex-wrap gap-2">
          <Button size="small" onClick={() => openManageModal(record)} disabled={saving}>
            Quản lý
          </Button>
          <Button
            size="small"
            icon={<PrinterOutlined />}
            onClick={() => handlePrintInvoice(record)}
            disabled={saving}
          >
            Hóa đơn
          </Button>
        </div>
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
            className="min-w-70 max-w-105"
          />
          <Select<OrderStatus | "all">
            value={statusFilter}
            options={STATUS_FILTER_OPTIONS}
            onChange={(value) => void handleChangeStatusFilter(value)}
            className="min-w-57.5"
          />
          <Select<PaymentStatus | "all">
            value={paymentStatusFilter}
            options={PAYMENT_STATUS_FILTER_OPTIONS}
            onChange={(value) => void handleChangePaymentFilter(value)}
            className="min-w-65"
          />
          <Button
            onClick={() => void handleSyncActiveGhn()}
            loading={syncingActiveGhn}
            disabled={exportingOrders}
          >
            Đồng bộ GHN
          </Button>
          <Button
            icon={<DownloadOutlined />}
            loading={exportingOrders}
            disabled={syncingActiveGhn}
            onClick={() => void handleExportOrders()}
          >
            Xuất CSV
          </Button>
        </div>

        <Table<OrderRecord>
          rowKey="id"
          columns={columns}
          dataSource={filteredOrders}
          loading={loading || saving}
          scroll={{ x: 1500 }}
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
        width={1040}
        footer={[
          <Button key="close" onClick={closeManageModal} disabled={modalBusy}>
            Đóng
          </Button>,
          <Button
            key="invoice"
            icon={<PrinterOutlined />}
            onClick={() => managingOrder && handlePrintInvoice(managingOrder)}
            disabled={!managingOrder || modalBusy}
          >
            In hóa đơn
          </Button>,
          <Popconfirm
            key="cancel"
            title="Hủy đơn hàng"
            description="Chỉ nên hủy đơn khi khách yêu cầu hoặc đơn gặp sự cố."
            okText="Hủy đơn"
            cancelText="Bỏ qua"
            onConfirm={() => void handleCancelOrder()}
            disabled={!managingOrder || !isCancellableOrder(managingOrder.status) || modalBusy}
          >
            <Button
              danger
              disabled={!managingOrder || !isCancellableOrder(managingOrder.status) || modalBusy}
            >
              Hủy đơn
            </Button>
          </Popconfirm>,
          <Button
            key="save"
            type="primary"
            onClick={() => void handleUpdateOrder()}
            loading={saving}
            disabled={!managingOrder || !hasManageChanges || modalBusy}
          >
            Lưu cập nhật
          </Button>,
        ]}
      >
        {managingOrder ? (
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Tag color={STATUS_COLOR_MAP[managingOrder.status]}>{getOrderStatusLabel(managingOrder)}</Tag>
                <Tag color={PAYMENT_STATUS_COLOR_MAP[managingOrder.paymentStatus]}>
                  {PAYMENT_STATUS_LABEL_MAP[managingOrder.paymentStatus]}
                </Tag>
                <Tag>{managingOrder.paymentMethod?.toUpperCase() || "-"}</Tag>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                <div>
                  <Text type="secondary">Mã đơn</Text>
                  <div className="font-semibold text-slate-900">{managingOrder.orderNumber}</div>
                </div>
                <div>
                  <Text type="secondary">Tạo lúc</Text>
                  <div className="font-semibold text-slate-900">{formatDateTime(managingOrder.createdAt)}</div>
                </div>
                <div>
                  <Text type="secondary">Cập nhật gần nhất</Text>
                  <div className="font-semibold text-slate-900">{formatDateTime(managingOrder.updatedAt)}</div>
                </div>
              </div>
            </div>

            {activeReturnRequest ? (
              <Card
                size="small"
                title="Yêu cầu đổi hàng"
                className="rounded-2xl! border-amber-200! bg-amber-50/40 shadow-sm!"
              >
                <div className="space-y-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag color="purple">{RETURN_REQUEST_TYPE_LABEL_MAP[activeReturnRequest.type]}</Tag>
                    <Tag color={RETURN_REQUEST_STATUS_COLOR_MAP[activeReturnRequest.status]}>
                      {RETURN_REQUEST_STATUS_LABEL_MAP[activeReturnRequest.status]}
                    </Tag>
                    {activeReturnRequest.requestedAt ? (
                      <Text type="secondary">Gửi lúc: {formatDateTime(activeReturnRequest.requestedAt)}</Text>
                    ) : null}
                  </div>

                  <div>
                    <Text type="secondary">Lý do khách gửi</Text>
                    <div className="font-medium text-slate-800">{activeReturnRequest.reason || "-"}</div>
                  </div>

                  {activeReturnRequest.note ? (
                    <div>
                      <Text type="secondary">Ghi chú khách hàng</Text>
                      <div className="font-medium text-slate-800">{activeReturnRequest.note}</div>
                    </div>
                  ) : null}

                  {activeReturnRequest.requestedItems &&
                  activeReturnRequest.requestedItems.length > 0 ? (
                    <div>
                      <Text type="secondary">Sản phẩm khách muốn đổi</Text>
                      <div className="mt-1 space-y-1">
                        {activeReturnRequest.requestedItems.map((requested) => (
                          <div
                            key={`${requested.productId}-${requested.originalVariantSku}`}
                            className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700"
                          >
                            <div className="font-medium text-slate-900">{requested.productName}</div>
                            <div>
                              {requested.originalVariantLabel} → {requested.replacementVariantLabel} · SL{" "}
                              {requested.quantity}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {activeReturnRequest.replacementOrderNumber ? (
                    <div>
                      <Text type="secondary">Đơn đổi đã tạo</Text>
                      <div className="font-semibold text-slate-900">
                        {activeReturnRequest.replacementOrderNumber}
                      </div>
                    </div>
                  ) : null}

                  {activeReturnRequest.images.length > 0 ? (
                    <div>
                      <Text type="secondary">Ảnh minh chứng</Text>
                      <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                        {activeReturnRequest.images.map((imageUrl) => (
                          <a
                            key={imageUrl}
                            href={imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block overflow-hidden rounded-lg border border-slate-200 bg-white"
                          >
                            <img src={imageUrl} alt="Ảnh minh chứng đổi hàng" className="h-24 w-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {activeReturnRequest.status === "approved" ? (
                    <div className="space-y-3 rounded-xl border border-blue-200 bg-white p-3">
                      <div>
                        <div className="font-semibold text-slate-900">Sản phẩm và tồn kho cần xử lý</div>
                        <Text type="secondary">
                          Chọn đúng size gửi lại và xác nhận hàng khách trả có thể bán tiếp hay phải loại bỏ.
                        </Text>
                      </div>

                      {managingOrder.items.map((line, index) => {
                        const draft = exchangeLineDrafts[index];
                        if (!draft) {
                          return null;
                        }
                        const maxQuantity = Math.max(
                          0,
                          Number(line.quantity || 0) - Number(line.returnedQty || 0),
                        );

                        return (
                          <article key={draft.key} className="rounded-xl border border-slate-200 p-3">
                            <div className="flex gap-3">
                              <Checkbox
                                checked={draft.selected}
                                disabled={maxQuantity <= 0}
                                onChange={(event) =>
                                  updateExchangeLineDraft(draft.key, { selected: event.target.checked })
                                }
                              />
                              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                {line.image ? (
                                  <img
                                    src={line.image}
                                    alt={line.productName || "Sản phẩm"}
                                    className="h-full w-full object-cover object-top"
                                  />
                                ) : null}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-slate-900">{line.productName}</div>
                                <div className="text-xs text-slate-500">
                                  Đang trả: {line.variantLabel || line.variantSku} · Còn có thể đổi: {maxQuantity}
                                </div>
                              </div>
                            </div>

                            {draft.selected ? (
                              <div className="mt-3 grid gap-3 md:grid-cols-3">
                                <div>
                                  <Text type="secondary">Số lượng đổi</Text>
                                  <InputNumber
                                    className="mt-1 w-full"
                                    min={1}
                                    max={maxQuantity}
                                    precision={0}
                                    value={draft.quantity}
                                    onChange={(value) =>
                                      updateExchangeLineDraft(draft.key, { quantity: Number(value || 1) })
                                    }
                                  />
                                </div>
                                <div>
                                  <Text type="secondary">Size / biến thể gửi mới</Text>
                                  <Select
                                    className="mt-1 w-full"
                                    placeholder="Chọn size mới"
                                    value={draft.replacementVariantSku || undefined}
                                    options={(line.availableVariants || []).map((variant) => ({
                                      value: variant.sku,
                                      label: `${variant.label} · tồn ${variant.stock}`,
                                    }))}
                                    onChange={(value) =>
                                      updateExchangeLineDraft(draft.key, { replacementVariantSku: value })
                                    }
                                  />
                                </div>
                                <div>
                                  <Text type="secondary">Hàng khách trả về</Text>
                                  <Select
                                    className="mt-1 w-full"
                                    placeholder="Chọn cách xử lý"
                                    value={draft.returnDisposition}
                                    options={[
                                      { value: "restock", label: "Còn tốt - nhập lại kho" },
                                      { value: "quarantine", label: "Ghi nhận hàng lỗi" },
                                    ]}
                                    onChange={(value: ReturnDisposition) =>
                                      updateExchangeLineDraft(draft.key, { returnDisposition: value })
                                    }
                                  />
                                </div>
                              </div>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  ) : null}

                  {activeReturnRequest.status === "completed" &&
                  (activeReturnRequest.exchangeItems?.length || 0) > 0 ? (
                    <div className="space-y-2 rounded-xl border border-emerald-200 bg-white p-3">
                      <div className="font-semibold text-slate-900">Kết quả xử lý kho</div>
                      {activeReturnRequest.exchangeItems?.map((item) => (
                        <div
                          key={`${item.productId}-${item.originalVariantSku}`}
                          className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
                        >
                          <div className="font-medium text-slate-900">{item.productName}</div>
                          <div>
                            {item.originalVariantLabel} → {item.replacementVariantLabel} · SL {item.quantity}
                          </div>
                          <div>
                            Hàng trả: {item.returnDisposition === "restock" ? "đã nhập lại kho" : "đã ghi nhận là hàng lỗi"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-600">
                    {activeReturnRequest.status === "pending"
                      ? "Bước tiếp theo: kiểm tra lý do + ảnh, sau đó bấm Chấp nhận hoặc Từ chối."
                      : null}
                    {activeReturnRequest.status === "approved" && activeReturnRequest.type === "exchange"
                      ? "Yêu cầu đã được duyệt. Sau khi đã xử lý đổi hàng cho khách, bấm Hoàn tất yêu cầu."
                      : null}
                    {activeReturnRequest.status === "rejected"
                      ? "Yêu cầu đã bị từ chối. Nếu khách gửi lại yêu cầu mới hợp lệ, hệ thống sẽ ghi nhận lại."
                      : null}
                    {activeReturnRequest.status === "completed"
                      ? activeReturnRequest.replacementOrderNumber
                        ? `Yêu cầu đổi hàng đã hoàn tất. Đơn đổi mới: ${activeReturnRequest.replacementOrderNumber}.`
                        : "Yêu cầu đổi hàng đã hoàn tất."
                      : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="primary"
                      onClick={() => void handleUpdateReturnRequestStatus("approved")}
                      loading={updatingReturnRequest}
                      disabled={!canApproveReturnRequest || modalBusy}
                    >
                      Chấp nhận yêu cầu
                    </Button>
                    <Button
                      danger
                      onClick={() => void handleUpdateReturnRequestStatus("rejected")}
                      loading={updatingReturnRequest}
                      disabled={!canRejectReturnRequest || modalBusy}
                    >
                      Từ chối yêu cầu
                    </Button>
                    <Button
                      onClick={() => void handleUpdateReturnRequestStatus("completed")}
                      loading={updatingReturnRequest}
                      disabled={!canCompleteExchangeRequest || modalBusy}
                    >
                      Hoàn tất đổi hàng
                    </Button>
                  </div>
                </div>
              </Card>
            ) : null}

            <Card size="small" title="Điều phối đơn hàng" className="rounded-2xl! border-slate-200! shadow-sm!">
              <div className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
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
                    disabled={modalBusy || !canChangeOrderStatus}
                    className="w-full"
                  />
                  {managingOrder.status === "ready_to_ship" && isGhnCarrier(managingOrder.shippingCarrier) ? (
                    <Text type="secondary">
                      Đơn GHN sẽ chuyển sang Đang giao tự động khi GHN cập nhật đã lấy hàng.
                    </Text>
                  ) : null}
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
                    disabled={modalBusy}
                    className="w-full"
                  />
                </div>
                </div>

                <Input.TextArea
                  value={manageNote}
                  onChange={(event) => setManageNote(event.target.value)}
                  placeholder="Ghi chú quản trị (tùy chọn)"
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  maxLength={500}
                  disabled={modalBusy}
                />
              </div>
            </Card>

            <div className="grid gap-5 md:grid-cols-2">
              <Card size="small" title="Thông tin khách hàng" className="rounded-2xl! border-slate-200! shadow-sm!">
                <div className="space-y-2 text-sm">
                  <div>
                    <Text type="secondary">Họ tên</Text>
                    <div className="font-semibold text-slate-900">{managingOrder.customerName || "-"}</div>
                  </div>
                  <div>
                    <Text type="secondary">Email</Text>
                    <div className="font-semibold text-slate-900">{managingOrder.customerEmail || "-"}</div>
                  </div>
                  <div>
                    <Text type="secondary">Số điện thoại</Text>
                    <div className="font-semibold text-slate-900">{managingOrder.customerPhone || "-"}</div>
                  </div>
                </div>
              </Card>
              <Card size="small" title="Thông tin vận chuyển" className="rounded-2xl! border-slate-200! shadow-sm!">
                <div className="space-y-2 text-sm">
                  <div>
                    <Text type="secondary">Phương thức</Text>
                    <div className="font-semibold text-slate-900">{managingOrder.shippingMethod || "-"}</div>
                  </div>
                  <div>
                    <Text type="secondary">Đơn vị vận chuyển</Text>
                    <div className="font-semibold text-slate-900">{managingOrder.shippingCarrier || "-"}</div>
                  </div>
                  <div>
                    <Text type="secondary">Mã theo dõi</Text>
                    <div className="font-semibold text-slate-900">{managingOrder.trackingCode || "-"}</div>
                  </div>
                  {isGhnCarrier(managingOrder.shippingCarrier) ? (
                    <div>
                      <Button
                        onClick={() => void handleSyncCurrentShipment()}
                        loading={syncingShipment}
                        disabled={!managingOrder.shipmentId}
                      >
                        Đồng bộ GHN cho đơn này
                      </Button>
                    </div>
                  ) : null}
                  <div>
                    <Text type="secondary">Địa chỉ giao hàng</Text>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 font-medium text-slate-800">
                      {formatShippingAddress(managingOrder.shippingAddress)}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <Card size="small" title="Sản phẩm trong đơn" className="rounded-2xl! border-slate-200! shadow-sm!">
              <div className="space-y-3">
                {managingOrder.items.map((line, index) => (
                  <article
                    key={`${line.productId || line.variantSku || "line"}-${index}`}
                    className="rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <div className="flex flex-wrap gap-3 md:flex-nowrap">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                        {line.image ? (
                          <img src={line.image} alt={line.productName || "Sản phẩm"} className="h-full w-full object-cover object-top" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-bold tracking-widest text-slate-400">
                            RIO
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900">{line.productName || "Sản phẩm"}</div>
                        <div className="mt-1 text-sm text-slate-500">SKU: {line.variantSku || "-"}</div>
                        <div className="text-sm text-slate-500">Phân loại: {line.variantLabel || "-"}</div>
                      </div>

                      <div className="ml-auto min-w-45 space-y-1 text-right text-sm">
                        <div>
                          <Text type="secondary">Số lượng</Text>
                          <div className="font-semibold text-slate-900">{line.quantity}</div>
                        </div>
                        <div>
                          <Text type="secondary">Đơn giá</Text>
                          <div className="font-semibold text-slate-900">{formatCurrency.format(line.unitPrice)} VND</div>
                        </div>
                        <div>
                          <Text type="secondary">Thành tiền</Text>
                          <div className="text-base font-bold text-slate-900">{formatCurrency.format(line.totalPrice)} VND</div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </Card>

            <Card size="small" title="Tổng hợp thanh toán" className="rounded-2xl! border-slate-200! shadow-sm!">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <Text type="secondary">Tạm tính</Text>
                  <Text strong>{formatCurrency.format(managingOrder.pricing.subtotal)} VND</Text>
                </div>
                <div className="flex items-center justify-between">
                  <Text type="secondary">Giảm giá</Text>
                  <Text strong>-{formatCurrency.format(managingOrder.pricing.discount)} VND</Text>
                </div>
                <div className="flex items-center justify-between">
                  <Text type="secondary">Phí vận chuyển</Text>
                  <Text strong>{formatCurrency.format(managingOrder.pricing.shippingFee)} VND</Text>
                </div>
                {managingOrder.pricing.shippingFeeStatus !== "legacy" ? (
                  <>
                    <div className="flex items-center justify-between">
                      <Text type="secondary">Khách thực trả phí ship</Text>
                      <Text>{formatCurrency.format(managingOrder.pricing.shippingCustomerPaid)} VND</Text>
                    </div>
                    <div className="flex items-center justify-between">
                      <Text type="secondary">
                        Phí hãng vận chuyển
                        {managingOrder.pricing.shippingFeeStatus === "estimated" ? " (tạm tính)" : ""}
                      </Text>
                      <Text>{formatCurrency.format(managingOrder.pricing.shippingCarrierFee)} VND</Text>
                    </div>
                    <div className="flex items-center justify-between">
                      <Text type="secondary">Cửa hàng hỗ trợ ship</Text>
                      <Text>{formatCurrency.format(managingOrder.pricing.shippingSubsidy)} VND</Text>
                    </div>
                  </>
                ) : null}
                <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <Text strong className="text-base!">Tổng thanh toán</Text>
                  <Text strong className="text-base! text-slate-900!">
                    {formatCurrency.format(managingOrder.pricing.total)} VND
                  </Text>
                </div>
              </div>
            </Card>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}





