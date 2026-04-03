import { Card, Progress, Space, Typography } from "antd";
import type { RevenueItem } from "../mockData";

const { Text, Title } = Typography;
const formatCurrency = new Intl.NumberFormat("vi-VN");

type RevenuePanelProps = {
  data: RevenueItem[];
};

export function RevenuePanel({ data }: RevenuePanelProps) {
  if (!data.length) {
    return (
      <Card className="border-slate-200! shadow-sm!">
        <Title level={4} className="m-0!">
          Doanh thu 6 tháng gần nhất
        </Title>
        <Text type="secondary">Chưa có dữ liệu doanh thu.</Text>
      </Card>
    );
  }

  const maxValue = Math.max(...data.map((item) => item.amount), 1);
  const bestMonth = data.reduce((best, item) => (item.amount > best.amount ? item : best), data[0]);
  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Card className="border-slate-200! shadow-sm!">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Title level={4} className="m-0!">
            Doanh thu 6 tháng gần nhất
          </Title>
          <Text type="secondary">Tổng doanh thu: {formatCurrency.format(totalAmount)} VND</Text>
        </div>
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          Cao nhất: {bestMonth.label} ({formatCurrency.format(bestMonth.amount)} VND)
        </span>
      </div>

      <Space direction="vertical" size="middle" className="w-full">
        {data.map((item, index) => (
          <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="mb-2 flex items-center justify-between">
              <Text className="font-medium!">{item.label}</Text>
              <Text strong>{formatCurrency.format(item.amount)} VND</Text>
            </div>
            <Progress
              percent={Math.round((item.amount / maxValue) * 100)}
              showInfo={false}
              strokeColor={index % 2 === 0 ? "#2563eb" : "#0ea5e9"}
              railColor="#e2e8f0"
            />
          </div>
        ))}
      </Space>
    </Card>
  );
}

