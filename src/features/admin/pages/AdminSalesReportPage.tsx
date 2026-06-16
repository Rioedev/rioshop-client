import {
  Button,
  Card,
  DatePicker,
  Dropdown,
  Input,
  Segmented,
  Spin,
  Table,
  Tag,
  Tabs,
  Tooltip,
  Typography,
  message,
} from "antd";
import { DownloadOutlined, InfoCircleOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import {
  type RevenueByCategoryRow,
  type RevenueByCollectionRow,
  type RevenueTimeSeriesRow,
  type ReportingOverview,
  type RevenueByFlashSaleRow,
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
  `${formatNumber.format(Math.round(Number(value || 0)))} đ`;

const RANGE_PRESETS: Array<{ label: string; days: number }> = [
  { label: "7 ngày", days: 7 },
  { label: "30 ngày", days: 30 },
  { label: "90 ngày", days: 90 },
];

type Granularity = "day" | "week" | "month" | "quarter";

const granularityOptions: Array<{ label: string; value: Granularity }> = [
  { label: "Theo ngày", value: "day" },
  { label: "Theo tuần", value: "week" },
  { label: "Theo tháng", value: "month" },
  { label: "Theo quý", value: "quarter" },
];

const topSortOptions: Array<{ label: string; value: "revenue" | "quantity" | "grossProfit" }> = [
  { label: "Theo doanh thu", value: "revenue" },
  { label: "Theo số lượng bán", value: "quantity" },
  { label: "Theo lãi gộp", value: "grossProfit" },
];

const sortHelp: Record<"revenue" | "quantity" | "grossProfit", string> = {
  revenue: "Xếp theo tổng tiền hàng thực thu sau khi phân bổ giảm giá, không gồm phí vận chuyển.",
  quantity: "Xếp theo tổng số đơn vị sản phẩm đã bán trong kỳ.",
  grossProfit: "Xếp theo doanh thu thuần trừ giá vốn đã ghi nhận tại thời điểm bán.",
};

export function AdminSalesReportPage() {
  const [messageApi, contextHolder] = message.useMessage();

  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => [
    dayjs().subtract(29, "day").startOf("day"),
    dayjs().endOf("day"),
  ]);
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [topSort, setTopSort] = useState<"revenue" | "quantity" | "grossProfit">("revenue");
  const [detailTab, setDetailTab] = useState<"products" | "flash-sales">("products");
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(10);
  const [productTotal, setProductTotal] = useState(0);
  const [productSearch, setProductSearch] = useState("");
  const [flashSalePage, setFlashSalePage] = useState(1);
  const [flashSalePageSize, setFlashSalePageSize] = useState(10);
  const [flashSaleTotal, setFlashSaleTotal] = useState(0);
  const [exporting, setExporting] = useState(false);

  const [overview, setOverview] = useState<ReportingOverview | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductRow[]>([]);
  const [flashSaleRevenue, setFlashSaleRevenue] = useState<RevenueByFlashSaleRow[]>([]);
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
      const [ov, top, flashSales, cats, cols, ts] = await Promise.all([
        reportingService.getOverview(period),
        reportingService.getTopProducts(period, {
          page: productPage,
          limit: productPageSize,
          sortBy: topSort,
          search: productSearch,
        }),
        reportingService.getRevenueByFlashSale(period, {
          page: flashSalePage,
          limit: flashSalePageSize,
          sortBy: topSort,
        }),
        reportingService.getRevenueByCategory(period),
        reportingService.getRevenueByCollection(period),
        reportingService.getRevenueTimeSeries(period, granularity),
      ]);
      setOverview(ov);
      setTopProducts(top.rows);
      setProductTotal(top.totalDocs);
      setFlashSaleRevenue(flashSales.rows);
      setFlashSaleTotal(flashSales.totalDocs);
      setRevenueByCategory(cats);
      setRevenueByCollection(cols);
      setTimeSeries(ts);
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không tải được báo cáo"));
    } finally {
      setLoading(false);
    }
  }, [period, granularity, topSort, productPage, productPageSize, productSearch, flashSalePage, flashSalePageSize, messageApi]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const applyPreset = (days: number) => {
    setProductPage(1);
    setFlashSalePage(1);
    setRange([dayjs().subtract(days - 1, "day").startOf("day"), dayjs().endOf("day")]);
  };

  const downloadReport = async (exportGranularity: Granularity, allTime = false) => {
    setExporting(true);
    try {
      const blob = await reportingService.exportSalesReportXlsx(period, {
        granularity: exportGranularity,
        allTime,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bao-cao-ban-hang-${exportGranularity}-${allTime ? "toan-bo" : dayjs().format("YYYY-MM-DD")}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      messageApi.success("Đã xuất báo cáo Excel.");
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không xuất được báo cáo Excel"));
    } finally {
      setExporting(false);
    }
  };

  const handleExportMenu = ({ key }: { key: string }) => {
    if (key === "all-time") {
      void downloadReport("month", true);
      return;
    }
    if (key === "current-range") {
      void downloadReport(granularity);
      return;
    }
    void downloadReport(key as Granularity);
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
            {(productPage - 1) * productPageSize + index + 1}
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
        title: "Giá vốn",
        dataIndex: "cost",
        width: 150,
        align: "right",
        render: (value: number) => <Text type="secondary">{formatCurrency(value)}</Text>,
      },
      {
        title: "Lãi gộp",
        dataIndex: "grossProfit",
        width: 180,
        align: "right",
        sorter: (a, b) => a.grossProfit - b.grossProfit,
        render: (value: number, row) => (
          <div className="flex flex-col items-end">
            <Text strong className={value >= 0 ? "text-emerald-600!" : "text-red-500!"}>
              {formatCurrency(value)}
            </Text>
            <Text type="secondary" className="text-xs!">
              {(row.marginRate * 100).toFixed(1)}%
            </Text>
          </div>
        ),
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
    [productPage, productPageSize],
  );

  const flashSaleColumns: ColumnsType<RevenueByFlashSaleRow> = useMemo(
    () => [
      {
        title: "Chương trình",
        dataIndex: "name",
        render: (_: unknown, row) => (
          <div className="flex items-center gap-3">
            {row.banner ? (
              <img src={row.banner} alt="" className="h-12 w-20 rounded-md object-cover" />
            ) : (
              <div className="flex h-12 w-20 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-400">
                Không có ảnh
              </div>
            )}
            <div className="flex min-w-0 flex-col">
              <Text strong ellipsis={{ tooltip: row.name }}>{row.name}</Text>
              <Text type="secondary" className="text-xs!">
                {dayjs(row.startsAt).format("DD/MM/YYYY HH:mm")} - {dayjs(row.endsAt).format("DD/MM/YYYY HH:mm")}
              </Text>
            </div>
          </div>
        ),
      },
      {
        title: "Sản phẩm",
        dataIndex: "productCount",
        width: 100,
        align: "right",
        render: (value: number, row) => `${formatNumber.format(value)} / ${formatNumber.format(row.slotCount)}`,
      },
      {
        title: "SL bán",
        dataIndex: "quantitySold",
        width: 100,
        align: "right",
        render: (value: number) => formatNumber.format(value),
      },
      {
        title: "Doanh thu",
        dataIndex: "revenue",
        width: 150,
        align: "right",
        render: (value: number) => <Text strong>{formatCurrency(value)}</Text>,
      },
      {
        title: "Giảm trực tiếp",
        dataIndex: "discountAmount",
        width: 150,
        align: "right",
        render: (value: number) => formatCurrency(value),
      },
      {
        title: "Lãi gộp",
        dataIndex: "grossProfit",
        width: 160,
        align: "right",
        render: (value: number, row) => (
          <div className="flex flex-col items-end">
            <Text strong className={value >= 0 ? "text-emerald-600!" : "text-red-500!"}>{formatCurrency(value)}</Text>
            <Text type="secondary" className="text-xs!">{(row.marginRate * 100).toFixed(1)}%</Text>
          </div>
        ),
      },
      {
        title: "Số đơn",
        dataIndex: "orderCount",
        width: 90,
        align: "right",
        render: (value: number) => formatNumber.format(value),
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
          <Dropdown
            menu={{
              onClick: handleExportMenu,
              items: [
                { key: "week", label: "Excel doanh thu theo tuần" },
                { key: "month", label: "Excel doanh thu theo tháng" },
                { key: "quarter", label: "Excel doanh thu theo quý" },
                { type: "divider" },
                { key: "current-range", label: "Toàn bộ báo cáo trong khoảng đang chọn" },
                { key: "all-time", label: "Toàn bộ lịch sử bán hàng" },
              ],
            }}
          >
            <Button icon={<DownloadOutlined />} loading={exporting} type="primary">
              Xuất Excel
            </Button>
          </Dropdown>
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
                setProductPage(1);
                setFlashSalePage(1);
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
            <Text type="secondary" className="text-xs! uppercase! tracking-wider!">Lãi gộp</Text>
            <Title
              level={4}
              className={`m-0! mt-2! ${(overview?.grossProfit ?? 0) >= 0 ? "text-emerald-600!" : "text-red-500!"}`}
            >
              {formatCurrency(overview?.grossProfit ?? 0)}
            </Title>
            <Text type="secondary" className="text-xs!">
              Tỷ suất {(((overview?.marginRate ?? 0)) * 100).toFixed(1)}% · Giá vốn {formatCurrency(overview?.cost ?? 0)}
            </Text>
          </Card>
          <Card>
            <Text type="secondary" className="text-xs! uppercase! tracking-wider!">Giá trị TB / đơn</Text>
            <Title level={4} className="m-0! mt-2!">{formatCurrency(overview?.avgOrderValue ?? 0)}</Title>
            <Text type="secondary" className="text-xs!">AOV trong kỳ</Text>
          </Card>
          <Card>
            <Text type="secondary" className="text-xs! uppercase! tracking-wider!">Khách mua</Text>
            <Title level={4} className="m-0! mt-2!">{formatNumber.format(overview?.uniqueCustomerCount ?? 0)}</Title>
            <Text type="secondary" className="text-xs!">
              {formatNumber.format(overview?.itemCount ?? 0)} dòng sản phẩm
            </Text>
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
            <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
              <div>
                <Text strong className="text-base">Chi tiết doanh thu</Text>
                <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <span>{sortHelp[topSort]}</span>
                  <Tooltip title="Giá vốn ưu tiên snapshot tại thời điểm bán; đơn cũ chưa có snapshot sẽ fallback về giá vốn hiện tại.">
                    <InfoCircleOutlined />
                  </Tooltip>
                </div>
              </div>
              <Segmented
                value={topSort}
                onChange={(value) => {
                  setTopSort(value as "revenue" | "quantity" | "grossProfit");
                  setProductPage(1);
                  setFlashSalePage(1);
                }}
                options={topSortOptions}
              />
            </div>
            <Tabs
              activeKey={detailTab}
              onChange={(key) => setDetailTab(key as "products" | "flash-sales")}
              items={[
                {
                  key: "products",
                  label: `Theo sản phẩm (${formatNumber.format(productTotal)})`,
                  children: (
                    <>
                      <Input.Search
                        allowClear
                        className="mb-3 max-w-md"
                        placeholder="Tìm sản phẩm trong báo cáo"
                        onSearch={(value) => {
                          setProductSearch(value.trim());
                          setProductPage(1);
                        }}
                      />
                      <Table<TopProductRow>
                        rowKey="productId"
                        columns={topColumns}
                        dataSource={topProducts}
                        pagination={{
                          current: productPage,
                          pageSize: productPageSize,
                          total: productTotal,
                          showSizeChanger: true,
                          showTotal: (total) => `${formatNumber.format(total)} sản phẩm`,
                          onChange: (page, pageSize) => {
                            setProductPage(pageSize === productPageSize ? page : 1);
                            setProductPageSize(pageSize);
                          },
                        }}
                        scroll={{ x: 1050 }}
                        size="middle"
                        locale={{ emptyText: "Chưa có sản phẩm phát sinh doanh thu trong khoảng này" }}
                      />
                    </>
                  ),
                },
                {
                  key: "flash-sales",
                  label: `Theo Flash Sale (${formatNumber.format(flashSaleTotal)})`,
                  children: (
                    <Table<RevenueByFlashSaleRow>
                      rowKey="flashSaleId"
                      columns={flashSaleColumns}
                      dataSource={flashSaleRevenue}
                      pagination={{
                        current: flashSalePage,
                        pageSize: flashSalePageSize,
                        total: flashSaleTotal,
                        showSizeChanger: true,
                        showTotal: (total) => `${formatNumber.format(total)} chương trình`,
                        onChange: (page, pageSize) => {
                          setFlashSalePage(pageSize === flashSalePageSize ? page : 1);
                          setFlashSalePageSize(pageSize);
                        },
                      }}
                      scroll={{ x: 1050 }}
                      size="middle"
                      locale={{ emptyText: "Không có chương trình Flash Sale trong khoảng này" }}
                    />
                  ),
                },
              ]}
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
              pagination={{ pageSize: 8, showSizeChanger: false, hideOnSinglePage: true }}
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
              pagination={{ pageSize: 8, showSizeChanger: false, hideOnSinglePage: true }}
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
