import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DollarCircleOutlined,
  ShoppingOutlined,
  TeamOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { Card, Typography } from "antd";
import type { KpiItem } from "../mockData";

const { Text, Title } = Typography;

type KpiCardProps = {
  item: KpiItem;
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function KpiCard({ item }: KpiCardProps) {
  const normalizedTitle = normalizeText(item.title);
  const icon = normalizedTitle.includes("doanh thu")
    ? <DollarCircleOutlined />
    : normalizedTitle.includes("don hang")
      ? <ShoppingOutlined />
      : normalizedTitle.includes("hoan")
        ? <UndoOutlined />
        : <TeamOutlined />;

  const toneClass = item.positive
    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
    : "bg-rose-50 border-rose-200 text-rose-700";

  const progressPercent = Math.max(
    8,
    Math.min(100, Math.round(Math.abs(Number(item.change.replace(/[^\d.-]/g, ""))) * 5)),
  );

  return (
    <Card className="h-full border-slate-200! shadow-sm! transition hover:-translate-y-0.5 hover:shadow-md!">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Text className="text-[11px]! font-semibold! uppercase! tracking-[0.12em]! text-slate-500!">
            {item.title}
          </Text>
          <Title level={3} className="mb-0! mt-2! text-slate-900!">
            {item.value}
          </Title>
        </div>
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${toneClass}`}>
          {icon}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <Text className={`text-sm! font-semibold! ${item.positive ? "text-emerald-600!" : "text-rose-600!"}`}>
          {item.positive ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {item.change}
        </Text>
        <Text type="secondary" className="text-xs!">
          so với tuần trước
        </Text>
      </div>

      <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${item.positive ? "bg-emerald-500" : "bg-rose-500"}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </Card>
  );
}
