import { Card, List, Tag, Typography } from "antd";
import type { StockItem } from "../mockData";

const { Text, Title } = Typography;

type LowStockListProps = {
  data: StockItem[];
};

export function LowStockList({ data }: LowStockListProps) {
  return (
    <Card>
      <Title level={4} className="!mb-4 !mt-0">
        San pham sap het hang
      </Title>
      <List
        dataSource={data}
        renderItem={(item) => (
          <List.Item>
            <div className="flex w-full items-center justify-between gap-3">
              <div>
                <Text strong>{item.name}</Text>
                <div>
                  <Text type="secondary">{item.sku}</Text>
                </div>
              </div>
              <Tag color={item.quantity <= 5 ? "red" : "orange"}>{item.quantity} cai</Tag>
            </div>
          </List.Item>
        )}
      />
    </Card>
  );
}
