import { Card, Col, Row, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { adminOrders, type AdminOrderItem } from "../mockData";

const { Paragraph, Title, Text } = Typography;

const statusColorMap: Record<AdminOrderItem["status"], string> = {
  Shipping: "blue",
  Pending: "gold",
  Completed: "green",
  Cancelled: "red",
};

const orderColumns: ColumnsType<AdminOrderItem> = [
  { title: "Order", dataIndex: "orderCode", key: "orderCode" },
  { title: "Customer", dataIndex: "customer", key: "customer" },
  { title: "Items", dataIndex: "items", key: "items" },
  { title: "Total", dataIndex: "total", key: "total" },
  { title: "Payment", dataIndex: "payment", key: "payment" },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    render: (status: AdminOrderItem["status"]) => (
      <Tag color={statusColorMap[status]}>{status}</Tag>
    ),
  },
];

export function AdminOrdersPage() {
  const pendingCount = adminOrders.filter((item) => item.status === "Pending").length;
  const shippingCount = adminOrders.filter((item) => item.status === "Shipping").length;
  const completedCount = adminOrders.filter((item) => item.status === "Completed").length;

  return (
    <div className="space-y-4">
      <div>
        <Title level={3} className="!mb-1 !mt-0">
          Order Management
        </Title>
        <Paragraph className="!mb-0" type="secondary">
          This screen uses static data for UI setup and can be replaced by order API later.
        </Paragraph>
      </div>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}>
          <Card>
            <Text type="secondary">Pending</Text>
            <Title level={3} className="!mb-0 !mt-1">
              {pendingCount}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Text type="secondary">Shipping</Text>
            <Title level={3} className="!mb-0 !mt-1">
              {shippingCount}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Text type="secondary">Completed</Text>
            <Title level={3} className="!mb-0 !mt-1 !text-emerald-600">
              {completedCount}
            </Title>
          </Card>
        </Col>
      </Row>

      <Card>
        <Table<AdminOrderItem>
          rowKey="key"
          columns={orderColumns}
          dataSource={adminOrders}
          pagination={false}
        />
      </Card>
    </div>
  );
}
