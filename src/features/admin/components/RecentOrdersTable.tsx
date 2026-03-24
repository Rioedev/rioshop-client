import {
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
} from "@ant-design/icons";
import { Avatar, Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ReactNode } from "react";
import type { OrderItem } from "../mockData";

const { Text, Title } = Typography;

type RecentOrdersTableProps = {
  data: OrderItem[];
};

const parseCurrencyToNumber = (value: string) => {
  const digits = value.replace(/[^\d]/g, "");
  return Number(digits || 0);
};

const statusConfig: Record<OrderItem["status"], { color: string; label: string; icon: ReactNode }> = {
  Paid: {
    color: "green",
    label: "Đã thanh toán",
    icon: <CheckCircleFilled />,
  },
  Pending: {
    color: "gold",
    label: "Chờ xử lý",
    icon: <ClockCircleFilled />,
  },
  Cancelled: {
    color: "red",
    label: "Đã hủy",
    icon: <CloseCircleFilled />,
  },
};

export function RecentOrdersTable({ data }: RecentOrdersTableProps) {
  const paidCount = data.filter((item) => item.status === "Paid").length;
  const totalRevenue = data.reduce((sum, item) => sum + parseCurrencyToNumber(item.total), 0);

  const columns: ColumnsType<OrderItem> = [
    {
      title: "Mã đơn",
      dataIndex: "orderCode",
      key: "orderCode",
      width: 140,
      render: (value: string) => (
        <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          {value}
        </span>
      ),
    },
    {
      title: "Khách hàng",
      dataIndex: "customer",
      key: "customer",
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <Avatar size={28} className="bg-blue-100! text-blue-700!">
            {value.trim().charAt(0).toUpperCase()}
          </Avatar>
          <Text strong>{value}</Text>
        </div>
      ),
    },
    {
      title: "Giá trị",
      dataIndex: "total",
      key: "total",
      width: 160,
      render: (value: string) => <Text strong>{value}</Text>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (value: OrderItem["status"]) => (
        <Tag color={statusConfig[value].color} className="rounded-full px-2.5 py-0.5">
          <span className="mr-1">{statusConfig[value].icon}</span>
          {statusConfig[value].label}
        </Tag>
      ),
    },
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      render: (value: string) => <Text type="secondary">{value}</Text>,
    },
  ];

  return (
    <Card className="border-slate-200! shadow-sm!">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Title level={4} className="mb-1! mt-0!">
            Đơn hàng gần đây
          </Title>
          <Text type="secondary">Theo dõi nhanh trạng thái xử lý của các đơn mới nhất.</Text>
        </div>
        <div className="flex gap-2">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Đã thanh toán: {paidCount}
          </span>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            Tổng: {totalRevenue.toLocaleString("vi-VN")} VND
          </span>
        </div>
      </div>

      <Table<OrderItem>
        rowKey="key"
        columns={columns}
        dataSource={data}
        pagination={false}
        size="middle"
        rowClassName="hover:bg-slate-50"
      />
    </Card>
  );
}
