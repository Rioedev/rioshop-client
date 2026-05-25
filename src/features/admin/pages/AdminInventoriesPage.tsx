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
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useCallback, useEffect, useRef, useState } from "react";
import type { InventoryRecord, UpdateInventoryPayload } from "../../../services/inventoryService";
import { productService, type Product } from "../../../services/productService";
import { subscribeAdminRealtime } from "../../../services/socketClient";
import { useInventoryStore } from "../../../stores/inventoryStore";
import { getErrorMessage } from "../../../utils/errorMessage";

const { Paragraph, Text, Title } = Typography;

type InventoryFormValues = {
  variantSku: string;
  productId?: string;
  onHand: number;
  restockQuantity?: number;
  reserved: number;
  incoming: number;
  reorderPoint?: number | null;
  reorderQty?: number | null;
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
  onHand: 0,
  restockQuantity: 0,
  reserved: 0,
  incoming: 0,
  reorderPoint: null,
  reorderQty: null,
});

export function AdminInventoriesPage() {
  const [form] = Form.useForm<InventoryFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [thresholdInput, setThresholdInput] = useState<number | undefined>(undefined);
  const [variantSkuInput, setVariantSkuInput] = useState("");
  const [bulkProductOptions, setBulkProductOptions] = useState<Product[]>([]);
  const [bulkProductId, setBulkProductId] = useState<string | undefined>(undefined);
  const [bulkReorderPoint, setBulkReorderPoint] = useState<number | null>(5);
  const [bulkReorderQty, setBulkReorderQty] = useState<number | null>(20);
  const [bulkProductLoading, setBulkProductLoading] = useState(false);
  const [bulkApplying, setBulkApplying] = useState(false);
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
  const updateInventoryRulesByProduct = useInventoryStore((state) => state.updateInventoryRulesByProduct);
  const realtimeRefreshTimerRef = useRef<number | null>(null);
  const watchedOnHand = Form.useWatch("onHand", form);
  const watchedRestockQuantity = Form.useWatch("restockQuantity", form);
  const restockPreviewOnHand =
    Number(watchedOnHand || 0) + Math.max(0, Number(watchedRestockQuantity || 0));

  const handleSearchBulkProducts = async (keyword: string) => {
    const query = keyword.trim();
    setBulkProductLoading(true);
    try {
      const result = query
        ? await productService.searchProducts(query, 1, 12, "all")
        : await productService.getProducts({ page: 1, limit: 12, status: "all" });
      setBulkProductOptions(result.docs);
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không thể tải danh sách sản phẩm."));
    } finally {
      setBulkProductLoading(false);
    }
  };

  const refreshCurrentInventoryView = useCallback(() => {
    void loadLowStockItems({
      page: lowStockPage,
      pageSize: lowStockPageSize,
      threshold,
    }).catch((error) => {
      messageApi.error(getErrorMessage(error));
    });

    const normalizedSku = currentVariantSku.trim();
    if (!normalizedSku) {
      return;
    }

    void loadInventoryByVariantSku(normalizedSku, {
      page: inventoryPage,
      pageSize: inventoryPageSize,
    }).catch((error) => {
      messageApi.error(getErrorMessage(error));
    });
  }, [
    currentVariantSku,
    inventoryPage,
    inventoryPageSize,
    loadInventoryByVariantSku,
    loadLowStockItems,
    lowStockPage,
    lowStockPageSize,
    messageApi,
    threshold,
  ]);

  useEffect(() => {
    void loadLowStockItems({ page: 1, pageSize: 10 }).catch((error) => {
      messageApi.error(getErrorMessage(error));
    });
  }, [loadLowStockItems, messageApi]);

  const scheduleRealtimeRefresh = useCallback(() => {
    if (realtimeRefreshTimerRef.current) {
      window.clearTimeout(realtimeRefreshTimerRef.current);
    }

    realtimeRefreshTimerRef.current = window.setTimeout(() => {
      refreshCurrentInventoryView();
    }, 600);
  }, [refreshCurrentInventoryView]);

  useEffect(
    () => () => {
      if (realtimeRefreshTimerRef.current) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const unsubscribe = subscribeAdminRealtime({
      onInventoryUpdated: () => {
        scheduleRealtimeRefresh();
      },
    });

    return () => {
      unsubscribe();
    };
  }, [scheduleRealtimeRefresh]);

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

  const handleApplyProductInventoryRules = async () => {
    if (!bulkProductId) {
      messageApi.warning("Vui lòng chọn sản phẩm.");
      return;
    }

    if (bulkReorderPoint === null && bulkReorderQty === null) {
      messageApi.warning("Vui lòng nhập ít nhất một giá trị để áp dụng.");
      return;
    }

    setBulkApplying(true);
    try {
      const result = await updateInventoryRulesByProduct(bulkProductId, {
        reorderPoint: bulkReorderPoint,
        reorderQty: bulkReorderQty,
      });
      messageApi.success(`Đã áp dụng cho ${result.updatedCount} biến thể của sản phẩm.`);
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không thể áp dụng cảnh báo tồn kho."));
    } finally {
      setBulkApplying(false);
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
      onHand: item.onHand,
      restockQuantity: 0,
      reserved: item.reserved,
      incoming: item.incoming,
      reorderPoint: item.reorderPoint ?? null,
      reorderQty: item.reorderQty ?? null,
    });
    setIsModalOpen(true);
  };

  const buildPayload = (values: InventoryFormValues): UpdateInventoryPayload => {
    const nextOnHand = Math.max(0, Number(values.onHand ?? 0) + Math.max(0, Number(values.restockQuantity ?? 0)));

    return {
      productId: values.productId?.trim() || undefined,
      onHand: nextOnHand,
      reserved: values.reserved ?? 0,
      incoming: values.incoming ?? 0,
      reorderPoint: values.reorderPoint ?? null,
      reorderQty: values.reorderQty ?? null,
    };
  };

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
          <div>{record.product?.name ?? "Sản phẩm không tồn tại"}</div>
          <Text type="secondary">{record.product?.sku ?? record.productId ?? "-"}</Text>
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
      title: "Ngưỡng cảnh báo",
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
      render: (_, record) => {
        const isLowStock =
          record.reorderPoint !== undefined &&
          record.reorderPoint !== null &&
          record.available <= record.reorderPoint;
        return <Tag color={isLowStock ? "red" : "default"}>{isLowStock ? "Đang cảnh báo" : "Bình thường"}</Tag>;
      },
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
      title: "Ngưỡng cảnh báo",
      dataIndex: "reorderPoint",
      key: "reorderPoint",
      width: 120,
      render: (value?: number | null) => value ?? "-",
    },
    {
      title: "SL nhập gợi ý",
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
    <div className="space-y-6">
      {contextHolder}

      <div>
        <Title level={3} className="mb-1! mt-0!">
          Quản lý tồn kho
        </Title>
        <Paragraph className="mb-0!" type="secondary">
          Theo dõi cảnh báo sắp hết hàng, tra cứu SKU biến thể và cập nhật tồn kho theo kho mặc định.
        </Paragraph>
      </div>

      <div className="grid gap-6">
        <Card>
          <div className="mb-4">
            <Title level={5} className="mb-1! mt-0!">
              Áp dụng cảnh báo theo sản phẩm
            </Title>
            <Paragraph className="mb-0!" type="secondary">
              Thiết lập ngưỡng cảnh báo và số lượng nhập gợi ý cho toàn bộ biến thể của một sản phẩm.
            </Paragraph>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[280px] flex-1">
              <Text className="mb-1 block">Sản phẩm</Text>
              <Select
                showSearch
                allowClear
                className="w-full"
                placeholder="Tìm theo tên hoặc SKU sản phẩm"
                value={bulkProductId}
                loading={bulkProductLoading}
                filterOption={false}
                onFocus={() => {
                  if (bulkProductOptions.length === 0) {
                    void handleSearchBulkProducts("");
                  }
                }}
                onSearch={(value) => void handleSearchBulkProducts(value)}
                onChange={(value) => setBulkProductId(value)}
                options={bulkProductOptions.map((product) => ({
                  value: product._id,
                  label: `${product.name} • ${product.sku} • ${product.variants?.length ?? 0} biến thể`,
                }))}
              />
            </div>
            <div>
              <Text className="mb-1 block">Ngưỡng cảnh báo</Text>
              <InputNumber
                min={0}
                value={bulkReorderPoint}
                onChange={(value) => setBulkReorderPoint(value ?? null)}
                placeholder="VD: 5"
              />
            </div>
            <div>
              <Text className="mb-1 block">SL nhập gợi ý</Text>
              <InputNumber
                min={0}
                value={bulkReorderQty}
                onChange={(value) => setBulkReorderQty(value ?? null)}
                placeholder="VD: 20"
              />
            </div>
            <Button
              type="primary"
              loading={bulkApplying || saving}
              onClick={() => void handleApplyProductInventoryRules()}
            >
              Áp dụng cho sản phẩm
            </Button>
          </div>
        </Card>

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
              description="Nhập SKU và bấm Tra cứu SKU để xem tồn kho chi tiết."
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
      </div>

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

          <Alert
            type="info"
            showIcon
            className="mb-4"
            message="Hệ thống đang chạy chế độ 1 kho"
            description="Kho mặc định: Phú Diễn, Bắc Từ Liêm, Hà Nội."
          />

          <Row gutter={12}>
            <Col xs={24} md={editingItem ? 6 : 8}>
              <Form.Item label="Tồn kho" name="onHand" rules={[{ required: true, message: "Nhập số lượng tồn kho." }]}>
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
            {editingItem ? (
              <Col xs={24} md={6}>
                <Form.Item label="Nhập thêm hàng" name="restockQuantity">
                  <InputNumber min={0} className="w-full" placeholder="VD: 10" />
                </Form.Item>
              </Col>
            ) : null}
            <Col xs={24} md={editingItem ? 6 : 8}>
              <Form.Item label="Đã giữ" name="reserved" rules={[{ required: true, message: "Nhập số lượng đã giữ." }]}>
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
            <Col xs={24} md={editingItem ? 6 : 8}>
              <Form.Item label="Sắp về" name="incoming" rules={[{ required: true, message: "Nhập số lượng sắp về." }]}>
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          {editingItem && Number(watchedRestockQuantity || 0) > 0 ? (
            <Alert
              type="success"
              showIcon
              className="mb-4"
              message={`Sau khi lưu, tồn kho sẽ là ${restockPreviewOnHand}.`}
              description="Số lượng nhập thêm chỉ cộng vào Tồn kho, không làm thay đổi số lượng Đã giữ."
            />
          ) : null}

          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item label="Ngưỡng cảnh báo" name="reorderPoint">
                <InputNumber min={0} className="w-full" placeholder="Để trống nếu không dùng" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="SL nhập gợi ý" name="reorderQty">
                <InputNumber min={0} className="w-full" placeholder="Gợi ý khi cần nhập thêm" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}


