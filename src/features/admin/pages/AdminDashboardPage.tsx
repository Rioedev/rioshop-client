import {
  AppstoreOutlined,
  CalendarOutlined,
  GiftOutlined,
  ShoppingCartOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Button, Card, Col, Row, Spin, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  analyticsEventService,
  type AnalyticsDashboardData,
} from "../../../services/analyticsEventService";
import { inventoryService, type InventoryRecord } from "../../../services/inventoryService";
import { orderService, type OrderRecord } from "../../../services/orderService";
import { productService } from "../../../services/productService";
import { subscribeAdminRealtime } from "../../../services/socketClient";
import { DashboardDonutCard, DashboardLineChartCard, DashboardOrdersColumnCard, DashboardRankBarCard } from "../components/DashboardCharts";
import { KpiCard } from "../components/KpiCard";
import { LowStockList } from "../components/LowStockList";
import { RecentOrdersTable } from "../components/RecentOrdersTable";
import { RevenuePanel } from "../components/RevenuePanel";
import {
  type KpiItem,
  type OrderItem,
  type RevenueItem,
  type StockItem,
} from "../mockData";
import { getErrorMessage } from "../../../utils/errorMessage";

const { Title, Text } = Typography;
const DAY_MS = 24 * 60 * 60 * 1000;
const formatNumber = new Intl.NumberFormat("vi-VN");

const ORDER_OPEN_STATUSES = ["pending", "confirmed", "packing", "ready_to_ship", "shipping"] as const;
const RANGE_PRESETS = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
} as const;

const STATUS_LABEL_MAP: Record<string, string> = {
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

const STATUS_COLOR_MAP: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  packing: "#06b6d4",
  ready_to_ship: "#6366f1",
  shipping: "#8b5cf6",
  delivered: "#10b981",
  completed: "#16a34a",
  cancelled: "#ef4444",
  returned: "#f97316",
};

const PAYMENT_LABEL_MAP: Record<string, string> = {
  cod: "COD",
  momo: "MoMo",
  vnpay: "VNPay",
  zalopay: "ZaloPay",
  card: "Thẻ",
  bank_transfer: "Chuyển khoản",
  unknown: "Khác",
};

const PAYMENT_COLOR_MAP: Record<string, string> = {
  cod: "#f59e0b",
  momo: "#ec4899",
  vnpay: "#2563eb",
  zalopay: "#0ea5e9",
  card: "#14b8a6",
  bank_transfer: "#8b5cf6",
  unknown: "#94a3b8",
};

type RangePreset = keyof typeof RANGE_PRESETS;

type MonthRange = {
  label: string;
  startDate: Date;
  endDate: Date;
};

const calculateGrowthRate = (currentValue: number, previousValue: number) => {
  if (previousValue <= 0) {
    return currentValue > 0 ? 100 : 0;
  }

  return Number((((currentValue - previousValue) / previousValue) * 100).toFixed(1));
};

const formatGrowth = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

const formatCurrencyCompact = (value: number) => {
  const safeValue = Math.max(0, Number(value || 0));

  if (safeValue >= 1_000_000_000) {
    return `${(safeValue / 1_000_000_000).toFixed(2)} tỷ`;
  }

  if (safeValue >= 1_000_000) {
    return `${(safeValue / 1_000_000).toFixed(1)} triệu`;
  }

  return `${formatNumber.format(safeValue)} VND`;
};

const formatDateTime = (value?: string) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const buildRecentMonthRanges = (count: number, anchorDate = new Date()): MonthRange[] => {
  const ranges: MonthRange[] = [];

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const startDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - offset, 1, 0, 0, 0, 0);
    const monthEnd = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - offset + 1, 0, 23, 59, 59, 999);
    const endDate = monthEnd.getTime() > anchorDate.getTime() ? anchorDate : monthEnd;

    ranges.push({
      label: `T${startDate.getMonth() + 1}`,
      startDate,
      endDate,
    });
  }

  return ranges;
};

