import { Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { OrderItem } from "../mockData";

const { Title } = Typography;

type RecentOrdersTableProps = {
  data: OrderItem[];
};

const statusColorMap: Record<OrderItem["status"], string> = {
  Paid: "green",
  Pending: "gold",
  Cancelled: "red",
};

export function RecentOrdersTable({ data }: RecentOrdersTableProps) {
  const columns: ColumnsType<OrderItem> = [
    { title: "Ma don", dataIndex: "orderCode", key: "orderCode" },
    { title: "Khach hang", dataIndex: "customer", key: "customer" },
    { title: "Gia tri", dataIndex: "total", key: "total" },
    {
      title: "Trang thai",
      dataIndex: "status",
      key: "status",
      render: (value: OrderItem["status"]) => (
        <Tag color={statusColorMap[value]}>{value}</Tag>
      ),
    },
    { title: "Thoi gian", dataIndex: "createdAt", key: "createdAt" },
  ];

  return (
    <Card>
      <Title level={4} className="mb-4! mt-0!">
        Don hang gan day
      </Title>
      <Table<OrderItem> rowKey="key" columns={columns} dataSource={data} pagination={false} />
    </Card>
  );
}
