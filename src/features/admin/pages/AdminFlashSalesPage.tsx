import { AxiosError } from "axios";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import type { CreateFlashSalePayload, FlashSale } from "../../../services/flashSaleService";
import { useFlashSaleStore } from "../../../stores/flashSaleStore";
import { useAuthStore } from "../../../stores/authStore";

const { Paragraph, Text, Title } = Typography;

type FlashSaleFormValues = {
  name: string;
  banner?: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  slotsJson: string;
};

type ActiveFilter = "all" | "active" | "inactive";

const ACTIVE_FILTER_OPTIONS: { value: ActiveFilter; label: string }[] = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "active", label: "Đang bật" },
  { value: "inactive", label: "Đang tắt" },
];

const getErrorMessage = (error: unknown) => {
  if (error instanceof AxiosError) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Yêu cầu thất bại";
};

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const getFlashSalePhase = (sale: FlashSale) => {
  const now = Date.now();
  const startsAt = new Date(sale.startsAt).getTime();
  const endsAt = new Date(sale.endsAt).getTime();

  if (Number.isNaN(startsAt) || Number.isNaN(endsAt)) {
    return { label: "Không xác định", color: "default" as const };
  }
  if (startsAt > now) {
    return { label: "Sắp diễn ra", color: "blue" as const };
  }
  if (endsAt < now) {
    return { label: "Đã kết thúc", color: "default" as const };
  }
  return { label: "Đang diễn ra", color: "green" as const };
};