const buildMonthlyRevenueSeries = (
  metrics: AnalyticsDashboardData,
  count = 6,
  anchorDate = new Date(),
): RevenueItem[] => {
  const ranges = buildRecentMonthRanges(count, anchorDate);
  const byMonth = new Map<string, number>();

  for (const point of metrics.revenueByDate || []) {
    const key = point.date?.slice(0, 7);
    if (!key) {
      continue;
    }

    byMonth.set(key, (byMonth.get(key) || 0) + Number(point.revenue || 0));
  }

  return ranges.map((range) => {
    const key = range.startDate.toISOString().slice(0, 7);
    return {
      label: range.label,
      amount: byMonth.get(key) || 0,
    };
  });
};

const getPendingOrderCount = (dashboardMetrics: AnalyticsDashboardData) =>
  ORDER_OPEN_STATUSES.reduce(
    (total, status) => total + Number(dashboardMetrics.ordersByStatus?.[status] ?? 0),
    0,
  );

const mapOrderStatus = (order: OrderRecord): OrderItem["status"] => {
  if (order.status === "cancelled" || order.status === "returned") {
    return "Cancelled";
  }

  if (order.paymentStatus === "paid" || order.status === "delivered" || order.status === "completed") {
    return "Paid";
  }

  return "Pending";
};

const normalizeOrderItem = (order: OrderRecord): OrderItem => ({
  key: order.id || order.orderNumber,
  orderCode: `#${order.orderNumber}`,
  customer: order.customerName || "Khách hàng",
  total: `${formatNumber.format(order.pricing.total)} ${order.pricing.currency || "VND"}`,
  status: mapOrderStatus(order),
  createdAt: formatDateTime(order.createdAt),
});

const normalizeLowStockItem = (item: InventoryRecord): StockItem => ({
  sku: item.variantSku || "-",
  name: item.product?.name || item.variantSku || "Sản phẩm",
  quantity: Math.max(0, Number(item.available || 0)),
});

const buildDashboardKpis = (payload: {
  currentMetrics: AnalyticsDashboardData;
  previousMetrics: AnalyticsDashboardData;
}) => {
  const { currentMetrics, previousMetrics } = payload;
  const currentNetRevenue = currentMetrics.totals.netRevenue ?? currentMetrics.totals.revenue;
  const previousNetRevenue = previousMetrics.totals.netRevenue ?? previousMetrics.totals.revenue;

  const revenueGrowth = calculateGrowthRate(currentNetRevenue, previousNetRevenue);
  const orderGrowth = calculateGrowthRate(currentMetrics.totals.orders, previousMetrics.totals.orders);
  const conversionGrowth = calculateGrowthRate(
    currentMetrics.conversion.purchaseToViewRate,
    previousMetrics.conversion.purchaseToViewRate,
  );

  const currentCustomers =
    Number(currentMetrics.summary?.newCustomers || 0) +
    Number(currentMetrics.summary?.returningCustomers || 0);
  const previousCustomers =
    Number(previousMetrics.summary?.newCustomers || 0) +
    Number(previousMetrics.summary?.returningCustomers || 0);
  const customerGrowth = calculateGrowthRate(currentCustomers, previousCustomers);

  return [
    {
      title: "Doanh thu thuần",
      value: formatCurrencyCompact(currentNetRevenue),
      change: formatGrowth(revenueGrowth),
      positive: revenueGrowth >= 0,
    },
    {
      title: "Đơn hàng",
      value: formatNumber.format(currentMetrics.totals.orders),
      change: formatGrowth(orderGrowth),
      positive: orderGrowth >= 0,
    },
    {
      title: "Tỷ lệ mua/xem",
      value: `${currentMetrics.conversion.purchaseToViewRate.toFixed(2)}%`,
      change: formatGrowth(conversionGrowth),
      positive: conversionGrowth >= 0,
    },
    {
      title: "Khách mua hàng",
      value: formatNumber.format(currentCustomers),
      change: formatGrowth(customerGrowth),
      positive: customerGrowth >= 0,
    },
  ] satisfies KpiItem[];
};

