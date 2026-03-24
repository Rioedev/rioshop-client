import {
  AppstoreOutlined,
  CalendarOutlined,
  GiftOutlined,
  ShoppingCartOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Button, Card, Col, Row, Typography } from "antd";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { KpiCard } from "../components/KpiCard";
import { LowStockList } from "../components/LowStockList";
import { RecentOrdersTable } from "../components/RecentOrdersTable";
import { RevenuePanel } from "../components/RevenuePanel";
import {
  adminKpis,
  lowStockProducts,
  monthlyRevenue,
  recentOrders,
} from "../mockData";

const { Title, Text } = Typography;

const parseCurrencyToNumber = (value: string) => {
  const digits = value.replace(/[^\d]/g, "");
  return Number(digits || 0);
};

export function AdminDashboardPage() {
  const navigate = useNavigate();

  const todayOrderCount = recentOrders.length;
  const pendingOrderCount = recentOrders.filter((item) => item.status === "Pending").length;
  const urgentLowStockCount = lowStockProducts.filter((item) => item.quantity <= 5).length;
  const currentDateLabel = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  const estimatedRevenueValue = useMemo(
    () => recentOrders.reduce((sum, item) => sum + parseCurrencyToNumber(item.total), 0),
    [],
  );

  const quickActions = [
    { label: "Đơn hàng", icon: <ShoppingCartOutlined />, href: "/admin/orders" },
    { label: "Sản phẩm", icon: <AppstoreOutlined />, href: "/admin/products" },
    { label: "Mã giảm giá", icon: <GiftOutlined />, href: "/admin/coupons" },
  ];

  return (
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
              Theo dõi doanh thu, đơn hàng và tồn kho trong một màn hình để ra quyết định nhanh hơn.
            </Text>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-slate-100">
              <CalendarOutlined />
              {currentDateLabel}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
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
        </div>

        <Row gutter={[12, 12]} className="mt-5">
          <Col xs={24} sm={8}>
            <div className="rounded-2xl border border-slate-600/60 bg-slate-800/55 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                Doanh thu ước tính
              </p>
              <p className="m-0 text-xl font-black text-white">
                {estimatedRevenueValue.toLocaleString("vi-VN")} VND
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
          <Col key={item.title} xs={24} sm={12} xl={6}>
            <KpiCard item={item} />
          </Col>
        ))}
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
                <p className="m-0 text-xs text-slate-500">Xu hướng doanh thu</p>
                <p className="m-0 mt-1 text-base font-bold text-emerald-600">
                  {adminKpis[0]?.change ?? "+0%"} tuần này
                </p>
              </div>
            </div>
          </Card>
          <LowStockList data={lowStockProducts} />
        </Col>
      </Row>

      <RecentOrdersTable data={recentOrders} />
    </div>
  );
}
