import {
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import type { AnalyticsEvent, AnalyticsEventType } from "../../../services/analyticsEventService";
import { useAnalyticsEventStore } from "../../../stores/analyticsEventStore";
import { getErrorMessage } from "../../../utils/errorMessage";

const { Paragraph, Text, Title } = Typography;

const EVENT_LABEL_MAP: Record<AnalyticsEventType, string> = {
  page_view: "Xem trang",
  product_view: "Xem sản phẩm",
  add_to_cart: "Thêm vào giỏ",
  purchase: "Mua hàng",
  search: "Tìm kiếm",
  click: "Nhấp chuột",
};

const EVENT_COLOR_MAP: Record<AnalyticsEventType, string> = {
  page_view: "blue",
  product_view: "cyan",
  add_to_cart: "gold",
  purchase: "green",
  search: "purple",
  click: "default",
};

const EVENT_FILTER_OPTIONS: { value: AnalyticsEventType | ""; label: string }[] = [
  { value: "", label: "Tất cả sự kiện" },
  { value: "page_view", label: EVENT_LABEL_MAP.page_view },
  { value: "product_view", label: EVENT_LABEL_MAP.product_view },
  { value: "add_to_cart", label: EVENT_LABEL_MAP.add_to_cart },
  { value: "purchase", label: EVENT_LABEL_MAP.purchase },
  { value: "search", label: EVENT_LABEL_MAP.search },
  { value: "click", label: EVENT_LABEL_MAP.click },
];

const formatCurrency = new Intl.NumberFormat("vi-VN");

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

export function AdminAnalyticsEventsPage() {
  const [messageApi, contextHolder] = message.useMessage();

  const events = useAnalyticsEventStore((state) => state.events);
  const loading = useAnalyticsEventStore((state) => state.loading);
  const dashboardLoading = useAnalyticsEventStore((state) => state.dashboardLoading);
  const page = useAnalyticsEventStore((state) => state.page);
  const pageSize = useAnalyticsEventStore((state) => state.pageSize);
  const total = useAnalyticsEventStore((state) => state.total);
  const eventFilter = useAnalyticsEventStore((state) => state.eventFilter);
  const startDate = useAnalyticsEventStore((state) => state.startDate);
  const endDate = useAnalyticsEventStore((state) => state.endDate);
  const dashboard = useAnalyticsEventStore((state) => state.dashboard);
  const loadEvents = useAnalyticsEventStore((state) => state.loadEvents);
  const loadDashboard = useAnalyticsEventStore((state) => state.loadDashboard);
  const setEventFilter = useAnalyticsEventStore((state) => state.setEventFilter);
  const setDateRange = useAnalyticsEventStore((state) => state.setDateRange);
  const [eventFilterUi, setEventFilterUi] = useState<AnalyticsEventType | "">(
    () => useAnalyticsEventStore.getState().eventFilter ?? "",
  );
  const [startDateUi, setStartDateUi] = useState(
    () => useAnalyticsEventStore.getState().startDate ?? "",
  );
  const [endDateUi, setEndDateUi] = useState(
    () => useAnalyticsEventStore.getState().endDate ?? "",
  );
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    void Promise.all([
      loadEvents({ page: 1, pageSize: 20 }),
      loadDashboard(),
    ]).catch((error) => {
      messageApi.error(getErrorMessage(error));
    });
  }, [loadDashboard, loadEvents, messageApi]);

  const filteredEvents = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return events;

    return events.filter((event) =>
      EVENT_LABEL_MAP[event.event].toLowerCase().includes(keyword) ||
      (event.user?.fullName ?? "").toLowerCase().includes(keyword) ||
      (event.user?.email ?? "").toLowerCase().includes(keyword) ||
      event.sessionId.toLowerCase().includes(keyword) ||
      (event.product?.name ?? "").toLowerCase().includes(keyword) ||
      (event.order?.orderNumber ?? "").toLowerCase().includes(keyword),
    );
  }, [events, searchText]);

  const handleApplyFilters = async () => {
    const normalizedEvent = eventFilterUi || undefined;
    const normalizedStartDate = startDateUi || undefined;
    const normalizedEndDate = endDateUi || undefined;

    setEventFilter(normalizedEvent);
    setDateRange(normalizedStartDate, normalizedEndDate);

    try {
      await Promise.all([
        loadEvents({
          page: 1,
          pageSize,
          eventFilter: normalizedEvent,
          startDate: normalizedStartDate,
          endDate: normalizedEndDate,
        }),
        loadDashboard({
          startDate: normalizedStartDate,
          endDate: normalizedEndDate,
        }),
      ]);
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const columns: ColumnsType<AnalyticsEvent> = [
    {
      title: "Sự kiện",
      dataIndex: "event",
      key: "event",
      width: 140,
      render: (event: AnalyticsEventType) => (
        <Tag color={EVENT_COLOR_MAP[event]}>{EVENT_LABEL_MAP[event]}</Tag>
      ),
    },
    {
      title: "Người dùng",
      key: "user",
      width: 240,
      render: (_, record) => (
        <div>
          <div>{record.user?.fullName ?? "Khách vãng lai"}</div>
          <Text type="secondary">{record.user?.email ?? "-"}</Text>
        </div>
      ),
    },
    {
      title: "Phiên",
      dataIndex: "sessionId",
      key: "sessionId",
      width: 170,
    },
    {
      title: "Sản phẩm/Đơn",
      key: "ref",
      width: 250,
      render: (_, record) => (
        <div>
          <div>{record.product?.name ?? "-"}</div>
          <Text type="secondary">{record.order?.orderNumber ?? "-"}</Text>
        </div>
      ),
    },
    {
      title: "Thiết bị",
      key: "device",
      width: 180,
      render: (_, record) => (
        <div>
          <div>{record.device?.type ?? "-"}</div>
          <Text type="secondary">{record.device?.os ?? "-"} | {record.device?.browser ?? "-"}</Text>
        </div>
      ),
    },
    {
      title: "Nguồn UTM",
      key: "utm",
      width: 190,
      render: (_, record) => (
        <div>
          <div>{record.utm?.source ?? "-"}</div>
          <Text type="secondary">{record.utm?.campaign ?? "-"}</Text>
        </div>
      ),
    },
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (value?: string) => formatDateTime(value),
    },
  ];

  return (
    <div className="space-y-5">
      {contextHolder}

      <div>
        <Title level={3} className="mb-1! mt-0!">
          Sự kiện phân tích hành vi
        </Title>
        <Paragraph className="mb-0!" type="secondary">
          Theo dõi hành vi người dùng theo thời gian thực và tổng quan chuyển đổi trong khoảng thời gian chọn.
        </Paragraph>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Select<AnalyticsEventType | "">
            value={eventFilterUi}
            options={EVENT_FILTER_OPTIONS}
            onChange={setEventFilterUi}
            className="min-w-[220px]"
          />
          <Input
            type="date"
            value={startDateUi}
            onChange={(event) => setStartDateUi(event.target.value)}
            className="min-w-[180px]"
          />
          <Input
            type="date"
            value={endDateUi}
            onChange={(event) => setEndDateUi(event.target.value)}
            className="min-w-[180px]"
          />
          <Button type="primary" onClick={() => void handleApplyFilters()} loading={loading || dashboardLoading}>
            Áp dụng bộ lọc
          </Button>
          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            allowClear
            placeholder="Tìm theo người dùng, phiên, sản phẩm, đơn hàng"
            className="min-w-[260px] max-w-[400px]"
          />
        </div>

        <Row gutter={[12, 12]} className="mb-4">
          <Col xs={24} md={8}>
            <Card size="small">
              <Text type="secondary">Tổng sự kiện</Text>
              <Title level={3} className="mb-0! mt-1!">
                {dashboard?.totals.events ?? 0}
              </Title>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small">
              <Text type="secondary">Tổng đơn hàng</Text>
              <Title level={3} className="mb-0! mt-1!">
                {dashboard?.totals.orders ?? 0}
              </Title>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small">
              <Text type="secondary">Doanh thu</Text>
              <Title level={3} className="mb-0! mt-1! text-emerald-600!">
                {formatCurrency.format(dashboard?.totals.revenue ?? 0)} VND
              </Title>
            </Card>
          </Col>
        </Row>

        <div className="mb-4 flex flex-wrap gap-2">
          <Tag color="green">
            Tỷ lệ mua/xem trang: {dashboard?.conversion.purchaseToViewRate ?? 0}%
          </Tag>
          <Tag color="blue">
            Lượt mua: {dashboard?.conversion.purchases ?? 0}
          </Tag>
          <Tag color="purple">
            Lượt xem trang: {dashboard?.conversion.pageViews ?? 0}
          </Tag>
        </div>

        <Table<AnalyticsEvent>
          rowKey="id"
          columns={columns}
          dataSource={filteredEvents}
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (value) => `Tổng ${value} sự kiện`,
          }}
          onChange={(pagination: TablePaginationConfig) => {
            const nextPage = pagination.current ?? page;
            const nextPageSize = pagination.pageSize ?? pageSize;
            void loadEvents({
              page: nextPage,
              pageSize: nextPageSize,
              eventFilter: eventFilter || undefined,
              startDate: startDate || undefined,
              endDate: endDate || undefined,
            }).catch((error) => {
              messageApi.error(getErrorMessage(error));
            });
          }}
        />
      </Card>
    </div>
  );
}


