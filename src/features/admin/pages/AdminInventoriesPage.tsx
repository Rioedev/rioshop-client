import { AxiosError } from "axios";
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useEffect, useState } from "react";
import type { InventoryRecord, UpdateInventoryPayload } from "../../../services/inventoryService";
import { useInventoryStore } from "../../../stores/inventoryStore";

const { Paragraph, Text, Title } = Typography;

type InventoryFormValues = {
  variantSku: string;
  productId?: string;
  warehouseId: string;
  warehouseName: string;
  onHand: number;
  reserved: number;
  incoming: number;
  reorderPoint?: number | null;
  reorderQty?: number | null;
  lowStockAlert: boolean;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof AxiosError) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Yêu cầu thất bại";
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const defaultFormValues = (variantSku = ""): InventoryFormValues => ({
  variantSku,
  productId: "",
  warehouseId: "",
  warehouseName: "",
  onHand: 0,
  reserved: 0,
  incoming: 0,
  reorderPoint: null,
  reorderQty: null,
  lowStockAlert: false,
});

export function AdminInventoriesPage() {
  const [form] = Form.useForm<InventoryFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [thresholdInput, setThresholdInput] = useState<number | undefined>(undefined);
  const [variantSkuInput, setVariantSkuInput] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryRecord | null>(null);

  const lowStockItems = useInventoryStore((state) => state.lowStockItems);
  const lowStockLoading = useInventoryStore((state) => state.lowStockLoading);
  const lowStockPage = useInventoryStore((state) => state.lowStockPage);
  const lowStockPageSize = useInventoryStore((state) => state.lowStockPageSize);
  const lowStockTotal = useInventoryStore((state) => state.lowStockTotal);
  const threshold = useInventoryStore((state) => state.threshold);
  const currentVariantSku = useInventoryStore((state) => state.currentVariantSku);
  const inventoryItems = useInventoryStore((state) => state.inventoryItems);
  const inventorySummary = useInventoryStore((state) => state.inventorySummary);
  const inventoryLoading = useInventoryStore((state) => state.inventoryLoading);
  const inventoryPage = useInventoryStore((state) => state.inventoryPage);
  const inventoryPageSize = useInventoryStore((state) => state.inventoryPageSize);
  const inventoryTotal = useInventoryStore((state) => state.inventoryTotal);
  const saving = useInventoryStore((state) => state.saving);
  const loadLowStockItems = useInventoryStore((state) => state.loadLowStockItems);
  const loadInventoryByVariantSku = useInventoryStore((state) => state.loadInventoryByVariantSku);
  const setCurrentVariantSku = useInventoryStore((state) => state.setCurrentVariantSku);
  const setThreshold = useInventoryStore((state) => state.setThreshold);
  const updateInventory = useInventoryStore((state) => state.updateInventory);

  useEffect(() => {
    void loadLowStockItems({ page: 1, pageSize: 10 }).catch((error) => {
      messageApi.error(getErrorMessage(error));
    });
  }, [loadLowStockItems, messageApi]);

  const handleApplyThreshold = async () => {
    try {
      setThreshold(thresholdInput);
      await loadLowStockItems({
        page: 1,
        pageSize: lowStockPageSize,
        threshold: thresholdInput,
      });
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleClearThreshold = async () => {
    setThresholdInput(undefined);
    setThreshold(undefined);
    try {
      await loadLowStockItems({
        page: 1,
        pageSize: lowStockPageSize,
        threshold: undefined,
      });
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleSearchVariantSku = async () => {
    const sku = variantSkuInput.trim();
    if (!sku) {
      messageApi.warning("Vui lòng nhập SKU biến thể.");
      return;
    }

    try {
      setCurrentVariantSku(sku);
      await loadInventoryByVariantSku(sku, {
        page: 1,
        pageSize: inventoryPageSize,
      });
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const closeModal = () => {
    setEditingItem(null);
    setIsModalOpen(false);
    form.resetFields();
  };

  const openCreateModal = () => {
    setEditingItem(null);
    form.setFieldsValue(defaultFormValues(variantSkuInput.trim() || currentVariantSku));
    setIsModalOpen(true);
  };

  const openEditModal = (item: InventoryRecord) => {
    setEditingItem(item);
    form.setFieldsValue({
      variantSku: item.variantSku,
      productId: item.productId,
      warehouseId: item.warehouseId,
      warehouseName: item.warehouseName,
      onHand: item.onHand,
      reserved: item.reserved,
      incoming: item.incoming,
      reorderPoint: item.reorderPoint ?? null,
      reorderQty: item.reorderQty ?? null,
      lowStockAlert: item.lowStockAlert,
    });
    setIsModalOpen(true);
  };

  const buildPayload = (values: InventoryFormValues): UpdateInventoryPayload => ({
    productId: values.productId?.trim() || undefined,
    warehouseId: values.warehouseId.trim(),
    warehouseName: values.warehouseName.trim(),
    onHand: values.onHand ?? 0,
    reserved: values.reserved ?? 0,
    incoming: values.incoming ?? 0,
    reorderPoint: values.reorderPoint ?? null,
    reorderQty: values.reorderQty ?? null,
    lowStockAlert: values.lowStockAlert,
  });

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const variantSku = values.variantSku.trim();

      if (!variantSku) {
        messageApi.warning("Vui lòng nhập SKU biến thể.");
        return;
      }

      const payload = buildPayload(values);
      await updateInventory(variantSku, payload);
      setVariantSkuInput(variantSku);
      messageApi.success(editingItem ? "Cập nhật tồn kho thành công." : "Tạo bản ghi tồn kho thành công.");
      closeModal();
    } catch (error) {
      if (error instanceof Error && "errorFields" in error) {
        return;
      }
      messageApi.error(getErrorMessage(error));
    }
  };

  const lowStockColumns: ColumnsType<InventoryRecord> = [
    {
      title: "SKU biến thể",
      dataIndex: "variantSku",
      key: "variantSku",
      width: 180,
    },
    {
      title: "Sản phẩm",
      key: "product",
      width: 260,
      render: (_, record) => (
        <div>
          <div>{record.product?.name ?? "-"}</div>
          <Text type="secondary">{record.product?.sku ?? record.productId}</Text>
        </div>
      ),
    },
    {
      title: "Kho",
      key: "warehouse",
      width: 220,
      render: (_, record) => (
        <div>
          <div>{record.warehouseName}</div>
          <Text type="secondary">{record.warehouseId}</Text>
        </div>
      ),
    },
    {
      title: "Khả dụng",
      dataIndex: "available",
      key: "available",
      width: 120,
      render: (value: number) => (
        <Tag color={value <= 0 ? "red" : value <= 5 ? "orange" : "green"}>{value}</Tag>
      ),
    },
    {
      title: "Mức đặt lại",
      dataIndex: "reorderPoint",
      key: "reorderPoint",
      width: 120,
      render: (value?: number | null) => value ?? "-",
    },
    {
      title: "Cảnh báo",
      dataIndex: "lowStockAlert",
      key: "lowStockAlert",
      width: 120,
      render: (value: boolean) => (
        <Tag color={value ? "red" : "default"}>{value ? "Đang cảnh báo" : "Bình thường"}</Tag>
      ),
    },
    {
      title: "Cập nhật",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 150,
      render: (value?: string) => formatDateTime(value),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 180,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openEditModal(record)}>
            Sửa
          </Button>
          <Button
            size="small"
            onClick={() => {
              setVariantSkuInput(record.variantSku);
              void loadInventoryByVariantSku(record.variantSku, { page: 1, pageSize: inventoryPageSize }).catch((error) => {
                messageApi.error(getErrorMessage(error));
              });
            }}
          >
            Xem chi tiết
          </Button>
        </Space>
      ),
    },
  ];

  const inventoryColumns: ColumnsType<InventoryRecord> = [
    {
      title: "Kho",
      key: "warehouse",
      width: 220,
      render: (_, record) => (
        <div>
          <div>{record.warehouseName}</div>
          <Text type="secondary">{record.warehouseId}</Text>
        </div>
      ),
    },
    {
      title: "Tồn kho",
      dataIndex: "onHand",
      key: "onHand",
      width: 100,
    },
    {
      title: "Đã giữ",
      dataIndex: "reserved",
      key: "reserved",
      width: 100,
    },
    {
      title: "Khả dụng",
      dataIndex: "available",
      key: "available",
      width: 110,
      render: (value: number) => <Tag color={value <= 0 ? "red" : value <= 5 ? "orange" : "green"}>{value}</Tag>,
    },
    {
      title: "Sắp về",
      dataIndex: "incoming",
      key: "incoming",
      width: 100,
    },
    {
      title: "Mức đặt lại",
      dataIndex: "reorderPoint",
      key: "reorderPoint",
      width: 120,
      render: (value?: number | null) => value ?? "-",
    },
    {
      title: "SL đặt lại",
      dataIndex: "reorderQty",
      key: "reorderQty",
      width: 120,
      render: (value?: number | null) => value ?? "-",
    },
    {
      title: "Kiểm kê gần nhất",
      dataIndex: "lastCountAt",
      key: "lastCountAt",
      width: 160,
      render: (value?: string | null) => formatDateTime(value),
    },
    {
      title: "Cập nhật",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 150,
      render: (value?: string) => formatDateTime(value),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 110,
      render: (_, record) => (
        <Button size="small" onClick={() => openEditModal(record)}>
          Sửa
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {contextHolder}

      <div>
        <Title level={3} className="mb-1! mt-0!">
          Quản lý tồn kho
        </Title>
        <Paragraph className="mb-0!" type="secondary">
          Theo dõi cảnh báo sắp hết hàng, tra cứu SKU biến thể và cập nhật tồn kho theo từng kho.
        </Paragraph>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <InputNumber
            min={0}
            value={thresholdInput}
            onChange={(value) => setThresholdInput(value ?? undefined)}
            placeholder="Ngưỡng cảnh báo (tùy chọn)"
          />
          <Button onClick={() => void handleApplyThreshold()} loading={lowStockLoading}>
            Áp dụng ngưỡng
          </Button>
          <Button onClick={() => void handleClearThreshold()} disabled={threshold === undefined}>
            Bỏ lọc ngưỡng
          </Button>
          <Text type="secondary">
            {threshold === undefined ? "Đang dùng cảnh báo tự động của hệ thống." : `Đang lọc theo ngưỡng <= ${threshold}.`}
          </Text>
        </div>

        <Table<InventoryRecord>
          rowKey="id"
          columns={lowStockColumns}
          dataSource={lowStockItems}
          loading={lowStockLoading || saving}
          scroll={{ x: 1400 }}
          pagination={{
            current: lowStockPage,
            pageSize: lowStockPageSize,
            total: lowStockTotal,
            showSizeChanger: true,
            showTotal: (value) => `Tổng ${value} bản ghi sắp hết hàng`,
          }}
          onChange={(pagination: TablePaginationConfig) => {
            const nextPage = pagination.current ?? lowStockPage;
            const nextPageSize = pagination.pageSize ?? lowStockPageSize;
            void loadLowStockItems({
              page: nextPage,
              pageSize: nextPageSize,
              threshold,
            }).catch((error) => {
              messageApi.error(getErrorMessage(error));
            });
          }}
        />
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Space wrap>
            <Input
              value={variantSkuInput}
              onChange={(event) => setVariantSkuInput(event.target.value)}
              placeholder="Nhập SKU biến thể để xem chi tiết tồn kho"
              className="min-w-[280px]"
              allowClear
            />
            <Button type="primary" onClick={() => void handleSearchVariantSku()} loading={inventoryLoading}>
              Tra cứu SKU
            </Button>
          </Space>
          <Button onClick={openCreateModal}>Thêm bản ghi tồn kho</Button>
        </div>

        {currentVariantSku ? (
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <Card size="small">
              <Statistic title="Tồn kho" value={inventorySummary.onHand} />
            </Card>
            <Card size="small">
              <Statistic title="Đã giữ" value={inventorySummary.reserved} />
            </Card>
            <Card size="small">
              <Statistic title="Khả dụng" value={inventorySummary.available} />
            </Card>
            <Card size="small">
              <Statistic title="Sắp về" value={inventorySummary.incoming} />
            </Card>
          </div>
        ) : (
          <Alert
            showIcon
            type="info"
            className="mb-4"
            message="Chưa chọn SKU biến thể"
            description="Nhập SKU và bấm Tra cứu SKU để xem tồn kho chi tiết theo kho."
          />
        )}

        <Table<InventoryRecord>
          rowKey="id"
          columns={inventoryColumns}
          dataSource={inventoryItems}
          loading={inventoryLoading || saving}
          scroll={{ x: 1400 }}
          pagination={{
            current: inventoryPage,
            pageSize: inventoryPageSize,
            total: inventoryTotal,
            showSizeChanger: true,
            showTotal: (value) => `Tổng ${value} bản ghi tồn kho`,
          }}
          onChange={(pagination: TablePaginationConfig) => {
            if (!currentVariantSku) return;
            const nextPage = pagination.current ?? inventoryPage;
            const nextPageSize = pagination.pageSize ?? inventoryPageSize;
            void loadInventoryByVariantSku(currentVariantSku, {
              page: nextPage,
              pageSize: nextPageSize,
            }).catch((error) => {
              messageApi.error(getErrorMessage(error));
            });
          }}
        />
      </Card>

      <Modal
        title={editingItem ? "Cập nhật bản ghi tồn kho" : "Thêm bản ghi tồn kho"}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={() => void handleSave()}
        okText={editingItem ? "Lưu thay đổi" : "Tạo mới"}
        cancelText="Hủy"
        confirmLoading={saving}
        width={760}
      >
        <Form form={form} layout="vertical" initialValues={defaultFormValues()}>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item
                label="SKU biến thể"
                name="variantSku"
                rules={[{ required: true, message: "Vui lòng nhập SKU biến thể." }]}
              >
                <Input placeholder="Ví dụ: RIO-MTS-001-BLK-M" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Mã sản phẩm (ObjectId)"
                name="productId"
                rules={[
                  {
                    validator: (_, value: string | undefined) => {
                      const normalized = value?.trim() ?? "";
                      if (!editingItem && !normalized) {
                        return Promise.reject(new Error("Vui lòng nhập mã sản phẩm khi tạo mới."));
                      }
                      if (normalized && !/^[0-9a-fA-F]{24}$/.test(normalized)) {
                        return Promise.reject(new Error("Mã sản phẩm phải là ObjectId hợp lệ."));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input placeholder="24 ký tự hex" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Mã kho"
                name="warehouseId"
                rules={[{ required: true, message: "Vui lòng nhập mã kho." }]}
              >
                <Input placeholder="Ví dụ: wh-hcm-01" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Tên kho"
                name="warehouseName"
                rules={[{ required: true, message: "Vui lòng nhập tên kho." }]}
              >
                <Input placeholder="Ví dụ: Kho Hồ Chí Minh" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item label="Tồn kho" name="onHand" rules={[{ required: true, message: "Nhập số lượng tồn kho." }]}>
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Đã giữ" name="reserved" rules={[{ required: true, message: "Nhập số lượng đã giữ." }]}>
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Sắp về" name="incoming" rules={[{ required: true, message: "Nhập số lượng sắp về." }]}>
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item label="Mức đặt lại" name="reorderPoint">
                <InputNumber min={0} className="w-full" placeholder="Để trống nếu không dùng" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Số lượng đặt lại" name="reorderQty">
                <InputNumber min={0} className="w-full" placeholder="Để trống nếu không dùng" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Bật cảnh báo thủ công" name="lowStockAlert" valuePropName="checked">
                <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
