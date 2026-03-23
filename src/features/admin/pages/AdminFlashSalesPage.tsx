import { AxiosError } from "axios";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import type { CreateFlashSalePayload, FlashSale } from "../../../services/flashSaleService";
import { productService, type Product, type ProductVariant } from "../../../services/productService";
import { useFlashSaleStore } from "../../../stores/flashSaleStore";
import { useAuthStore } from "../../../stores/authStore";

const { Paragraph, Text, Title } = Typography;

type FlashSaleFormValues = {
  name: string;
  banner?: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  slots: Array<{
    productId: string;
    variantSku?: string;
    salePrice?: number;
    stockLimit?: number;
    sold?: number;
  }>;
};

type ActiveFilter = "all" | "active" | "inactive";

const ACTIVE_FILTER_OPTIONS: { value: ActiveFilter; label: string }[] = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "active", label: "Đang bật" },
  { value: "inactive", label: "Đang tắt" },
];

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

const createDefaultSlot = () => ({
  productId: "",
  variantSku: undefined as string | undefined,
  salePrice: 199000,
  stockLimit: 100,
  sold: 0,
});

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

const buildPayload = (
  values: FlashSaleFormValues,
  adminId?: string,
): CreateFlashSalePayload => {
  const normalizedSlots = (values.slots || []).map((slot, index) => {
    const productId = slot.productId?.trim() || "";
    const variantSku = slot.variantSku?.trim() || undefined;
    const salePrice = Number(slot.salePrice);
    const stockLimit = Number(slot.stockLimit);
    const sold = Number(slot.sold ?? 0);

    if (!OBJECT_ID_PATTERN.test(productId)) {
      throw new Error(`Dòng ${index + 1}: sản phẩm chưa hợp lệ.`);
    }
    if (!Number.isFinite(salePrice) || salePrice < 0) {
      throw new Error(`Dòng ${index + 1}: giá flash sale chưa hợp lệ.`);
    }
    if (!Number.isFinite(stockLimit) || stockLimit < 0) {
      throw new Error(`Dòng ${index + 1}: số lượng giới hạn chưa hợp lệ.`);
    }
    if (!Number.isFinite(sold) || sold < 0) {
      throw new Error(`Dòng ${index + 1}: số lượng đã bán chưa hợp lệ.`);
    }
    if (sold > stockLimit) {
      throw new Error(`Dòng ${index + 1}: số lượng đã bán không thể lớn hơn giới hạn.`);
    }

    return {
      productId,
      variantSku,
      salePrice,
      stockLimit,
      sold,
    };
  });

  if (normalizedSlots.length === 0) {
    throw new Error("Vui lòng thêm ít nhất 1 slot flash sale.");
  }

  return {
    name: values.name.trim(),
    banner: values.banner?.trim() || null,
    startsAt: new Date(values.startsAt).toISOString(),
    endsAt: new Date(values.endsAt).toISOString(),
    isActive: values.isActive,
    createdBy: adminId,
    slots: normalizedSlots,
  };
};

const toDateTimeLocalValue = (value?: string) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const getVariantDisplayLabel = (variant: ProductVariant) => {
  const color = variant.color?.name?.trim() || "Mặc định";
  const size = variant.sizeLabel?.trim() || variant.size?.trim() || "Free";
  const stock = Math.max(0, Number(variant.stock || 0));
  return `${variant.sku} • ${color} / ${size} • Tồn ${stock}`;
};

