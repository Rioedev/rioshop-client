import { Button, Checkbox, Form, Input, InputNumber, Modal, Select, Upload, message } from "antd";
import type { UploadProps } from "antd/es/upload";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  type CustomerOrderStatus,
  type OrderRecord,
  type PaymentMethod,
  type PaymentStatus,
  type ReturnRequestStatus,
  type ReturnRequestType,
} from "../../../services/orderService";
import { getImageValidationError } from "../../../services/mediaUploadService";
import { useAuthStore } from "../../../stores/authStore";
import { getErrorMessage } from "../../../utils/errorMessage";
import { subscribeOrderRealtime } from "../../../services/socketClient";

const orderStatusLabelMap: Record<string, string> = {
  pending_confirmation: "Chờ xác nhận",
  waiting_pickup: "Chờ lấy hàng",
  in_transit: "Đang vận chuyển",
  out_for_delivery: "Đang giao hàng",
  return_in_progress: "Đang xử lý đổi hàng",
  issue: "Giao hàng gặp sự cố",
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  packing: "Đang đóng gói",
  ready_to_ship: "Chờ lấy hàng",
  shipping: "Đang giao",
  delivered: "Đã giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  returned: "Đã hủy",
  return_requested: "Đã gửi yêu cầu đổi hàng",
  return_request_pending: "Yêu cầu đổi hàng đang chờ xử lý",
  return_request_approved: "Yêu cầu đổi hàng đã được duyệt",
  return_request_rejected: "Yêu cầu đổi hàng đã bị từ chối",
  return_request_completed: "Yêu cầu đổi hàng đã hoàn tất",
};

const ONLINE_PAYMENT_METHODS = new Set(["momo", "vnpay", "zalopay", "card", "bank_transfer"]);
const RETURN_REQUEST_WINDOW_DAYS = 3;
const RETURN_REQUEST_MAX_IMAGES = 8;

const returnRequestStatusLabelMap: Record<ReturnRequestStatus, string> = {
  pending: "Đang chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Đã từ chối",
  completed: "Đã xử lý",
};

const returnRequestTypeLabelMap: Record<ReturnRequestType, string> = {
  exchange: "Đổi hàng",
  return: "Đổi hàng",
};

const normalizeTimelineText = (value?: string) => (value || "").toString().trim().toLowerCase();

const timelineNoteLabelMap: Record<string, string> = {
  "customer submitted an exchange request": "Khách hàng đã gửi yêu cầu đổi hàng",
  "customer submitted a return request": "Khách hàng đã gửi yêu cầu đổi hàng",
  "admin approved exchange request": "Quản trị viên đã duyệt yêu cầu đổi hàng",
  "admin approved return request": "Quản trị viên đã duyệt yêu cầu đổi hàng",
  "admin rejected exchange request": "Quản trị viên đã từ chối yêu cầu đổi hàng",
  "admin rejected return request": "Quản trị viên đã từ chối yêu cầu đổi hàng",
  "exchange request completed": "Yêu cầu đổi hàng đã hoàn tất",
  "return request completed": "Yêu cầu đổi hàng đã hoàn tất",
};

const timelineNotePrefixLabelMap: Array<{ from: string; to: string }> = [
  { from: "admin approved exchange request. note:", to: "Quản trị viên đã duyệt yêu cầu đổi hàng. Ghi chú:" },
  { from: "admin approved return request. note:", to: "Quản trị viên đã duyệt yêu cầu đổi hàng. Ghi chú:" },
  { from: "admin rejected exchange request. note:", to: "Quản trị viên đã từ chối yêu cầu đổi hàng. Ghi chú:" },
  { from: "admin rejected return request. note:", to: "Quản trị viên đã từ chối yêu cầu đổi hàng. Ghi chú:" },
  { from: "exchange request completed. note:", to: "Yêu cầu đổi hàng đã hoàn tất. Ghi chú:" },
  { from: "return request completed. note:", to: "Yêu cầu đổi hàng đã hoàn tất. Ghi chú:" },
];

const getLocalizedTimelineNote = (note?: string) => {
  const normalized = normalizeTimelineText(note);
  if (!normalized) {
    return "Đang cập nhật trạng thái đơn hàng.";
  }

  if (timelineNoteLabelMap[normalized]) {
    return timelineNoteLabelMap[normalized];
  }

  for (const item of timelineNotePrefixLabelMap) {
    if (normalized.startsWith(item.from)) {
      const suffix = (note || "").slice(item.from.length).trim();
      return suffix ? `${item.to} ${suffix}` : item.to;
    }
  }

  return note ?? "Đang cập nhật trạng thái đơn hàng.";
};

