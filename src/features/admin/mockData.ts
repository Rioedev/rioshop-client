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

export type OrderItem = {
  key: string;
  orderCode: string;
  customer: string;
  total: string;
  status: "Paid" | "Pending" | "Cancelled";
  createdAt: string;
};

export type StockItem = {
  sku: string;
  name: string;
  quantity: number;
};

export type ProductAdminItem = {
  key: string;
  sku: string;
  name: string;
  category: string;
  price: string;
  stock: number;
  status: "Active" | "Hidden";
};

export type AdminOrderItem = {
  key: string;
  orderCode: string;
  customer: string;
  items: number;
  total: string;
  payment: "COD" | "Card" | "Wallet";
  status: "Shipping" | "Pending" | "Completed" | "Cancelled";
};

export const adminKpis: KpiItem[] = [
  { title: "Tong doanh thu", value: "2.48 ty", change: "+12.3%", positive: true },
  { title: "Don hang hom nay", value: "128", change: "+8.1%", positive: true },
  { title: "Ty le hoan don", value: "1.9%", change: "-0.4%", positive: true },
  { title: "Khach hang moi", value: "76", change: "-2.5%", positive: false },
];

export const monthlyRevenue: RevenueItem[] = [
  { label: "T1", amount: 120 },
  { label: "T2", amount: 160 },
  { label: "T3", amount: 190 },
  { label: "T4", amount: 220 },
  { label: "T5", amount: 205 },
  { label: "T6", amount: 248 },
];

export const recentOrders: OrderItem[] = [
  {
    key: "1",
    orderCode: "#RS-9012",
    customer: "Nguyen Minh Anh",
    total: "2,150,000 VND",
    status: "Paid",
    createdAt: "10/03/2026 09:15",
  },
  {
    key: "2",
    orderCode: "#RS-9011",
    customer: "Tran Bao Khang",
    total: "890,000 VND",
    status: "Pending",
    createdAt: "10/03/2026 08:55",
  },
  {
    key: "3",
    orderCode: "#RS-9010",
    customer: "Pham Thu Linh",
    total: "1,340,000 VND",
    status: "Cancelled",
    createdAt: "10/03/2026 08:24",
  },
  {
    key: "4",
    orderCode: "#RS-9009",
    customer: "Le Huu Phat",
    total: "3,420,000 VND",
    status: "Paid",
    createdAt: "10/03/2026 07:48",
  },
];

export const lowStockProducts: StockItem[] = [
  { sku: "SKU-001", name: "Tai nghe Bluetooth RioPods X", quantity: 4 },
  { sku: "SKU-013", name: "Chuot co RioMouse Pro", quantity: 6 },
  { sku: "SKU-030", name: "Ban phim co RioKey TKL", quantity: 2 },
  { sku: "SKU-041", name: "Webcam RioCam 2K", quantity: 8 },
];

export const adminProducts: ProductAdminItem[] = [
  {
    key: "p1",
    sku: "SKU-001",
    name: "Tai nghe Bluetooth RioPods X",
    category: "Audio",
    price: "1,690,000 VND",
    stock: 24,
    status: "Active",
  },
  {
    key: "p2",
    sku: "SKU-013",
    name: "Chuot co RioMouse Pro",
    category: "Accessories",
    price: "890,000 VND",
    stock: 6,
    status: "Active",
  },
  {
    key: "p3",
    sku: "SKU-030",
    name: "Ban phim co RioKey TKL",
    category: "Accessories",
    price: "1,290,000 VND",
    stock: 2,
    status: "Active",
  },
  {
    key: "p4",
    sku: "SKU-041",
    name: "Webcam RioCam 2K",
    category: "Camera",
    price: "1,490,000 VND",
    stock: 8,
    status: "Hidden",
  },
];

export const adminOrders: AdminOrderItem[] = [
  {
    key: "o1",
    orderCode: "#RS-9012",
    customer: "Nguyen Minh Anh",
    items: 3,
    total: "2,150,000 VND",
    payment: "Card",
    status: "Shipping",
  },
  {
    key: "o2",
    orderCode: "#RS-9011",
    customer: "Tran Bao Khang",
    items: 1,
    total: "890,000 VND",
    payment: "COD",
    status: "Pending",
  },
  {
    key: "o3",
    orderCode: "#RS-9009",
    customer: "Le Huu Phat",
    items: 5,
    total: "3,420,000 VND",
    payment: "Wallet",
    status: "Completed",
  },
  {
    key: "o4",
    orderCode: "#RS-9008",
    customer: "Bui Tuan Kiet",
    items: 2,
    total: "1,040,000 VND",
    payment: "COD",
    status: "Cancelled",
  },
];
