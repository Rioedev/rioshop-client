import {
  AlertOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { Avatar, Card, List, Tag, Typography } from "antd";
import type { StockItem } from "../mockData";

const { Text, Title } = Typography;

type LowStockListProps = {
  data: StockItem[];
};

const getStockStatus = (quantity: number) => {
  if (quantity <= 3) {
    return {
      color: "red",
      label: "Cần nhập ngay",
      barClassName: "bg-rose-500",
    };
  }

  if (quantity <= 6) {
    return {
      color: "orange",
      label: "Sắp hết",
      barClassName: "bg-amber-500",
    };
  }

  return {
    color: "gold",
    label: "Theo dõi",
    barClassName: "bg-yellow-500",
  };
};

export function LowStockList({ data }: LowStockListProps) {
  const urgentCount = data.filter((item) => item.quantity <= 3).length;

  return (
    <Card className="border-slate-200! shadow-sm!">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <Title level={4} className="mb-1! mt-0!">
            Sản phẩm sắp hết hàng
          </Title>
          <Text type="secondary">Theo dõi nhanh tình trạng tồn kho để nhập hàng kịp thời.</Text>
        </div>
        <Tag
          color={urgentCount > 0 ? "red" : "green"}
          className="rounded-full px-3 py-0.5 text-[11px] font-semibold uppercase"
        >
          {urgentCount > 0 ? `${urgentCount} SKU khẩn` : "Ổn định"}
        </Tag>
      </div>

      <List
        dataSource={data}
        split={false}
        renderItem={(item) => {
          const status = getStockStatus(item.quantity);
          const quantityPercent = Math.max(6, Math.min(100, item.quantity * 10));

          return (
            <List.Item className="mb-2 rounded-xl border border-slate-200 px-3 py-3 transition hover:border-slate-300 hover:bg-slate-50">
              <div className="flex w-full items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar
                    size={40}
                    icon={<InboxOutlined />}
                    className="bg-slate-100! text-slate-500!"
                  />
                  <div className="min-w-0 flex-1">
                    <Text strong className="block truncate">
                      {item.name}
                    </Text>
                    <Text type="secondary" className="text-xs!">
                      SKU: {item.sku}
                    </Text>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${status.barClassName}`}
                          style={{ width: `${quantityPercent}%` }}
                        />
                      </div>
                      <Text className="text-xs! font-medium! text-slate-600!">{item.quantity} cái</Text>
                    </div>
                  </div>
                </div>

                <Tag color={status.color} className="m-0! rounded-full px-3">
                  {item.quantity <= 3 ? <AlertOutlined className="mr-1" /> : null}
                  {status.label}
                </Tag>
              </div>
            </List.Item>
          );
        }}
      />
    </Card>
  );
}
