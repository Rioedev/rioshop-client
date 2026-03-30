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
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import type {
  Coupon,
  CouponSource,
  CouponType,
  CouponUpsertPayload,
  ValidateCouponPayload,
} from "../../../services/couponService";
import { useCouponStore } from "../../../stores/couponStore";
import { getErrorMessage } from "../../../utils/errorMessage";

const { Paragraph, Text, Title } = Typography;

type ValidateFormValues = {
  code: string;
  orderValue: number;
  shippingFee?: number;
  brandNamesText?: string;
};

type CouponFormValues = {
  code: string;
  name: string;
  description?: string;
  type: CouponType;
  value: number;
  maxDiscount?: number | null;
  minOrderValue?: number | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  isActive: boolean;
  startsAt: string;
  expiresAt: string;
  source?: CouponSource;
};

const COUPON_TYPE_LABEL: Record<CouponType, string> = {
  percent: "Gi?m theo ph?n tram",
  fixed: "Gi?m ti?n c? d?nh",
  free_ship: "Mi?n ph� v?n chuy?n",
  gift: "Qu� t?ng",
};

const COUPON_TYPE_OPTIONS: { value: CouponType | "all"; label: string }[] = [
  { value: "all", label: "T?t c? lo?i" },
  { value: "percent", label: COUPON_TYPE_LABEL.percent },
  { value: "fixed", label: COUPON_TYPE_LABEL.fixed },
  { value: "free_ship", label: COUPON_TYPE_LABEL.free_ship },
  { value: "gift", label: COUPON_TYPE_LABEL.gift },
];

const COUPON_FORM_TYPE_OPTIONS: { value: CouponType; label: string }[] = [
  { value: "percent", label: COUPON_TYPE_LABEL.percent },
  { value: "fixed", label: COUPON_TYPE_LABEL.fixed },
  { value: "free_ship", label: COUPON_TYPE_LABEL.free_ship },
  { value: "gift", label: COUPON_TYPE_LABEL.gift },
];

const SOURCE_OPTIONS: { value: CouponSource; label: string }[] = [
  { value: "campaign", label: "Campaign" },
  { value: "manual", label: "Manual" },
  { value: "referral", label: "Referral" },
  { value: "birthday", label: "Birthday" },
];

const ACTIVE_FILTER_OPTIONS: { value: "all" | "active" | "inactive"; label: string }[] = [
  { value: "all", label: "T?t c? tr?ng th�i" },
  { value: "active", label: "�ang b?t" },
  { value: "inactive", label: "�ang t?t" },
];

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const formatCurrency = new Intl.NumberFormat("vi-VN");

