import { Col, Row, Typography } from "antd";
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

export function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <Title level={3} className="mb-1! mt-0!">
          Dashboard
        </Title>
        <Text type="secondary">
          Toan bo du lieu hien tai dang duoc fix cung de phuc vu dung giao dien.
        </Text>
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
          <LowStockList data={lowStockProducts} />
        </Col>
      </Row>

      <RecentOrdersTable data={recentOrders} />
    </div>
  );
}