export function AdminFlashSalesPage() {
  const [form] = Form.useForm<FlashSaleFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFlashSale, setEditingFlashSale] = useState<FlashSale | null>(null);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [bannerUploading, setBannerUploading] = useState(false);
  const [productCatalog, setProductCatalog] = useState<Product[]>([]);
  const [productLoading, setProductLoading] = useState(false);
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
  const updateFlashSale = useFlashSaleStore((state) => state.updateFlashSale);
  const deleteFlashSale = useFlashSaleStore((state) => state.deleteFlashSale);

  useEffect(() => {
    void loadFlashSales({ page: 1, pageSize: 10 }).catch((error) => {
      messageApi.error(getErrorMessage(error));
    });
  }, [loadFlashSales, messageApi]);

  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      setProductLoading(true);
      try {
        const result = await productService.getProducts({
          page: 1,
          limit: 200,
          status: "active",
          sort: { createdAt: -1 },
        });

        if (!active) {
          return;
        }

        setProductCatalog(result.docs || []);
      } catch {
        if (active) {
          setProductCatalog([]);
        }
      } finally {
        if (active) {
          setProductLoading(false);
        }
      }
    };

    void loadProducts();

    return () => {
      active = false;
    };
  }, []);

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    productCatalog.forEach((item) => {
      map.set(item._id, item);
    });
    return map;
  }, [productCatalog]);

  const productSelectOptions = useMemo(
    () =>
      productCatalog.map((item) => ({
        label: `${item.name} (${item.sku})`,
        value: item._id,
      })),
    [productCatalog],
  );
  const bannerValue = Form.useWatch("banner", form) as string | undefined;

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

  const getVariantOptionsByProductId = (productId?: string) => {
    const product = productById.get((productId || "").trim());
    if (!product) {
      return [];
    }

    return (product.variants || [])
      .filter((variant) => variant.isActive !== false && variant.sku?.trim())
      .map((variant) => ({
        label: getVariantDisplayLabel(variant),
        value: variant.sku.trim(),
      }));
  };

  const handleSlotProductChange = (rowIndex: number | string, productId: string) => {
    const normalizedIndex = Number(rowIndex);
    if (!Number.isInteger(normalizedIndex) || normalizedIndex < 0) {
      return;
    }

    const allSlots = (form.getFieldValue("slots") || []) as FlashSaleFormValues["slots"];
    const nextSlots = [...allSlots];
    const currentSlot = { ...(nextSlots[normalizedIndex] || createDefaultSlot()) };
    const selectedProduct = productById.get(productId);
    const availableVariants = (selectedProduct?.variants || []).filter(
      (variant) => variant.isActive !== false && variant.sku?.trim(),
    );

    currentSlot.productId = productId;

    if (
      currentSlot.variantSku &&
      !availableVariants.some((variant) => variant.sku?.trim() === currentSlot.variantSku)
    ) {
      currentSlot.variantSku = undefined;
    }

    const priceValue = Number(currentSlot.salePrice);
    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      currentSlot.salePrice = Math.max(0, Number(selectedProduct?.pricing.salePrice || 0));
    }

    const stockLimit = Number(currentSlot.stockLimit);
    if (!Number.isFinite(stockLimit) || stockLimit <= 0) {
      const defaultStock = Math.max(
        0,
        (selectedProduct?.variants || []).reduce(
          (sum, variant) => sum + Math.max(0, Number(variant.stock || 0)),
          0,
        ),
      );
      currentSlot.stockLimit = defaultStock || 100;
    }

    if (!Number.isFinite(Number(currentSlot.sold))) {
      currentSlot.sold = 0;
    }

    nextSlots[normalizedIndex] = currentSlot;
    form.setFieldsValue({ slots: nextSlots });
  };

  const uploadBannerFile = async (file: File) => {
    if (!file.type?.startsWith("image/")) {
      messageApi.error("Chỉ hỗ trợ tải lên file ảnh.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      messageApi.error("Ảnh banner tối đa 5MB.");
      return;
    }

    setBannerUploading(true);
    try {
      const url = await productService.uploadProductImage(file);
      form.setFieldValue("banner", url);
      messageApi.success("Tải ảnh banner thành công.");
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    } finally {
      setBannerUploading(false);
    }
  };

  const openCreateModal = () => {
    setEditingFlashSale(null);
    form.setFieldsValue({
      name: "",
      banner: "",
      startsAt: "",
      endsAt: "",
      isActive: true,
      slots: [createDefaultSlot()],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (sale: FlashSale) => {
    setEditingFlashSale(sale);
    form.setFieldsValue({
      name: sale.name,
      banner: sale.banner || "",
      startsAt: toDateTimeLocalValue(sale.startsAt),
      endsAt: toDateTimeLocalValue(sale.endsAt),
      isActive: sale.isActive,
      slots:
        sale.slots.length > 0
          ? sale.slots.map((slot) => ({
              productId: slot.productId,
              variantSku: slot.variantSku || undefined,
              salePrice: slot.salePrice,
              stockLimit: slot.stockLimit,
              sold: slot.sold,
            }))
          : [createDefaultSlot()],
    });
    setIsModalOpen(true);
  };

  const handleSubmitModal = async () => {
    try {
      const values = await form.validateFields();
      const payload = buildPayload(values, currentUser?.id);
      if (editingFlashSale) {
        const { createdBy, ...updatePayload } = payload;
        void createdBy;
        await updateFlashSale(editingFlashSale.id, updatePayload);
        messageApi.success("Cập nhật chương trình giảm giá chớp nhoáng thành công.");
      } else {
        await createFlashSale(payload);
        messageApi.success("Tạo chương trình giảm giá chớp nhoáng thành công.");
      }
      setIsModalOpen(false);
      setEditingFlashSale(null);
      form.resetFields();
    } catch (error) {
      if (error instanceof Error && "errorFields" in error) {
        return;
      }
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleDelete = async (sale: FlashSale) => {
    try {
      await deleteFlashSale(sale.id);
      messageApi.success("Đã xóa chương trình giảm giá chớp nhoáng.");
    } catch (error) {
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
    {
      title: "Thao tác",
      key: "actions",
      fixed: "right",
      width: 190,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" onClick={() => openEditModal(record)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa chương trình này?"
            description="Hành động này không thể hoàn tác."
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => void handleDelete(record)}
          >
            <Button size="small" danger>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {contextHolder}

      <div>
        <Title level={3} className="mb-1! mt-0!">
          Quản lý Flash Sales
        </Title>
        <Paragraph className="mb-0!" type="secondary">
          Theo dõi chiến dịch Flash Sales, lọc theo trạng thái và tạo chương trình mới.
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
              className="min-w-50"
              disabled={loading || saving}
            />
          </Space>
          <Button type="primary" onClick={openCreateModal}>
            Tạo chương trình mới
          </Button>
        </div>

        <Table<FlashSale>
          rowKey="id"
          columns={columns}
          dataSource={flashSales}
          loading={loading || saving}
          scroll={{ x: 1450 }}
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
        title={editingFlashSale ? "Cập nhật chương trình giảm giá chớp nhoáng" : "Tạo chương trình giảm giá chớp nhoáng"}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingFlashSale(null);
          form.resetFields();
        }}
        onOk={() => void handleSubmitModal()}
        okText={editingFlashSale ? "Lưu thay đổi" : "Tạo mới"}
        cancelText="Hủy"
        confirmLoading={saving}
        width={780}
      >
        <Form form={form} layout="vertical">
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

          <Form.Item label="Banner chương trình">
            <Space direction="vertical" className="w-full">
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => {
                  void uploadBannerFile(file as File);
                  return false;
                }}
              >
                <Button loading={bannerUploading}>Tải ảnh banner</Button>
              </Upload>

              {bannerValue ? (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <img src={bannerValue} alt="Banner flash sale" className="h-44 w-full object-cover" />
                </div>
              ) : (
                <Text type="secondary">Chưa có banner. Bạn có thể tải ảnh lên từ máy tính.</Text>
              )}

              {bannerValue ? (
                <Button
                  danger
                  size="small"
                  className="w-fit"
                  onClick={() => form.setFieldValue("banner", "")}
                >
                  Gỡ banner
                </Button>
              ) : null}
            </Space>
          </Form.Item>
          <Form.Item name="banner" hidden>
            <Input />
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

          <Form.List
            name="slots"
            rules={[
              {
                validator: async (_, value) => {
                  if (!value || value.length < 1) {
                    throw new Error("Vui lòng thêm ít nhất 1 slot.");
                  }
                },
              },
            ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Text strong>Danh sách slot flash sale</Text>
                  <Button type="dashed" onClick={() => add(createDefaultSlot())}>
                    Thêm slot
                  </Button>
                </div>

                {fields.map((field, index) => {
                  const selectedProductId = form.getFieldValue(["slots", field.name, "productId"]) as string | undefined;
                  const variantOptions = getVariantOptionsByProductId(selectedProductId);
                  const selectedProduct = productById.get((selectedProductId || "").trim());

                  return (
                    <Card key={field.key} size="small" className="border-slate-200">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <Text strong>Slot #{index + 1}</Text>
                        <Button danger size="small" onClick={() => remove(field.name)}>
                          Xóa slot
                        </Button>
                      </div>

                      <Row gutter={[12, 12]}>
                        <Col xs={24} md={14}>
                          <Form.Item
                            label="Sản phẩm"
                            name={[field.name, "productId"]}
                            rules={[
                              { required: true, message: "Vui lòng chọn sản phẩm." },
                              {
                                pattern: OBJECT_ID_PATTERN,
                                message: "productId không hợp lệ.",
                              },
                            ]}
                          >
                            <Select
                              showSearch
                              loading={productLoading}
                              placeholder="Chọn sản phẩm"
                              options={productSelectOptions}
                              optionFilterProp="label"
                              onChange={(value) => handleSlotProductChange(field.name, value)}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={10}>
                          <Form.Item label="Biến thể (SKU)" name={[field.name, "variantSku"]}>
                            <Select
                              showSearch
                              allowClear
                              placeholder={
                                selectedProduct
                                  ? variantOptions.length > 0
                                    ? "Chọn SKU biến thể"
                                    : "Sản phẩm không có biến thể"
                                  : "Chọn sản phẩm trước"
                              }
                              options={variantOptions}
                              optionFilterProp="label"
                              disabled={!selectedProduct}
                            />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item
                            label="Giá flash sale"
                            name={[field.name, "salePrice"]}
                            rules={[{ required: true, message: "Nhập giá flash sale." }]}
                          >
                            <InputNumber min={0} step={1000} className="w-full" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                          <Form.Item
                            label="Giới hạn bán"
                            name={[field.name, "stockLimit"]}
                            rules={[{ required: true, message: "Nhập giới hạn bán." }]}
                          >
                            <InputNumber min={0} className="w-full" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                          <Form.Item
                            label="Đã bán"
                            name={[field.name, "sold"]}
                            rules={[{ required: true, message: "Nhập số lượng đã bán." }]}
                          >
                            <InputNumber min={0} className="w-full" />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Text type="secondary">
                        Giá gốc hiện tại:{" "}
                        {selectedProduct ? Number(selectedProduct.pricing.salePrice || 0).toLocaleString("vi-VN") : 0}đ
                      </Text>
                    </Card>
                  );
                })}

                <Form.ErrorList errors={errors} />
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}
