import {
  Button,
  Card,
  Col,
  Form,
  Input,
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FlashSale } from "../../../services/flashSaleService";
import { productService, type Product } from "../../../services/productService";
import { subscribeAdminRealtime } from "../../../services/socketClient";
import { useFlashSaleStore } from "../../../stores/flashSaleStore";
import { useAuthStore } from "../../../stores/authStore";
import { getErrorMessage } from "../../../utils/errorMessage";
import { AdminFlashSaleSlotsField } from "./AdminFlashSaleSlotsField";
import {
  ACTIVE_FILTER_OPTIONS,
  buildPayload,
  createDefaultSlot,
  formatDateTime,
  getFlashSalePhase,
  getVariantDisplayLabel,
  toDateTimeLocalValue,
  type ActiveFilter,
  type FlashSaleFormValues,
} from "../shared/flashSales";

const { Paragraph, Text, Title } = Typography;

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
  const realtimeRefreshTimerRef = useRef<number | null>(null);

  const refreshCurrentFlashSalePage = useCallback(() => {
    void loadFlashSales({
      page,
      pageSize,
      currentOnly,
      isActiveFilter,
    }).catch((error) => {
      messageApi.error(getErrorMessage(error));
    });
  }, [currentOnly, isActiveFilter, loadFlashSales, messageApi, page, pageSize]);

  useEffect(() => {
    void loadFlashSales({ page: 1, pageSize: 10 }).catch((error) => {
      messageApi.error(getErrorMessage(error));
    });
  }, [loadFlashSales, messageApi]);

  const scheduleRealtimeRefresh = useCallback(() => {
    if (realtimeRefreshTimerRef.current) {
      window.clearTimeout(realtimeRefreshTimerRef.current);
    }

    realtimeRefreshTimerRef.current = window.setTimeout(() => {
      refreshCurrentFlashSalePage();
    }, 600);
  }, [refreshCurrentFlashSalePage]);

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
      onFlashSaleUpdated: () => {
        scheduleRealtimeRefresh();
      },
    });

    return () => {
      unsubscribe();
    };
  }, [scheduleRealtimeRefresh]);

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
    const running = flashSales.filter((item) => getFlashSalePhase(item).label === "Äang diá»…n ra").length;
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
      messageApi.error("Chá»‰ há»— trá»£ táº£i lÃªn file áº£nh.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      messageApi.error("áº¢nh banner tá»‘i Ä‘a 5MB.");
      return;
    }

    setBannerUploading(true);
    try {
      const url = await productService.uploadProductImage(file);
      form.setFieldValue("banner", url);
      messageApi.success("Táº£i áº£nh banner thÃ nh cÃ´ng.");
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
        messageApi.success("Cáº­p nháº­t chÆ°Æ¡ng trÃ¬nh giáº£m giÃ¡ chá»›p nhoÃ¡ng thÃ nh cÃ´ng.");
      } else {
        await createFlashSale(payload);
        messageApi.success("Táº¡o chÆ°Æ¡ng trÃ¬nh giáº£m giÃ¡ chá»›p nhoÃ¡ng thÃ nh cÃ´ng.");
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
      messageApi.success("ÄÃ£ xÃ³a chÆ°Æ¡ng trÃ¬nh giáº£m giÃ¡ chá»›p nhoÃ¡ng.");
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const columns: ColumnsType<FlashSale> = [
    {
      title: "TÃªn chÆ°Æ¡ng trÃ¬nh",
      dataIndex: "name",
      key: "name",
      width: 250,
    },
    {
      title: "Thá»i gian",
      key: "period",
      width: 260,
      render: (_, record) => (
        <div>
          <div>Báº¯t Ä‘áº§u: {formatDateTime(record.startsAt)}</div>
          <Text type="secondary">Káº¿t thÃºc: {formatDateTime(record.endsAt)}</Text>
        </div>
      ),
    },
    {
      title: "Tráº¡ng thÃ¡i kÃ­ch hoáº¡t",
      key: "active",
      width: 150,
      render: (_, record) => <Tag color={record.isActive ? "green" : "default"}>{record.isActive ? "Äang báº­t" : "Äang táº¯t"}</Tag>,
    },
    {
      title: "Pha khuyáº¿n mÃ£i",
      key: "phase",
      width: 140,
      render: (_, record) => {
        const phase = getFlashSalePhase(record);
        return <Tag color={phase.color}>{phase.label}</Tag>;
      },
    },
    {
      title: "Sá»‘ slot",
      key: "slots",
      width: 100,
      render: (_, record) => record.slots.length,
    },
    {
      title: "ÄÃ£ bÃ¡n/Tá»“n slot",
      key: "sold",
      width: 160,
      render: (_, record) => {
        const sold = record.slots.reduce((sum, slot) => sum + slot.sold, 0);
        const stockLimit = record.slots.reduce((sum, slot) => sum + slot.stockLimit, 0);
        return `${sold}/${stockLimit}`;
      },
    },
    {
      title: "Táº¡o lÃºc",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (value?: string) => formatDateTime(value),
    },
    {
      title: "Thao tÃ¡c",
      key: "actions",
      fixed: "right",
      width: 190,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" onClick={() => openEditModal(record)}>
            Sá»­a
          </Button>
          <Popconfirm
            title="XÃ³a chÆ°Æ¡ng trÃ¬nh nÃ y?"
            description="HÃ nh Ä‘á»™ng nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c."
            okText="XÃ³a"
            cancelText="Há»§y"
            onConfirm={() => void handleDelete(record)}
          >
            <Button size="small" danger>
              XÃ³a
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
          Quáº£n lÃ½ Flash Sales
        </Title>
        <Paragraph className="mb-0!" type="secondary">
          Theo dÃµi chiáº¿n dá»‹ch Flash Sales, lá»c theo tráº¡ng thÃ¡i vÃ  táº¡o chÆ°Æ¡ng trÃ¬nh má»›i.
        </Paragraph>
      </div>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}>
          <Card>
            <Text type="secondary">Äang báº­t (trang hiá»‡n táº¡i)</Text>
            <Title level={3} className="mb-0! mt-1!">
              {summary.active}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Text type="secondary">Äang diá»…n ra (trang hiá»‡n táº¡i)</Text>
            <Title level={3} className="mb-0! mt-1! text-emerald-600!">
              {summary.running}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Text type="secondary">Tá»•ng slot (trang hiá»‡n táº¡i)</Text>
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
              <Text>Chá»‰ Ä‘ang diá»…n ra</Text>
              <Switch
                checked={currentOnly}
                checkedChildren="Báº­t"
                unCheckedChildren="Táº¯t"
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
            Táº¡o chÆ°Æ¡ng trÃ¬nh má»›i
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
            showTotal: (value) => `Tá»•ng ${value} chiáº¿n dá»‹ch giáº£m giÃ¡ chá»›p nhoÃ¡ng`,
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
        title={editingFlashSale ? "Cáº­p nháº­t chÆ°Æ¡ng trÃ¬nh giáº£m giÃ¡ chá»›p nhoÃ¡ng" : "Táº¡o chÆ°Æ¡ng trÃ¬nh giáº£m giÃ¡ chá»›p nhoÃ¡ng"}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingFlashSale(null);
          form.resetFields();
        }}
        onOk={() => void handleSubmitModal()}
        okText={editingFlashSale ? "LÆ°u thay Ä‘á»•i" : "Táº¡o má»›i"}
        cancelText="Há»§y"
        confirmLoading={saving}
        width={780}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="TÃªn chÆ°Æ¡ng trÃ¬nh"
            name="name"
            rules={[
              { required: true, message: "Vui lÃ²ng nháº­p tÃªn chÆ°Æ¡ng trÃ¬nh." },
              { min: 2, message: "TÃªn chÆ°Æ¡ng trÃ¬nh tá»‘i thiá»ƒu 2 kÃ½ tá»±." },
            ]}
          >
            <Input placeholder="VÃ­ dá»¥: Flash Sale Cuá»‘i Tuáº§n" />
          </Form.Item>

          <Form.Item label="Banner chÆ°Æ¡ng trÃ¬nh">
            <Space direction="vertical" className="w-full">
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => {
                  void uploadBannerFile(file as File);
                  return false;
                }}
              >
                <Button loading={bannerUploading}>Táº£i áº£nh banner</Button>
              </Upload>

              {bannerValue ? (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <img src={bannerValue} alt="Banner flash sale" className="h-44 w-full object-cover" />
                </div>
              ) : (
                <Text type="secondary">ChÆ°a cÃ³ banner. Báº¡n cÃ³ thá»ƒ táº£i áº£nh lÃªn tá»« mÃ¡y tÃ­nh.</Text>
              )}

              {bannerValue ? (
                <Button
                  danger
                  size="small"
                  className="w-fit"
                  onClick={() => form.setFieldValue("banner", "")}
                >
                  Gá»¡ banner
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
                label="Báº¯t Ä‘áº§u"
                name="startsAt"
                rules={[{ required: true, message: "Vui lÃ²ng nháº­p thá»i gian báº¯t Ä‘áº§u." }]}
              >
                <Input type="datetime-local" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Káº¿t thÃºc"
                name="endsAt"
                rules={[{ required: true, message: "Vui lÃ²ng nháº­p thá»i gian káº¿t thÃºc." }]}
              >
                <Input type="datetime-local" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="KÃ­ch hoáº¡t ngay" name="isActive" valuePropName="checked">
            <Switch checkedChildren="Báº­t" unCheckedChildren="Táº¯t" />
          </Form.Item>

          <AdminFlashSaleSlotsField
            form={form}
            productById={productById}
            productLoading={productLoading}
            productSelectOptions={productSelectOptions}
            getVariantOptionsByProductId={getVariantOptionsByProductId}
            handleSlotProductChange={handleSlotProductChange}
          />
        </Form>
      </Modal>
    </div>
  );
}