const getDisplayStatus = (
  order: Pick<OrderRecord, "status" | "customerStatus">,
) => (order.customerStatus || order.status) as CustomerOrderStatus | string;

const getOrderStatusLabel = (
  order: Pick<OrderRecord, "status" | "customerStatus" | "paymentStatus" | "paymentMethod">,
) => {
  const displayStatus = getDisplayStatus(order);

  if (
    displayStatus === "pending_confirmation" &&
    order.status === "pending" &&
    order.paymentStatus === "pending" &&
    ONLINE_PAYMENT_METHODS.has(order.paymentMethod)
  ) {
    return "Chờ thanh toán";
  }

  return orderStatusLabelMap[displayStatus] ?? displayStatus;
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

const resolveDeliveredAt = (order: OrderRecord | null): Date | null => {
  if (!order) {
    return null;
  }

  for (let index = order.timeline.length - 1; index >= 0; index -= 1) {
    const event = order.timeline[index];
    if ((event.status || "").trim() !== "delivered") {
      continue;
    }

    const deliveredAt = new Date(event.at || "");
    if (!Number.isNaN(deliveredAt.getTime())) {
      return deliveredAt;
    }
  }

  if (!["delivered", "completed"].includes(order.status)) {
    return null;
  }

  const fallback = new Date(order.updatedAt || order.createdAt || "");
  if (!Number.isNaN(fallback.getTime())) {
    return fallback;
  }

  return null;
};

type ExchangeSelectionDraft = {
  key: string;
  productId: string;
  originalVariantSku: string;
  productName: string;
  variantLabel: string;
  image?: string;
  maxQuantity: number;
  availableVariants: Array<{ sku: string; label: string; stock: number }>;
  selected: boolean;
  quantity: number;
  replacementVariantSku?: string;
};

// Dựng danh sách sản phẩm khách có thể đổi: chỉ giữ món còn số lượng chưa đổi,
// và mỗi món chỉ cho chọn các biến thể khác đang còn hàng (loại biến thể hiện tại).
const buildExchangeDrafts = (order: OrderRecord): ExchangeSelectionDraft[] =>
  order.items
    .map((line, index) => {
      const maxQuantity = Math.max(0, Number(line.quantity || 0) - Number(line.returnedQty || 0));
      const availableVariants = (line.availableVariants ?? []).filter(
        (variant) => variant.sku !== line.variantSku && variant.stock > 0,
      );

      return {
        key: `${line.productId || "product"}::${line.variantSku || "variant"}::${index}`,
        productId: line.productId || "",
        originalVariantSku: line.variantSku || "",
        productName: line.productName || "Sản phẩm",
        variantLabel: line.variantLabel || line.variantSku || "Mặc định",
        image: line.image,
        maxQuantity,
        availableVariants,
        selected: false,
        quantity: Math.max(1, maxQuantity),
        replacementVariantSku: undefined,
      } satisfies ExchangeSelectionDraft;
    })
    .filter((draft) => draft.maxQuantity > 0);

export function StoreOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [messageApi, contextHolder] = message.useMessage();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [returnRequestForm] = Form.useForm<{
    reason: string;
    note?: string;
  }>();

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryingPayment, setRetryingPayment] = useState(false);
  const [returnRequestModalOpen, setReturnRequestModalOpen] = useState(false);
  const [submittingReturnRequest, setSubmittingReturnRequest] = useState(false);
  const [returnProofImages, setReturnProofImages] = useState<string[]>([]);
  const [returnProofUploading, setReturnProofUploading] = useState(false);
  const [exchangeDrafts, setExchangeDrafts] = useState<ExchangeSelectionDraft[]>([]);
  const realtimeRefreshTimerRef = useRef<number | null>(null);
  const orderLoadRequestRef = useRef(0);

  const loadOrderDetail = useCallback(async () => {
    const requestId = orderLoadRequestRef.current + 1;
    orderLoadRequestRef.current = requestId;

    if (!id) {
      setOrder(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await orderService.getOrderById(id);
      if (orderLoadRequestRef.current === requestId) {
        setOrder(result);
      }
    } catch (error) {
      if (orderLoadRequestRef.current !== requestId) {
        return;
      }

      const messageText = getErrorMessage(error, "Không thể tải chi tiết đơn hàng");
      messageApi.error(messageText);
      setOrder(null);
    } finally {
      if (orderLoadRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [id, messageApi]);

  useEffect(() => {
    if (!isAuthenticated) {
      setOrder(null);
      setLoading(false);
      return;
    }

    setOrder(null);
    void loadOrderDetail();
  }, [isAuthenticated, loadOrderDetail]);

  useEffect(
    () => () => {
      if (realtimeRefreshTimerRef.current) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isAuthenticated || !id) {
      return undefined;
    }

    const unsubscribe = subscribeOrderRealtime([id], () => {
      if (realtimeRefreshTimerRef.current) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
      }

      realtimeRefreshTimerRef.current = window.setTimeout(() => {
        void loadOrderDetail();
      }, 400);
    });

    return () => {
      unsubscribe();
    };
  }, [id, isAuthenticated, loadOrderDetail]);

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

  const isReplacementOrder = useMemo(() => Boolean(order?.exchangeMeta?.isReplacement), [order?.exchangeMeta?.isReplacement]);
  const parentOrderId = order?.exchangeMeta?.parentOrderId;
  const parentOrderNumber = order?.exchangeMeta?.parentOrderNumber;
  const replacementOrderId = order?.returnRequest?.replacementOrderId;
  const replacementOrderNumber = order?.returnRequest?.replacementOrderNumber;

  const returnRequestWindowInfo = useMemo(() => {
    const deliveredAt = resolveDeliveredAt(order);
    if (!deliveredAt) {
      return {
        deliveredAt: null as Date | null,
        deadlineAt: null as Date | null,
        isWithinWindow: false,
      };
    }

    const deadlineAt = new Date(
      deliveredAt.getTime() + RETURN_REQUEST_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    return {
      deliveredAt,
      deadlineAt,
      isWithinWindow: Date.now() <= deadlineAt.getTime(),
    };
  }, [order]);

  const hasActiveReturnRequest = useMemo(() => {
    const status = order?.returnRequest?.status;
    return status === "pending" || status === "approved";
  }, [order?.returnRequest?.status]);

  const hasCompletedReturnRequest = useMemo(
    () => order?.returnRequest?.status === "completed",
    [order?.returnRequest?.status],
  );

  const canSubmitReturnRequest = useMemo(() => {
    if (!order) {
      return false;
    }

    if (!["delivered", "completed"].includes(order.status)) {
      return false;
    }

    if (hasActiveReturnRequest) {
      return false;
    }

    if (hasCompletedReturnRequest) {
      return false;
    }

    return returnRequestWindowInfo.isWithinWindow;
  }, [hasActiveReturnRequest, hasCompletedReturnRequest, order, returnRequestWindowInfo.isWithinWindow]);

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
        value: getOrderStatusLabel(order),
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
      const messageText = getErrorMessage(error, "Không thể tạo lại giao dịch MoMo");
      messageApi.error(messageText);
    } finally {
      setRetryingPayment(false);
    }
  };

  const onOpenReturnRequestModal = () => {
    if (!canSubmitReturnRequest || !order) {
      return;
    }

    returnRequestForm.setFieldsValue({
      reason: "",
      note: "",
    });
    setReturnProofImages([]);
    setExchangeDrafts(buildExchangeDrafts(order));
    setReturnRequestModalOpen(true);
  };

  const updateExchangeDraft = (key: string, patch: Partial<ExchangeSelectionDraft>) => {
    setExchangeDrafts((current) =>
      current.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)),
    );
  };

  const beforeUploadReturnProof: UploadProps["beforeUpload"] = (file) => {
    if (returnProofImages.length >= RETURN_REQUEST_MAX_IMAGES) {
      messageApi.warning(`Bạn chỉ có thể tải tối đa ${RETURN_REQUEST_MAX_IMAGES} ảnh.`);
      return Upload.LIST_IGNORE;
    }

    const validationError = getImageValidationError(file as File, 5);
    if (validationError) {
      messageApi.error(validationError);
      return Upload.LIST_IGNORE;
    }

    return true;
  };

  const uploadReturnProof: UploadProps["customRequest"] = async ({ file, onError, onSuccess }) => {
    try {
      setReturnProofUploading(true);
      const uploadedUrl = await orderService.uploadReturnRequestImage(file as File);
      setReturnProofImages((previous) => {
        if (previous.length >= RETURN_REQUEST_MAX_IMAGES) {
          return previous;
        }
        return [...previous, uploadedUrl];
      });
      onSuccess?.("ok");
      messageApi.success("Tải ảnh minh chứng thành công.");
    } catch (error) {
      onError?.(error as Error);
      messageApi.error(getErrorMessage(error, "Không thể tải ảnh minh chứng"));
    } finally {
      setReturnProofUploading(false);
    }
  };

  const removeReturnProofImage = (targetUrl: string) => {
    setReturnProofImages((previous) => previous.filter((url) => url !== targetUrl));
  };

  const onSubmitReturnRequest = async () => {
    if (!order) {
      return;
    }

    const selectedDrafts = exchangeDrafts.filter((draft) => draft.selected);
    if (selectedDrafts.length === 0) {
      messageApi.warning("Hãy chọn ít nhất một sản phẩm bạn muốn đổi.");
      return;
    }

    const invalidDraft = selectedDrafts.find(
      (draft) =>
        !draft.replacementVariantSku ||
        !Number.isInteger(draft.quantity) ||
        draft.quantity <= 0 ||
        draft.quantity > draft.maxQuantity,
    );
    if (invalidDraft) {
      messageApi.warning("Hãy chọn size/màu muốn đổi sang và số lượng hợp lệ cho mỗi sản phẩm.");
      return;
    }

    try {
      const values = await returnRequestForm.validateFields();

      setSubmittingReturnRequest(true);
      await orderService.submitReturnRequest(order.id, {
        type: "exchange",
        reason: values.reason.trim(),
        note: values.note?.trim() || undefined,
        images: returnProofImages,
        items: selectedDrafts.map((draft) => ({
          productId: draft.productId,
          originalVariantSku: draft.originalVariantSku,
          replacementVariantSku: draft.replacementVariantSku as string,
          quantity: draft.quantity,
        })),
      });
      messageApi.success("Đã gửi yêu cầu đổi hàng. Shop sẽ phản hồi sớm.");
      setReturnRequestModalOpen(false);
      await loadOrderDetail();
    } catch (error) {
      if (typeof error === "object" && error && "errorFields" in error) {
        return;
      }
      const messageText = getErrorMessage(error, "Không thể gửi yêu cầu đổi hàng");
      messageApi.error(messageText);
    } finally {
      setSubmittingReturnRequest(false);
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
            {canSubmitReturnRequest ? (
              <Button className={storeButtonClassNames.ghost} onClick={onOpenReturnRequestModal}>
                Yêu cầu đổi hàng
              </Button>
            ) : null}
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
            <Button
              className={storeButtonClassNames.ghost}
              onClick={() => void loadOrderDetail()}
              loading={loading}
            >
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

            {isReplacementOrder ? (
              <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-sm text-slate-700">
                <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Đơn đổi tự động</p>
                <p className="m-0 mt-2">
                  Đơn này được hệ thống tạo tự động sau khi yêu cầu đổi hàng được duyệt và hoàn tất.
                </p>
                <p className="m-0 mt-1">
                  Tạo từ đơn{" "}
                  {parentOrderId ? (
                    <Link className="font-semibold text-blue-700" to={`/orders/${parentOrderId}`}>
                      {parentOrderNumber || "đơn gốc"}
                    </Link>
                  ) : (
                    <span className="font-semibold text-slate-800">{parentOrderNumber || "đơn gốc"}</span>
                  )}
                  .
                </p>
                <p className="m-0 mt-1 font-semibold text-blue-700">Đơn đổi không thu thêm tiền sản phẩm.</p>
              </div>
            ) : null}

            {order.returnRequest ? (
              <div className="mt-4">
                <StoreInlineNote
                  title={`Yêu cầu ${returnRequestTypeLabelMap[order.returnRequest.type] || "đổi hàng"}: ${
                    returnRequestStatusLabelMap[order.returnRequest.status] || order.returnRequest.status
                  }`}
                  description={`Lý do: ${order.returnRequest.reason || "Đang cập nhật"}${
                    order.returnRequest.note ? ` • Ghi chú: ${order.returnRequest.note}` : ""
                  }`}
                />
                {order.returnRequest.requestedItems &&
                order.returnRequest.requestedItems.length > 0 ? (
                  <div className="mt-2 rounded-2xl border border-slate-200 bg-white/80 p-3 text-sm text-slate-700">
                    <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      Sản phẩm bạn muốn đổi
                    </p>
                    <ul className="m-0 mt-2 list-none space-y-1 p-0">
                      {order.returnRequest.requestedItems.map((requested) => (
                        <li
                          key={`${requested.productId}-${requested.originalVariantSku}`}
                          className="text-slate-800"
                        >
                          <span className="font-semibold">{requested.productName}</span>:{" "}
                          {requested.originalVariantLabel} → {requested.replacementVariantLabel} · SL{" "}
                          {requested.quantity}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            {!isReplacementOrder && replacementOrderNumber ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-slate-700">
                <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Đổi hàng đã hoàn tất</p>
                <p className="m-0 mt-2">
                  Shop đã tạo đơn đổi mới cho bạn:{" "}
                  {replacementOrderId ? (
                    <Link className="font-semibold text-emerald-700" to={`/orders/${replacementOrderId}`}>
                      {replacementOrderNumber}
                    </Link>
                  ) : (
                    <span className="font-semibold text-slate-800">{replacementOrderNumber}</span>
                  )}
                  .
                </p>
              </div>
            ) : null}

            {!order.returnRequest &&
            ["delivered", "completed"].includes(order.status) &&
            returnRequestWindowInfo.deadlineAt ? (
              <div className="mt-4">
                <StoreInlineNote
                  tone={returnRequestWindowInfo.isWithinWindow ? "default" : "warning"}
                  title={
                    returnRequestWindowInfo.isWithinWindow
                      ? `Đơn còn trong hạn đổi hàng (${RETURN_REQUEST_WINDOW_DAYS} ngày)`
                      : "Đơn đã quá hạn đổi hàng"
                  }
                  description={
                    returnRequestWindowInfo.isWithinWindow
                      ? `Bạn có thể gửi yêu cầu đổi hàng đến ${formatDateTime(
                          returnRequestWindowInfo.deadlineAt.toISOString(),
                        )}.`
                      : `Đơn chỉ hỗ trợ đổi hàng trong ${RETURN_REQUEST_WINDOW_DAYS} ngày kể từ lúc giao thành công.`
                  }
                />
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
                    <article
                      key={`${order.id}-${item.productId ?? "product"}-${item.variantSku ?? "variant"}-${index}`}
                      className="rounded-2xl border border-slate-200 bg-white/90 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                            {imageSource ? (
                              <img
                                src={imageSource}
                                alt={item.productName ?? "Sản phẩm"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs font-black tracking-[0.2em] text-slate-500">
                                RIO
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="m-0 truncate text-base font-bold text-slate-900">
                              {item.productName ?? "Sản phẩm"}
                            </p>
                            <p className="m-0 mt-1 text-sm text-slate-600">
                              Biến thể: {item.variantLabel || "Mặc định"} • SKU:{" "}
                              {item.variantSku || "Đang cập nhật"}
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
              <StoreInlineNote
                title="Chưa có lịch sử cập nhật"
                description="Các thay đổi trạng thái đơn sẽ xuất hiện tại đây."
              />
            ) : (
              <div className="space-y-3">
                {order.timeline.map((event, index) => {
                  const timelineStatusKey = (event.status || "").toString().trim().toLowerCase();

                  return (
                    <article
                      key={`${order.id}-timeline-${index}`}
                      className="rounded-2xl border border-slate-200 bg-white/90 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <StoreStatusPill
                          status={event.status}
                          label={orderStatusLabelMap[timelineStatusKey] ?? event.status ?? "Cập nhật"}
                        />
                        <p className="m-0 text-sm text-slate-500">{formatDateTime(event.at)}</p>
                      </div>
                      <p className="m-0 mt-2 text-sm text-slate-700">
                        {getLocalizedTimelineNote(event.note)}
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
          </StorePanelSection>
        </>
      ) : null}

      <Modal
        title="Gửi yêu cầu đổi hàng"
        open={returnRequestModalOpen}
        onCancel={() => setReturnRequestModalOpen(false)}
        onOk={() => void onSubmitReturnRequest()}
        okText="Gửi yêu cầu"
        cancelText="Đóng"
        okButtonProps={{ loading: submittingReturnRequest }}
        width={640}
        destroyOnClose
      >
        <div className="mb-4">
          <p className="m-0 text-sm font-semibold text-slate-900">Chọn sản phẩm muốn đổi</p>
          <p className="m-0 mt-0.5 text-xs text-slate-500">
            Tick vào sản phẩm cần đổi rồi chọn size/màu bạn muốn đổi sang.
          </p>

          {exchangeDrafts.length === 0 ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
              Đơn này hiện không còn sản phẩm nào có thể đổi.
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {exchangeDrafts.map((draft) => {
                const hasVariants = draft.availableVariants.length > 0;

                return (
                  <article
                    key={draft.key}
                    className="rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <div className="flex gap-3">
                      <Checkbox
                        checked={draft.selected}
                        disabled={!hasVariants}
                        onChange={(event) =>
                          updateExchangeDraft(draft.key, { selected: event.target.checked })
                        }
                      />
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                        {draft.image ? (
                          <img
                            src={resolveStoreImageUrl(draft.image) || draft.image}
                            alt={draft.productName}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate text-sm font-semibold text-slate-900">
                          {draft.productName}
                        </p>
                        <p className="m-0 mt-0.5 text-xs text-slate-500">
                          Hiện tại: {draft.variantLabel} • Có thể đổi tối đa {draft.maxQuantity}
                        </p>
                        {!hasVariants ? (
                          <p className="m-0 mt-1 text-xs font-medium text-amber-600">
                            Tạm hết biến thể khác để đổi.
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {draft.selected && hasVariants ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="m-0 mb-1 text-xs font-medium text-slate-600">Số lượng đổi</p>
                          <InputNumber
                            className="w-full"
                            min={1}
                            max={draft.maxQuantity}
                            precision={0}
                            value={draft.quantity}
                            onChange={(value) =>
                              updateExchangeDraft(draft.key, {
                                quantity: Math.min(draft.maxQuantity, Math.max(1, Number(value || 1))),
                              })
                            }
                          />
                        </div>
                        <div>
                          <p className="m-0 mb-1 text-xs font-medium text-slate-600">
                            Đổi sang size / màu
                          </p>
                          <Select
                            className="w-full"
                            placeholder="Chọn biến thể muốn đổi"
                            value={draft.replacementVariantSku}
                            options={draft.availableVariants.map((variant) => ({
                              value: variant.sku,
                              label: `${variant.label} · còn ${variant.stock}`,
                            }))}
                            onChange={(value: string) =>
                              updateExchangeDraft(draft.key, { replacementVariantSku: value })
                            }
                          />
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <Form layout="vertical" form={returnRequestForm}>
          <Form.Item
            name="reason"
            label="Lý do"
            rules={[
              { required: true, message: "Vui lòng nhập lý do" },
              { min: 5, message: "Lý do cần ít nhất 5 ký tự" },
            ]}
          >
            <Input.TextArea rows={3} maxLength={500} placeholder="Ví dụ: Sai kích cỡ, sản phẩm lỗi, không đúng mô tả..." />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú thêm">
            <Input.TextArea rows={2} maxLength={1000} placeholder="Mô tả thêm nếu cần" />
          </Form.Item>

          <Form.Item label={`Ảnh minh chứng (tuỳ chọn, tối đa ${RETURN_REQUEST_MAX_IMAGES} ảnh)`}>
            <Upload
              accept="image/*"
              multiple
              disabled={returnProofImages.length >= RETURN_REQUEST_MAX_IMAGES}
              showUploadList={false}
              customRequest={uploadReturnProof}
              beforeUpload={beforeUploadReturnProof}
            >
              <Button loading={returnProofUploading}>Tải ảnh lên</Button>
            </Upload>

            {returnProofImages.length > 0 ? (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {returnProofImages.map((imageUrl) => (
                  <div key={imageUrl} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <img
                      src={imageUrl}
                      alt="Ảnh minh chứng"
                      className="h-20 w-full object-cover"
                    />
                    <div className="p-1">
                      <Button
                        danger
                        size="small"
                        className="w-full"
                        onClick={() => removeReturnProofImage(imageUrl)}
                      >
                        Xóa
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Chưa có ảnh nào được tải lên.</p>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </StorePageShell>
  );
}