export function AdminDashboardPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [rangePreset, setRangePreset] = useState<RangePreset>("30d");
  const [adminKpis, setAdminKpis] = useState<KpiItem[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<RevenueItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderItem[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<StockItem[]>([]);
  const [todayOrderCount, setTodayOrderCount] = useState(0);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [estimatedRevenueValue, setEstimatedRevenueValue] = useState(0);
  const [analyticsEventsCount, setAnalyticsEventsCount] = useState(0);
  const [dashboardMetrics, setDashboardMetrics] = useState<AnalyticsDashboardData | null>(null);

  const currentDateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date()),
    [],
  );

  const urgentLowStockCount = useMemo(
    () => lowStockProducts.filter((item) => item.quantity <= 5).length,
    [lowStockProducts],
  );

  const requestSequenceRef = useRef(0);
  const realtimeRefreshTimerRef = useRef<number | null>(null);

  const loadDashboard = useCallback(async () => {
    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;

    setLoading(true);
    try {
      const now = new Date();
      const periodDays = RANGE_PRESETS[rangePreset];
      const currentPeriodStart = new Date(now.getTime() - periodDays * DAY_MS);
      const previousPeriodStart = new Date(now.getTime() - periodDays * 2 * DAY_MS);
      const previousPeriodEnd = new Date(currentPeriodStart.getTime() - 1);

      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const sixMonthsStart = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);

      const [
        currentMetrics,
        previousMetrics,
        todayMetrics,
        sixMonthMetrics,
        recentOrdersPage,
        lowStockPage,
        activeProductsPage,
      ] = await Promise.all([
        analyticsEventService.getAnalyticsDashboard({
          startDate: currentPeriodStart.toISOString(),
          endDate: now.toISOString(),
        }),
        analyticsEventService.getAnalyticsDashboard({
          startDate: previousPeriodStart.toISOString(),
          endDate: previousPeriodEnd.toISOString(),
        }),
        analyticsEventService.getAnalyticsDashboard({
          startDate: todayStart.toISOString(),
          endDate: now.toISOString(),
        }),
        analyticsEventService.getAnalyticsDashboard({
          startDate: sixMonthsStart.toISOString(),
          endDate: now.toISOString(),
        }),
        orderService.getOrders({
          page: 1,
          limit: 8,
          status: "all",
          paymentStatus: "all",
        }),
        inventoryService.getLowStockItems({
          page: 1,
          limit: 8,
          threshold: 10,
        }),
        productService.getProducts({
          page: 1,
          limit: 1,
          status: "active",
        }),
      ]);

      if (requestId !== requestSequenceRef.current) {
        return;
      }

      const kpis = buildDashboardKpis({
        currentMetrics,
        previousMetrics,
      });

      const monthlySeries = buildMonthlyRevenueSeries(sixMonthMetrics, 6, now);
      const normalizedLowStock = lowStockPage.docs.map(normalizeLowStockItem);
      const normalizedOrders = recentOrdersPage.docs.map(normalizeOrderItem);

      const lowStockCount = lowStockPage.totalDocs;
      const activeProducts = activeProductsPage.totalDocs;
      const stockStability =
        activeProducts > 0
          ? (((activeProducts - lowStockCount) / activeProducts) * 100).toFixed(1)
          : "0.0";

      setAdminKpis([
        ...kpis,
        {
          title: "Sản phẩm đang bán",
          value: formatNumber.format(activeProducts),
          change: `${stockStability}% ổn định tồn kho`,
          positive: Number(stockStability) >= 70,
        },
      ]);
      setDashboardMetrics(currentMetrics);
      setMonthlyRevenue(monthlySeries);
      setRecentOrders(normalizedOrders);
      setLowStockProducts(normalizedLowStock);
      setTodayOrderCount(todayMetrics.totals.orders);
      setPendingOrderCount(getPendingOrderCount(currentMetrics));
      setEstimatedRevenueValue(todayMetrics.totals.netRevenue ?? todayMetrics.totals.revenue);
      setAnalyticsEventsCount(currentMetrics.totals.events);
    } catch (error) {
      if (requestId === requestSequenceRef.current) {
        messageApi.error(getErrorMessage(error));
      }
    } finally {
      if (requestId === requestSequenceRef.current) {
        setLoading(false);
      }
    }
  }, [messageApi, rangePreset]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const scheduleRealtimeRefresh = useCallback(() => {
    if (realtimeRefreshTimerRef.current) {
      window.clearTimeout(realtimeRefreshTimerRef.current);
    }

    realtimeRefreshTimerRef.current = window.setTimeout(() => {
      void loadDashboard();
    }, 700);
  }, [loadDashboard]);

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
      onInventoryUpdated: () => {
        scheduleRealtimeRefresh();
      },
      onFlashSaleUpdated: () => {
        scheduleRealtimeRefresh();
      },
    });

    return () => {
      unsubscribe();
    };
  }, [scheduleRealtimeRefresh]);

  const quickActions = [
    { label: "Đơn hàng", icon: <ShoppingCartOutlined />, href: "/admin/orders" },
    { label: "Sản phẩm", icon: <AppstoreOutlined />, href: "/admin/products" },
    { label: "Mã giảm giá", icon: <GiftOutlined />, href: "/admin/coupons" },
  ];

  const revenueLineData = useMemo(
    () => (dashboardMetrics?.revenueByDate || []).map((item) => ({ label: item.label, value: item.revenue })),
    [dashboardMetrics?.revenueByDate],
  );

  const ordersColumnData = useMemo(
    () =>
      (dashboardMetrics?.ordersByDate || []).map((item) => ({
        label: item.label,
        total: item.total,
        pending: item.pending,
        completed: item.completed,
        cancelled: item.cancelled,
      })),
    [dashboardMetrics?.ordersByDate],
  );

  const statusDonutData = useMemo(() => {
    const breakdown = dashboardMetrics?.statusBreakdown || [];
    if (!breakdown.length) {
      return [];
    }

    return breakdown.map((item) => ({
      label: STATUS_LABEL_MAP[item.status] || item.status,
      value: item.count,
      color: STATUS_COLOR_MAP[item.status] || "#94a3b8",
    }));
  }, [dashboardMetrics?.statusBreakdown]);

  const paymentDonutData = useMemo(() => {
    const rows = dashboardMetrics?.paymentMethods || [];
    if (!rows.length) {
      return [];
    }

    return rows.map((item) => ({
      label: PAYMENT_LABEL_MAP[item.method] || item.method,
      value: item.count,
      color: PAYMENT_COLOR_MAP[item.method] || "#94a3b8",
    }));
  }, [dashboardMetrics?.paymentMethods]);

  const topProductsBars = useMemo(
    () =>
      (dashboardMetrics?.topProductsByRevenue || []).slice(0, 8).map((item) => ({
        label: item.name || "Sản phẩm",
        value: item.revenue,
        helper: `${formatNumber.format(item.quantity)} sp | ${formatNumber.format(item.orders)} đơn`,
      })),
    [dashboardMetrics?.topProductsByRevenue],
  );

  const topCategoriesBars = useMemo(
    () =>
      (dashboardMetrics?.topCategoriesByRevenue || []).slice(0, 8).map((item) => ({
        label: item.name,
        value: item.revenue,
        helper: `${formatNumber.format(item.quantity)} sp | ${formatNumber.format(item.orders)} đơn`,
      })),
    [dashboardMetrics?.topCategoriesByRevenue],
  );

  const averageOrderValue = dashboardMetrics?.summary?.averageOrderValue ?? 0;
  const cancellationRate = dashboardMetrics?.summary?.cancellationRate ?? 0;
  const returnRate = dashboardMetrics?.summary?.returnRate ?? 0;
  const overduePendingOrders = dashboardMetrics?.summary?.pendingOver24hOrders ?? 0;
  const newCustomers = dashboardMetrics?.summary?.newCustomers ?? 0;
  const returningCustomers = dashboardMetrics?.summary?.returningCustomers ?? 0;

  const activeRangeLabel =
    rangePreset === "7d" ? "7 ngày" : rangePreset === "90d" ? "90 ngày" : "30 ngày";

  return (
    <Spin spinning={loading}>
      {contextHolder}

      <div className="space-y-5">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-800 to-blue-900 p-6 text-white">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-300/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 left-16 h-44 w-44 rounded-full bg-blue-300/10 blur-2xl" />

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-300">
                Trung tâm điều phối RioShop
              </p>
              <Title level={3} className="mb-1! mt-0! text-white!">
                Tổng quan vận hành hôm nay
              </Title>
              <Text className="text-slate-200!">
                Số liệu thời gian thực theo dõi doanh thu, đơn hàng, tồn kho và chuyển đổi để ra quyết định nhanh.
              </Text>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-slate-100">
                <CalendarOutlined />
                {currentDateLabel}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap justify-end gap-2">
                {quickActions.map((action) => (
                  <Button
                    key={action.href}
                    icon={action.icon}
                    className="rounded-full! border-slate-500! bg-slate-800/70! text-slate-100! shadow-sm! hover:border-slate-300! hover:text-white!"
                    onClick={() => navigate(action.href)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2 rounded-full border border-white/15 bg-slate-900/40 p-1">
                {(Object.keys(RANGE_PRESETS) as RangePreset[]).map((preset) => (
                  <Button
                    key={preset}
                    size="small"
                    type={rangePreset === preset ? "primary" : "text"}
                    className={rangePreset === preset ? "rounded-full!" : "rounded-full! text-slate-200!"}
                    onClick={() => setRangePreset(preset)}
                  >
                    {preset === "7d" ? "7 ngày" : preset === "90d" ? "90 ngày" : "30 ngày"}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <Row gutter={[12, 12]} className="mt-5">
            <Col xs={24} sm={8}>
              <div className="rounded-2xl border border-slate-600/60 bg-slate-800/55 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                  Doanh thu thuần hôm nay
                </p>
                <p className="m-0 text-xl font-black text-white">
                  {formatNumber.format(estimatedRevenueValue)} VND
                </p>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div className="rounded-2xl border border-slate-600/60 bg-slate-800/55 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                  Đơn cần xử lý
                </p>
                <p className="m-0 text-xl font-black text-amber-200">
                  {pendingOrderCount} / {todayOrderCount}
                </p>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div className="rounded-2xl border border-slate-600/60 bg-slate-800/55 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                  Cảnh báo tồn kho
                </p>
                <p className="m-0 text-xl font-black text-rose-200">{urgentLowStockCount} SKU khẩn</p>
              </div>
            </Col>
          </Row>
        </div>

        <Row gutter={[16, 16]}>
          {adminKpis.map((item) => (
            <Col key={item.title} xs={24} sm={12} xl={4}>
              <KpiCard item={item} />
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} xl={4}>
            <Card className="h-full border-slate-200! shadow-sm!">
              <Text type="secondary">AOV ({activeRangeLabel})</Text>
              <Title level={4} className="mb-0! mt-1! text-slate-900!">
                {formatNumber.format(averageOrderValue)} VND
              </Title>
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={4}>
            <Card className="h-full border-slate-200! shadow-sm!">
              <Text type="secondary">Tỷ lệ hủy</Text>
              <Title level={4} className="mb-0! mt-1! text-rose-600!">
                {cancellationRate.toFixed(2)}%
              </Title>
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={4}>
            <Card className="h-full border-slate-200! shadow-sm!">
              <Text type="secondary">Tỷ lệ hoàn</Text>
              <Title level={4} className="mb-0! mt-1! text-orange-600!">
                {returnRate.toFixed(2)}%
              </Title>
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={4}>
            <Card className="h-full border-slate-200! shadow-sm!">
              <Text type="secondary">Đơn chờ {'>'}24h</Text>
              <Title level={4} className="mb-0! mt-1! text-amber-600!">
                {formatNumber.format(overduePendingOrders)}
              </Title>
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={4}>
            <Card className="h-full border-slate-200! shadow-sm!">
              <Text type="secondary">Khách mới ({activeRangeLabel})</Text>
              <Title level={4} className="mb-0! mt-1! text-blue-600!">
                {formatNumber.format(newCustomers)}
              </Title>
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={4}>
            <Card className="h-full border-slate-200! shadow-sm!">
              <Text type="secondary">Khách quay lại ({activeRangeLabel})</Text>
              <Title level={4} className="mb-0! mt-1! text-emerald-600!">
                {formatNumber.format(returningCustomers)}
              </Title>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={16}>
            <DashboardLineChartCard
              title={`Biểu đồ đường: Doanh thu theo ngày (${activeRangeLabel})`}
              subtitle="Theo dõi xu hướng doanh thu để phát hiện biến động bất thường."
              data={revenueLineData}
              valueFormatter={(value) => `${formatNumber.format(value)} VND`}
            />
          </Col>
          <Col xs={24} xl={8}>
            <DashboardDonutCard
              title="Biểu đồ tròn: Cơ cấu trạng thái đơn"
              subtitle="Phân bổ đơn theo trạng thái hiện tại"
              data={statusDonutData}
              centerLabel="Tổng đơn"
              centerValue={formatNumber.format(dashboardMetrics?.totals.orders || 0)}
            />
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={16}>
            <DashboardOrdersColumnCard
              title={`Biểu đồ cột: Đơn hàng theo ngày (${activeRangeLabel})`}
              subtitle="14 ngày gần nhất: hoàn thành, chờ xử lý và hủy/hoàn"
              data={ordersColumnData}
            />
          </Col>
          <Col xs={24} xl={8}>
            <DashboardDonutCard
              title="Biểu đồ tròn: Cơ cấu phương thức thanh toán"
              subtitle="Tỷ trọng đơn theo kênh thanh toán"
              data={paymentDonutData}
              centerLabel="Tổng giao dịch"
              centerValue={formatNumber.format(paymentDonutData.reduce((sum, item) => sum + item.value, 0))}
            />
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <DashboardRankBarCard
              title="Top sản phẩm theo doanh thu"
              subtitle={`Trong ${activeRangeLabel} gần nhất`}
              data={topProductsBars}
              valueFormatter={(value) => `${formatNumber.format(value)} VND`}
            />
          </Col>
          <Col xs={24} xl={12}>
            <DashboardRankBarCard
              title="Top danh mục theo doanh thu"
              subtitle={`Trong ${activeRangeLabel} gần nhất`}
              data={topCategoriesBars}
              valueFormatter={(value) => `${formatNumber.format(value)} VND`}
            />
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={16}>
            <RevenuePanel data={monthlyRevenue} />
          </Col>
          <Col xs={24} xl={8}>
            <Card className="mb-4 border-slate-200! shadow-sm!">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                    Sức khỏe vận hành
                  </p>
                  <h3 className="m-0 text-lg font-black text-slate-900">Tín hiệu thời gian thực</h3>
                </div>
                <ThunderboltOutlined className="text-xl text-cyan-600" />
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="m-0 text-xs text-slate-500">Đơn hàng chờ duyệt</p>
                  <p className="m-0 mt-1 text-base font-bold text-slate-900">{pendingOrderCount} đơn</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="m-0 text-xs text-slate-500">SKU sắp hết hàng</p>
                  <p className="m-0 mt-1 text-base font-bold text-rose-600">{lowStockProducts.length} sản phẩm</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="m-0 text-xs text-slate-500">Sự kiện analytics ({activeRangeLabel})</p>
                  <p className="m-0 mt-1 text-base font-bold text-blue-600">{formatNumber.format(analyticsEventsCount)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="m-0 text-xs text-slate-500">Tỷ lệ thêm giỏ / xem sản phẩm</p>
                  <p className="m-0 mt-1 text-base font-bold text-cyan-700">
                    {(dashboardMetrics?.conversion.addToCartRate ?? 0).toFixed(2)}%
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="m-0 text-xs text-slate-500">Tỷ lệ mua / thêm giỏ</p>
                  <p className="m-0 mt-1 text-base font-bold text-emerald-700">
                    {(dashboardMetrics?.conversion.cartToPurchaseRate ?? 0).toFixed(2)}%
                  </p>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <LowStockList data={lowStockProducts} />
          </Col>
        </Row>

        <RecentOrdersTable data={recentOrders} />
      </div>
    </Spin>
  );
}


