export type KpiItem = {
  title: string;
  value: string;
  change: string;
  positive: boolean;
};

export type RevenueItem = {
  label: string;
  amount: number;
};

export type OrderStatusBadge = "Paid" | "Pending" | "Cancelled";

export type OrderItem = {
  key: string;
  orderCode: string;
  customer: string;
  total: string;
  status: OrderStatusBadge;
  createdAt: string;
};

export type StockItem = {
  sku: string;
  name: string;
  quantity: number;
  reorderPoint?: number | null;
  alertLabel?: string;
  alertColor?: string;
  alertPriority?: number;
};
