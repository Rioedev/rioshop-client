import { Card, Progress, Space, Typography } from "antd";
import type { RevenueItem } from "../mockData";

const { Text, Title } = Typography;

type RevenuePanelProps = {
  data: RevenueItem[];
};

export function RevenuePanel({ data }: RevenuePanelProps) {
  const maxValue = Math.max(...data.map((item) => item.amount));

  return (
    <Card>
      <div className="mb-6 flex items-center justify-between">
        <Title level={4} className="!m-0">
          Doanh thu 6 thang gan nhat
        </Title>
        <Text type="secondary">Don vi: trieu VND</Text>
      </div>
      <Space direction="vertical" size="middle" className="w-full">
        {data.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between">
              <Text>{item.label}</Text>
              <Text strong>{item.amount}M</Text>
            </div>
            <Progress
              percent={Math.round((item.amount / maxValue) * 100)}
              showInfo={false}
              strokeColor="#1677ff"
            />
          </div>
        ))}
      </Space>
    </Card>
  );
}
