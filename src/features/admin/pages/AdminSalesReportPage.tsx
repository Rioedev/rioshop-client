import {
  Card,
  DatePicker,
  Segmented,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import {
  type RevenueByCategoryRow,
  type RevenueByCollectionRow,
  type RevenueTimeSeriesRow,
  type ReportingOverview,
  type TopProductRow,
  reportingService,
} from "../../../services/reportingService";
import {
  DashboardLineChartCard,
  type LineChartPoint,
} from "../components/DashboardCharts";
import { getErrorMessage } from "../../../utils/errorMessage";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const formatNumber = new Intl.NumberFormat("vi-VN");
const formatCurrency = (value: number) =>
  `${formatNumber.format(Math.max(0, Math.round(Number(value || 0))))} đ`;

const RANGE_PRESETS: Array<{ label: string; days: number }> = [
  { label: "7 ngày", days: 7 },
  { label: "30 ngày", days: 30 },
  { label: "90 ngày", days: 90 },
];

type Granularity = "day" | "week" | "month";

const granularityOptions: Array<{ label: string; value: Granularity }> = [
  { label: "Theo ngày", value: "day" },
  { label: "Theo tuần", value: "week" },
  { label: "Theo tháng", value: "month" },
];

const topSortOptions: Array<{ label: string; value: "revenue" | "quantity" }> = [
  { label: "Theo doanh thu", value: "revenue" },
  { label: "Theo số lượng bán", value: "quantity" },
];

export function AdminSalesReportPage() {
  const [messageApi, contextHolder] = message.useMessage();

  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => [
    dayjs().subtract(29, "day").startOf("day"),
    dayjs().endOf("day"),
  ]);
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [topSort, setTopSort] = useState<"revenue" | "quantity">("revenue");

  const [overview, setOverview] = useState<ReportingOverview | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductRow[]>([]);
  const [revenueByCategory, setRevenueByCategory] = useState<RevenueByCategoryRow[]>([]);
  const [revenueByCollection, setRevenueByCollection] = useState<RevenueByCollectionRow[]>([]);
  const [timeSeries, setTimeSeries] = useState<RevenueTimeSeriesRow[]>([]);
  const [loading, setLoading] = useState(false);

  const period = useMemo(
    () => ({
      from: range[0].toISOString(),
      to: range[1].toISOString(),
    }),
    [range],
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, top, cats, cols, ts] = await Promise.all([
        reportingService.getOverview(period),
        reportingService.getTopProducts(period, { limit: 20, sortBy: topSort }),
        reportingService.getRevenueByCategory(period),
        reportingService.getRevenueByCollection(period),
        reportingService.getRevenueTimeSeries(period, granularity),
      ]);
      setOverview(ov);
      setTopProducts(top);
      setRevenueByCategory(cats);
      setRevenueByCollection(cols);
      setTimeSeries(ts);
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không tải được báo cáo"));
    } finally {
      setLoading(false);
    }
  }, [period, granularity, topSort, messageApi]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const applyPreset = (days: number) => {
    setRange([dayjs().subtract(days - 1, "day").startOf("day"), dayjs().endOf("day")]);
  };

  const timeSeriesChartData: LineChartPoint[] = useMemo(
    () => timeSeries.map((row) => ({ label: row.period, value: row.revenue })),
    [timeSeries],
  );

  const topColumns: ColumnsType<TopProductRow> = useMemo(
    () => [
      {
        title: "#",
        width: 50,
        render: (_: unknown, _row: TopProductRow, index: number) => (
          <Tag color={index < 3 ? "gold" : "default"} className="font-semibold">
            {index + 1}
          </Tag>
        ),
      },
      {
        title: "Sản phẩm",
        dataIndex: "productName",
        render: (_: unknown, row: TopProductRow) => (
          <div className="flex items-center gap-3">
            {row.image ? (
              <img
                src={row.image}
                alt=""
                className="h-10 w-10 rounded-md object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-md bg-slate-100" />
            )}
            <div className="flex flex-col">
              <Text strong>{row.productName}</Text>
              <Text type="secondary" className="text-xs">
                {row.categoryName ?? "—"}
              </Text>
            </div>
          </div>
        ),
      },
      {
        title: "SL bán",
        dataIndex: "quantitySold",
        width: 100,
        align: "right",
        sorter: (a, b) => a.quantitySold - b.quantitySold,
        render: (value: number) => formatNumber.format(value),
      },
      {
        title: "Doanh thu",
        dataIndex: "revenue",
        width: 160,
        align: "right",
        sorter: (a, b) => a.revenue - b.revenue,
        render: (value: number) => <Text strong>{formatCurrency(value)}</Text>,
      },
      {
        title: "Số đơn",
        dataIndex: "orderCount",
        width: 90,
        align: "right",
        render: (value: number) => formatNumber.format(value),
      },
      {
        title: "Tồn kho",
        dataIndex: "currentStock",
        width: 110,
        align: "right",
        render: (value?: number) => {
          const stock = Number(value ?? 0);
          if (stock <= 0) return <Tag color="red">Hết hàng</Tag>;
          if (stock < 10) return <Tag color="orange">{stock} sp</Tag>;
          return <Text>{formatNumber.format(stock)} sp</Text>;
        },
      },
    ],
    [],
  );

  const categoryColumns: ColumnsType<RevenueByCategoryRow> = [
    { title: "Danh mục", dataIndex: "categoryName", render: (v: string) => <Text strong>{v}</Text> },
    {
      title: "Doanh thu",
      dataIndex: "revenue",
      align: "right",
      sorter: (a, b) => a.revenue - b.revenue,
      render: (value: number) => formatCurrency(value),
    },
    {
      title: "SL bán",
      dataIndex: "quantitySold",
      align: "right",
      width: 120,
      render: (value: number) => formatNumber.format(value),
    },
  ];

  const collectionColumns: ColumnsType<RevenueByCollectionRow> = [
    { title: "Bộ sưu tập", dataIndex: "collectionName", render: (v: string) => <Text strong>{v}</Text> },
    {
      title: "Doanh thu",
      dataIndex: "revenue",
      align: "right",
      sorter: (a, b) => a.revenue - b.revenue,
      render: (value: number) => formatCurrency(value),
    },
    {
      title: "SL bán",
      dataIndex: "quantitySold",
      align: "right",
      width: 120,
      render: (value: number) => formatNumber.format(value),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {contextHolder}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Title level={3} className="m-0!">Báo cáo bán hàng</Title>
          <Text type="secondary">
            Doanh thu, sản phẩm bán chạy, phân tích theo danh mục và bộ sưu tập trong khoảng thời gian chọn.
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {RANGE_PRESETS.map((preset) => (
            <a
              key={preset.label}
              onClick={() => applyPreset(preset.days)}
              className="rounded-md border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50"
            >
              {preset.label}
            </a>
          ))}
          <RangePicker
            value={range}
            onChange={(value) => {
              if (value?.[0] && value?.[1]) {
                setRange([value[0].startOf("day"), value[1].endOf("day")]);
              }
            }}
            allowClear={false}
            format="DD/MM/YYYY"
          />
        </div>
      </div>

      <Spin spinning={loading}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <Text type="secondary" className="text-xs! uppercase! tracking-wider!">Doanh thu</Text>
            <Title level={4} className="m-0! mt-2!">{formatCurrency(overview?.revenue ?? 0)}</Title>
            <Text type="secondary" className="text-xs!">{formatNumber.format(overview?.orderCount ?? 0)} đơn</Text>
          </Card>
          <Card>
            <Text type="secondary" className="text-xs! uppercase! tracking-wider!">Giá trị TB / đơn</Text>
            <Title level={4} className="m-0! mt-2!">{formatCurrency(overview?.avgOrderValue ?? 0)}</Title>
            <Text type="secondary" className="text-xs!">AOV trong kỳ</Text>
          </Card>
          <Card>
            <Text type="secondary" className="text-xs! uppercase! tracking-wider!">Sản phẩm đã bán</Text>
            <Title level={4} className="m-0! mt-2!">{formatNumber.format(overview?.itemCount ?? 0)}</Title>
            <Text type="secondary" className="text-xs!">Tổng dòng item</Text>
          </Card>
          <Card>
            <Text type="secondary" className="text-xs! uppercase! tracking-wider!">Khách mua</Text>
            <Title level={4} className="m-0! mt-2!">{formatNumber.format(overview?.uniqueCustomerCount ?? 0)}</Title>
            <Text type="secondary" className="text-xs!">Tài khoản phân biệt</Text>
          </Card>
        </div>

        <div className="mt-4">
          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <Text strong className="text-base">Doanh thu theo thời gian</Text>
              <Segmented
                value={granularity}
                onChange={(value) => setGranularity(value as Granularity)}
                options={granularityOptions}
              />
            </div>
            <DashboardLineChartCard
              title=""
              data={timeSeriesChartData}
              valueFormatter={(value) => formatCurrency(value)}
            />
          </Card>
        </div>

        <div className="mt-4">
          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <Text strong className="text-base">Top 20 sản phẩm bán chạy</Text>
              <Segmented
                value={topSort}
                onChange={(value) => setTopSort(value as "revenue" | "quantity")}
                options={topSortOptions}
              />
            </div>
            <Table<TopProductRow>
              rowKey="productId"
              columns={topColumns}
              dataSource={topProducts}
              pagination={false}
              size="middle"
              locale={{ emptyText: "Chưa có đơn nào trong khoảng thời gian này" }}
            />
          </Card>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <Card>
            <Text strong className="text-base">Doanh thu theo danh mục</Text>
            <Table<RevenueByCategoryRow>
              rowKey="categoryName"
              columns={categoryColumns}
              dataSource={revenueByCategory}
              pagination={false}
              size="middle"
              className="mt-3"
              locale={{ emptyText: "Chưa có dữ liệu" }}
            />
          </Card>
          <Card>
            <Text strong className="text-base">Doanh thu theo bộ sưu tập</Text>
            <Table<RevenueByCollectionRow>
              rowKey="collectionName"
              columns={collectionColumns}
              dataSource={revenueByCollection}
              pagination={false}
              size="middle"
              className="mt-3"
              locale={{ emptyText: "Chưa có dữ liệu" }}
            />
          </Card>
        </div>
      </Spin>
    </div>
  );
}