const parseSlotsJson = (raw: string): CreateFlashSalePayload["slots"] => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Danh sách slot không đúng định dạng JSON.");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Danh sách slot phải là mảng JSON và có ít nhất 1 phần tử.");
  }

  return parsed.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Slot thứ ${index + 1} không hợp lệ.`);
    }

    const obj = item as Record<string, unknown>;
    const productId = typeof obj.productId === "string" ? obj.productId.trim() : "";
    const salePrice = Number(obj.salePrice);
    const stockLimit = Number(obj.stockLimit);

    if (!/^[0-9a-fA-F]{24}$/.test(productId)) {
      throw new Error(`Slot thứ ${index + 1}: productId phải là ObjectId hợp lệ.`);
    }
    if (!Number.isFinite(salePrice) || salePrice < 0) {
      throw new Error(`Slot thứ ${index + 1}: salePrice không hợp lệ.`);
    }
    if (!Number.isFinite(stockLimit) || stockLimit < 0) {
      throw new Error(`Slot thứ ${index + 1}: stockLimit không hợp lệ.`);
    }

    return {
      productId,
      variantSku: typeof obj.variantSku === "string" ? obj.variantSku.trim() : undefined,
      salePrice,
      stockLimit,
      sold: Number.isFinite(Number(obj.sold)) ? Number(obj.sold) : 0,
    };
  });
};

const buildPayload = (
  values: FlashSaleFormValues,
  adminId?: string,
): CreateFlashSalePayload => ({
  name: values.name.trim(),
  banner: values.banner?.trim() || null,
  startsAt: new Date(values.startsAt).toISOString(),
  endsAt: new Date(values.endsAt).toISOString(),
  isActive: values.isActive,
  createdBy: adminId,
  slots: parseSlotsJson(values.slotsJson),
});

export function AdminFlashSalesPage() {
  const [form] = Form.useForm<FlashSaleFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const currentUser = useAuthStore((state) => state.user);

  const flashSales = useFlashSaleStore((state) => state.flashSales);
  const loading = useFlashSaleStore((state) => state.loading);
  const saving = useFlashSaleStore((state) => state.saving);
  const page = useFlashSaleStore((state) => state.page);
  const pageSize = useFlashSaleStore((state) => state.pageSize);
  const total = useFlashSaleStore((state) => state.total);
  const currentOnly = useFlashSaleStore((state) => state.currentOnly);
  const isActiveFilter = useFlashSaleStore((state) => state.isActiveFilter);
  const loadFlashSales = useFlashSaleStore((state) => state.loadFlashSales);
  const setCurrentOnly = useFlashSaleStore((state) => state.setCurrentOnly);
  const setIsActiveFilter = useFlashSaleStore((state) => state.setIsActiveFilter);
  const createFlashSale = useFlashSaleStore((state) => state.createFlashSale);

  useEffect(() => {
    void loadFlashSales({ page: 1, pageSize: 10 }).catch((error) => {
      messageApi.error(getErrorMessage(error));
    });
  }, [loadFlashSales, messageApi]);

  const summary = useMemo(() => {
    const active = flashSales.filter((item) => item.isActive).length;
    const running = flashSales.filter((item) => getFlashSalePhase(item).label === "Đang diễn ra").length;
    const totalSlots = flashSales.reduce((sum, item) => sum + item.slots.length, 0);

    return { active, running, totalSlots };
  }, [flashSales]);

  const handleToggleCurrentOnly = async (checked: boolean) => {
    setCurrentOnly(checked);
    try {
      await loadFlashSales({
        page: 1,
        pageSize,
        currentOnly: checked,
        isActiveFilter,
      });
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleChangeActiveFilter = async (value: ActiveFilter) => {
    setActiveFilter(value);
    const normalized = value === "all" ? undefined : value === "active";
    setIsActiveFilter(normalized);

    try {
      await loadFlashSales({
        page: 1,
        pageSize,
        currentOnly,
        isActiveFilter: normalized,
      });
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const payload = buildPayload(values, currentUser?.id);
      await createFlashSale(payload);
      messageApi.success("Tạo chương trình giảm giá chớp nhoáng thành công.");
      setIsCreateModalOpen(false);
      form.resetFields();
    } catch (error) {
      if (error instanceof Error && "errorFields" in error) {
        return;
      }
      messageApi.error(getErrorMessage(error));
    }
  };

  const columns: ColumnsType<FlashSale> = [
    {
      title: "Tên chương trình",
      dataIndex: "name",
      key: "name",
      width: 250,
    },
    {
      title: "Thời gian",
      key: "period",
      width: 260,
      render: (_, record) => (
        <div>
          <div>Bắt đầu: {formatDateTime(record.startsAt)}</div>
          <Text type="secondary">Kết thúc: {formatDateTime(record.endsAt)}</Text>
        </div>
      ),
    },
    {
      title: "Trạng thái kích hoạt",
      key: "active",
      width: 150,
      render: (_, record) => <Tag color={record.isActive ? "green" : "default"}>{record.isActive ? "Đang bật" : "Đang tắt"}</Tag>,
    },
    {
      title: "Pha khuyến mãi",
      key: "phase",
      width: 140,
      render: (_, record) => {
        const phase = getFlashSalePhase(record);
        return <Tag color={phase.color}>{phase.label}</Tag>;
      },
    },
    {
      title: "Số slot",
      key: "slots",
      width: 100,
      render: (_, record) => record.slots.length,
    },
    {
      title: "Đã bán/Tồn slot",
      key: "sold",
      width: 160,
      render: (_, record) => {
        const sold = record.slots.reduce((sum, slot) => sum + slot.sold, 0);
        const stockLimit = record.slots.reduce((sum, slot) => sum + slot.stockLimit, 0);
        return `${sold}/${stockLimit}`;
      },
    },
    {
      title: "Tạo lúc",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (value?: string) => formatDateTime(value),
    },
  ];

  return (
    <div className="space-y-5">
      {contextHolder}

      <div>
        <Title level={3} className="mb-1! mt-0!">
          Quản lý giảm giá chớp nhoáng
        </Title>
        <Paragraph className="mb-0!" type="secondary">
          Theo dõi chiến dịch giảm giá chớp nhoáng, lọc theo trạng thái và tạo chương trình mới.
        </Paragraph>
      </div>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}>
          <Card>
            <Text type="secondary">Đang bật (trang hiện tại)</Text>
            <Title level={3} className="mb-0! mt-1!">
              {summary.active}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Text type="secondary">Đang diễn ra (trang hiện tại)</Text>
            <Title level={3} className="mb-0! mt-1! text-emerald-600!">
              {summary.running}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Text type="secondary">Tổng slot (trang hiện tại)</Text>
            <Title level={3} className="mb-0! mt-1!">
              {summary.totalSlots}
            </Title>
          </Card>
        </Col>
      </Row>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Space wrap>
            <Space>
              <Text>Chỉ đang diễn ra</Text>
              <Switch
                checked={currentOnly}
                checkedChildren="Bật"
                unCheckedChildren="Tắt"
                onChange={(checked) => void handleToggleCurrentOnly(checked)}
                disabled={loading || saving}
              />
            </Space>
            <Select<ActiveFilter>
              value={activeFilter}
              options={ACTIVE_FILTER_OPTIONS}
              onChange={(value) => void handleChangeActiveFilter(value)}
              className="min-w-[200px]"
              disabled={loading || saving}
            />
          </Space>
          <Button type="primary" onClick={() => setIsCreateModalOpen(true)}>
            Tạo chương trình mới
          </Button>
        </div>

        <Table<FlashSale>
          rowKey="id"
          columns={columns}
          dataSource={flashSales}
          loading={loading || saving}
          scroll={{ x: 1250 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (value) => `Tổng ${value} chiến dịch giảm giá chớp nhoáng`,
          }}
          onChange={(pagination: TablePaginationConfig) => {
            const nextPage = pagination.current ?? page;
            const nextPageSize = pagination.pageSize ?? pageSize;
            void loadFlashSales({
              page: nextPage,
              pageSize: nextPageSize,
              currentOnly,
              isActiveFilter,
            }).catch((error) => {
              messageApi.error(getErrorMessage(error));
            });
          }}
        />
      </Card>

      <Modal
        title="Tạo chương trình giảm giá chớp nhoáng"
        open={isCreateModalOpen}
        onCancel={() => {
          setIsCreateModalOpen(false);
          form.resetFields();
        }}
        onOk={() => void handleCreate()}
        okText="Tạo mới"
        cancelText="Hủy"
        confirmLoading={saving}
        width={780}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            isActive: true,
            slotsJson: '[\n  {\n    "productId": "",\n    "variantSku": "",\n    "salePrice": 199000,\n    "stockLimit": 100,\n    "sold": 0\n  }\n]',
          }}
        >
          <Form.Item
            label="Tên chương trình"
            name="name"
            rules={[
              { required: true, message: "Vui lòng nhập tên chương trình." },
              { min: 2, message: "Tên chương trình tối thiểu 2 ký tự." },
            ]}
          >
            <Input placeholder="Ví dụ: Flash Sale Cuối Tuần" />
          </Form.Item>

          <Form.Item label="Banner (URL)" name="banner">
            <Input placeholder="https://..." />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Bắt đầu"
                name="startsAt"
                rules={[{ required: true, message: "Vui lòng nhập thời gian bắt đầu." }]}
              >
                <Input type="datetime-local" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Kết thúc"
                name="endsAt"
                rules={[{ required: true, message: "Vui lòng nhập thời gian kết thúc." }]}
              >
                <Input type="datetime-local" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Kích hoạt ngay" name="isActive" valuePropName="checked">
            <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
          </Form.Item>

          <Form.Item
            label="Danh sách slot (JSON)"
            name="slotsJson"
            rules={[{ required: true, message: "Vui lòng nhập danh sách slot." }]}
          >
            <Input.TextArea rows={10} className="font-mono" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
