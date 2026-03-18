import { Card, Typography } from "antd";
import type { KpiItem } from "../mockData";

const { Text, Title } = Typography;

type KpiCardProps = {
  item: KpiItem;
};

export function KpiCard({ item }: KpiCardProps) {
  return (
    <Card className="h-full">
      <Text type="secondary">{item.title}</Text>
      <Title level={3} className="mb-1! mt-2!">
        {item.value}
      </Title>
      <Text className={item.positive ? "text-emerald-600!" : "text-rose-600!"}>
        {item.change} so voi tuan truoc
      </Text>
    </Card>
  );
}