const splitCsv = (raw?: string) =>
  (raw ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const toLocalDateTimeInput = (isoValue?: string) => {
  if (!isoValue) return "";
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
};

const toIsoDateTime = (localInput?: string) => {
  if (!localInput) return "";
  const date = new Date(localInput);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
};

const buildDefaultCouponFormValues = (): CouponFormValues => {
  const now = new Date();
  const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return {
    code: "",
    name: "",
    description: "",
    type: "percent",
    value: 0,
    maxDiscount: null,
    minOrderValue: null,
    usageLimit: null,
    perUserLimit: 1,
    isActive: true,
    startsAt: toLocalDateTimeInput(now.toISOString()),
    expiresAt: toLocalDateTimeInput(nextDay.toISOString()),
    source: undefined,
  };
};

const getCouponStatus = (coupon: Coupon) => {
  const now = Date.now();
  const startsAt = new Date(coupon.startsAt).getTime();
  const expiresAt = new Date(coupon.expiresAt).getTime();

  if (Number.isNaN(startsAt) || Number.isNaN(expiresAt)) {
    return { label: "Kh�ng x�c d?nh", color: "default" as const };
  }

  if (!coupon.isActive) {
    return { label: "�ang t?t", color: "default" as const };
  }

  if (startsAt > now) {
    return { label: "Chua b?t d?u", color: "gold" as const };
  }

  if (expiresAt < now) {
    return { label: "�� h?t h?n", color: "red" as const };
  }

  return { label: "�ang hi?u l?c", color: "green" as const };
};

const renderCouponValue = (coupon: Coupon) => {
  if (coupon.type === "percent") {
    return `${coupon.value}%`;
  }
  return `${formatCurrency.format(coupon.value)} VND`;
};

export function AdminCouponsPage() {
  const [validateForm] = Form.useForm<ValidateFormValues>();
  const [couponForm] = Form.useForm<CouponFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [keywordInput, setKeywordInput] = useState("");
  const [lookupCode, setLookupCode] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  const coupons = useCouponStore((state) => state.coupons);
  const loading = useCouponStore((state) => state.loading);
  const saving = useCouponStore((state) => state.saving);
  const page = useCouponStore((state) => state.page);
  const pageSize = useCouponStore((state) => state.pageSize);
  const total = useCouponStore((state) => state.total);
  const keyword = useCouponStore((state) => state.keyword);
  const typeFilter = useCouponStore((state) => state.typeFilter);
  const activeFilter = useCouponStore((state) => state.activeFilter);
  const selectedCoupon = useCouponStore((state) => state.selectedCoupon);
  const findingByCode = useCouponStore((state) => state.findingByCode);
  const validationResult = useCouponStore((state) => state.validationResult);
  const validating = useCouponStore((state) => state.validating);
  const loadCoupons = useCouponStore((state) => state.loadCoupons);
  const createCoupon = useCouponStore((state) => state.createCoupon);
  const updateCoupon = useCouponStore((state) => state.updateCoupon);
  const removeCoupon = useCouponStore((state) => state.deleteCoupon);
  const setKeyword = useCouponStore((state) => state.setKeyword);
  const setTypeFilter = useCouponStore((state) => state.setTypeFilter);
  const setActiveFilter = useCouponStore((state) => state.setActiveFilter);
  const findCouponByCode = useCouponStore((state) => state.findCouponByCode);
  const validateCoupon = useCouponStore((state) => state.validateCoupon);
  const clearSelectedCoupon = useCouponStore((state) => state.clearSelectedCoupon);
  const clearValidationResult = useCouponStore((state) => state.clearValidationResult);

  useEffect(() => {
    void loadCoupons({ page: 1, limit: 10 }).catch((error) => {
      messageApi.error(getErrorMessage(error));
    });
  }, [loadCoupons, messageApi]);

  useEffect(() => {
    setKeywordInput(keyword);
  }, [keyword]);

  const activeCount = useMemo(() => coupons.filter((coupon) => coupon.isActive).length, [coupons]);
  const expiredCount = useMemo(
    () => coupons.filter((coupon) => getCouponStatus(coupon).label === "�� h?t h?n").length,
    [coupons],
  );

  const handleApplyFilters = async ({
    nextKeyword = keywordInput,
    nextType = typeFilter,
    nextActive = activeFilter,
  }: {
    nextKeyword?: string;
    nextType?: CouponType | "all";
    nextActive?: "all" | "active" | "inactive";
  } = {}) => {
    setKeyword(nextKeyword);
    setTypeFilter(nextType);
    setActiveFilter(nextActive);

    try {
      await loadCoupons({
        page: 1,
        limit: pageSize,
        keyword: nextKeyword,
        type: nextType,
        isActive: nextActive,
      });
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const openCreateModal = () => {
    setEditingCoupon(null);
    couponForm.setFieldsValue(buildDefaultCouponFormValues());
    setModalOpen(true);
  };

  const openEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    couponForm.setFieldsValue({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description ?? "",
      type: coupon.type,
      value: coupon.value,
      maxDiscount: coupon.maxDiscount ?? null,
      minOrderValue: coupon.minOrderValue ?? null,
      usageLimit: coupon.usageLimit ?? null,
      perUserLimit: coupon.perUserLimit ?? null,
      isActive: coupon.isActive,
      startsAt: toLocalDateTimeInput(coupon.startsAt),
      expiresAt: toLocalDateTimeInput(coupon.expiresAt),
      source: coupon.source,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }
    setModalOpen(false);
    setEditingCoupon(null);
    couponForm.resetFields();
  };

  const buildCouponPayload = (values: CouponFormValues): CouponUpsertPayload => ({
    code: values.code.trim(),
    name: values.name.trim(),
    description: values.description?.trim() || "",
    type: values.type,
    value: Number(values.value || 0),
    maxDiscount: values.maxDiscount ?? null,
    minOrderValue: values.minOrderValue ?? null,
    usageLimit: values.usageLimit ?? null,
    perUserLimit: values.perUserLimit ?? null,
    isActive: Boolean(values.isActive),
    startsAt: toIsoDateTime(values.startsAt),
    expiresAt: toIsoDateTime(values.expiresAt),
    source: values.source,
  });

  const handleSubmitCoupon = async () => {
    try {
      const values = await couponForm.validateFields();
      const payload = buildCouponPayload(values);

      if (!payload.startsAt || !payload.expiresAt) {
        messageApi.error("Vui l�ng nh?p th?i gian b?t d?u v� k?t th�c h?p l?.");
        return;
      }

      if (new Date(payload.startsAt).getTime() >= new Date(payload.expiresAt).getTime()) {
        messageApi.error("Th?i gian b?t d?u ph?i tru?c th?i gian k?t th�c.");
        return;
      }

      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, payload);
        messageApi.success("C?p nh?t coupon th�nh c�ng.");
      } else {
        await createCoupon(payload);
        messageApi.success("T?o coupon th�nh c�ng.");
      }

      closeModal();
    } catch (error) {
      if (error instanceof Error && "errorFields" in error) {
        return;
      }
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleDeleteCoupon = async (coupon: Coupon) => {
    try {
      await removeCoupon(coupon.id);
      messageApi.success(`�� x�a coupon ${coupon.code}.`);
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleLookupCoupon = async () => {
    const code = lookupCode.trim();
    if (!code) {
      messageApi.warning("Vui l�ng nh?p m� gi?m gi� d? tra c?u.");
      return;
    }

    try {
      await findCouponByCode(code);
    } catch (error) {
      clearSelectedCoupon();
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleValidateCoupon = async () => {
    try {
      const values = await validateForm.validateFields();

      const payload: ValidateCouponPayload = {
        code: values.code.trim(),
        orderValue: values.orderValue,
        shippingFee: values.shippingFee ?? 0,
        brandNames: splitCsv(values.brandNamesText),
      };

      await validateCoupon(payload);
    } catch (error) {
      if (error instanceof Error && "errorFields" in error) {
        return;
      }
      clearValidationResult();
      messageApi.error(getErrorMessage(error));
    }
  };

  const columns: ColumnsType<Coupon> = [
    {
      title: "M�",
      dataIndex: "code",
      key: "code",
      width: 130,
      render: (code: string) => <Text strong>{code}</Text>,
    },
    {
      title: "T�n chuong tr�nh",
      dataIndex: "name",
      key: "name",
      width: 220,
    },
    {
      title: "Lo?i",
      dataIndex: "type",
      key: "type",
      width: 170,
      render: (type: CouponType) => COUPON_TYPE_LABEL[type],
    },
    {
      title: "Gi� tr?",
      key: "value",
      width: 140,
      render: (_, record) => renderCouponValue(record),
    },
    {
      title: "�on t?i thi?u",
      dataIndex: "minOrderValue",
      key: "minOrderValue",
      width: 140,
      render: (value?: number) => (value ? `${formatCurrency.format(value)} VND` : "-"),
    },
    {
      title: "Lu?t d�ng",
      key: "usage",
      width: 130,
      render: (_, record) => (
        <Text>
          {record.usageCount}/{record.usageLimit ?? "Kh�ng gi?i h?n"}
        </Text>
      ),
    },
    {
      title: "Tr?ng th�i",
      key: "status",
      width: 130,
      render: (_, record) => {
        const status = getCouponStatus(record);
        return <Tag color={status.color}>{status.label}</Tag>;
      },
    },
    {
      title: "Hi?u l?c d?n",
      dataIndex: "expiresAt",
      key: "expiresAt",
      width: 160,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: "Thao t�c",
      key: "actions",
      width: 170,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openEditModal(record)} disabled={saving}>
            S?a
          </Button>
          <Popconfirm
            title={`X�a coupon ${record.code}?`}
            description="H�nh d?ng n�y kh�ng th? ho�n t�c."
            okText="X�a"
            cancelText="H?y"
            onConfirm={() => void handleDeleteCoupon(record)}
            disabled={saving}
          >
            <Button size="small" danger disabled={saving}>
              X�a
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
          Qu?n l� m� gi?m gi�
        </Title>
        <Paragraph className="mb-0!" type="secondary">
          Qu?n tr? coupon theo CRUD d?y d?: t?o m?i, c?p nh?t, x�a v� ki?m tra di?u ki?n �p d?ng.
        </Paragraph>
      </div>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}>
          <Card>
            <Text type="secondary">Coupon dang hi?n th?</Text>
            <Title level={3} className="mb-0! mt-1!">
              {coupons.length}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Text type="secondary">Coupon dang b?t</Text>
            <Title level={3} className="mb-0! mt-1! text-emerald-600!">
              {activeCount}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Text type="secondary">Coupon d� h?t h?n</Text>
            <Title level={3} className="mb-0! mt-1! text-red-500!">
              {expiredCount}
            </Title>
          </Card>
        </Col>
      </Row>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            onPressEnter={() => void handleApplyFilters()}
            placeholder="T�m theo m� ho?c t�n chuong tr�nh"
            className="min-w-65"
            allowClear
          />
          <Select<CouponType | "all">
            value={typeFilter}
            options={COUPON_TYPE_OPTIONS}
            onChange={(value) => {
              void handleApplyFilters({ nextType: value });
            }}
            className="min-w-50"
          />
          <Select<"all" | "active" | "inactive">
            value={activeFilter}
            options={ACTIVE_FILTER_OPTIONS}
            onChange={(value) => {
              void handleApplyFilters({ nextActive: value });
            }}
            className="min-w-47.5"
          />
          <Button onClick={() => void handleApplyFilters()} loading={loading}>
            �p d?ng l?c
          </Button>
          <Button type="primary" onClick={openCreateModal}>
            T?o coupon
          </Button>
        </div>

        <Table<Coupon>
          rowKey="id"
          columns={columns}
          dataSource={coupons}
          loading={loading || saving}
          scroll={{ x: 1500 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (value) => `T?ng ${value} coupon`,
          }}
          onChange={(pagination: TablePaginationConfig) => {
            const nextPage = pagination.current ?? page;
            const nextPageSize = pagination.pageSize ?? pageSize;
            void loadCoupons({
              page: nextPage,
              limit: nextPageSize,
              keyword,
              type: typeFilter,
              isActive: activeFilter,
            }).catch((error) => {
              messageApi.error(getErrorMessage(error));
            });
          }}
        />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card title="Tra c?u coupon theo m�">
            <Space.Compact className="mb-4 w-full">
              <Input
                value={lookupCode}
                onChange={(event) => setLookupCode(event.target.value)}
                placeholder="Nh?p m� gi?m gi�, v� d?: WELCOME10"
                allowClear
              />
              <Button type="primary" onClick={() => void handleLookupCoupon()} loading={findingByCode}>
                Tra c?u
              </Button>
            </Space.Compact>

            {selectedCoupon ? (
              <div className="space-y-2">
                <Text strong>{selectedCoupon.name}</Text>
                <div>
                  <Text type="secondary">M�:</Text> <Text>{selectedCoupon.code}</Text>
                </div>
                <div>
                  <Text type="secondary">Lo?i:</Text> <Text>{COUPON_TYPE_LABEL[selectedCoupon.type]}</Text>
                </div>
                <div>
                  <Text type="secondary">Gi� tr?:</Text> <Text>{renderCouponValue(selectedCoupon)}</Text>
                </div>
                <div>
                  <Text type="secondary">B?t d?u:</Text> <Text>{formatDateTime(selectedCoupon.startsAt)}</Text>
                </div>
                <div>
                  <Text type="secondary">H?t h?n:</Text> <Text>{formatDateTime(selectedCoupon.expiresAt)}</Text>
                </div>
              </div>
            ) : (
              <Text type="secondary">Chua c� d? li?u tra c?u m� gi?m gi�.</Text>
            )}
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card title="Ki?m tra di?u ki?n �p d?ng m� gi?m gi�">
            <Form
              layout="vertical"
              form={validateForm}
              initialValues={{
                code: "",
                orderValue: 0,
                shippingFee: 0,
                brandNamesText: "",
              }}
            >
              <Form.Item
                label="M� gi?m gi�"
                name="code"
                rules={[{ required: true, message: "Vui l�ng nh?p m� gi?m gi�." }]}
              >
                <Input placeholder="V� d?: WELCOME10" />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    label="Gi� tr? don h�ng"
                    name="orderValue"
                    rules={[{ required: true, message: "Vui l�ng nh?p gi� tr? don h�ng." }]}
                  >
                    <InputNumber min={0} className="w-full" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Ph� v?n chuy?n" name="shippingFee">
                    <InputNumber min={0} className="w-full" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                label="Danh s�ch thuong hi?u (ngan c�ch b?i d?u ph?y)"
                name="brandNamesText"
              >
                <Input placeholder="V� d?: RioShop, Nike" />
              </Form.Item>
              <Button type="primary" onClick={() => void handleValidateCoupon()} loading={validating}>
                Ki?m tra m�
              </Button>
            </Form>

            {validationResult ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Card size="small">
                  <Statistic
                    title="K?t qu?"
                    value={validationResult.isValid ? "H?p l?" : "Kh�ng h?p l?"}
                    valueStyle={{ color: validationResult.isValid ? "#16a34a" : "#dc2626", fontSize: 20 }}
                  />
                  {validationResult.reason ? (
                    <Text type="secondary">{validationResult.reason}</Text>
                  ) : null}
                </Card>
                <Card size="small">
                  <Statistic title="Gi?m gi�" value={formatCurrency.format(validationResult.discount)} suffix="VND" />
                  <Statistic title="Th�nh ti?n cu?i" value={formatCurrency.format(validationResult.finalAmount)} suffix="VND" />
                </Card>
              </div>
            ) : null}
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingCoupon ? `C?p nh?t coupon ${editingCoupon.code}` : "T?o coupon m?i"}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => void handleSubmitCoupon()}
        confirmLoading={saving}
        okText={editingCoupon ? "Luu thay d?i" : "T?o coupon"}
        cancelText="H?y"
        width={860}
      >
        <Form<CouponFormValues>
          form={couponForm}
          layout="vertical"
          initialValues={buildDefaultCouponFormValues()}
        >
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item
                name="code"
                label="M� coupon"
                rules={[{ required: true, message: "Vui l�ng nh?p m� coupon." }]}
              >
                <Input placeholder="V� d?: WELCOME10" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="T�n chuong tr�nh"
                rules={[{ required: true, message: "Vui l�ng nh?p t�n chuong tr�nh." }]}
              >
                <Input placeholder="V� d?: Ch�o kh�ch m?i" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="M� t?">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item
                name="type"
                label="Lo?i coupon"
                rules={[{ required: true, message: "Vui l�ng ch?n lo?i coupon." }]}
              >
                <Select options={COUPON_FORM_TYPE_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="value"
                label="Gi� tr?"
                rules={[{ required: true, message: "Vui l�ng nh?p gi� tr? coupon." }]}
              >
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="source" label="Ngu?n t?o">
                <Select allowClear options={SOURCE_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} md={6}>
              <Form.Item name="maxDiscount" label="Gi?m t?i da">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="minOrderValue" label="�on t?i thi?u">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="usageLimit" label="Gi?i h?n lu?t d�ng">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="perUserLimit" label="Gi?i h?n/user">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item
                name="startsAt"
                label="B?t d?u"
                rules={[{ required: true, message: "Vui l�ng ch?n th?i gian b?t d?u." }]}
              >
                <Input type="datetime-local" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="expiresAt"
                label="K?t th�c"
                rules={[{ required: true, message: "Vui l�ng ch?n th?i gian k?t th�c." }]}
              >
                <Input type="datetime-local" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="isActive" label="�ang k�ch ho?t" valuePropName="checked">
            <Switch checkedChildren="B?t" unCheckedChildren="T?t" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}


