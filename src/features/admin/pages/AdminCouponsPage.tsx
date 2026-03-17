import { AxiosError } from "axios";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
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
import { useEffect, useMemo, useState } from "react";
import type {
  Coupon,
  CouponType,
  ValidateCouponPayload,
} from "../../../services/couponService";
import { useCouponStore } from "../../../stores/couponStore";

const { Paragraph, Text, Title } = Typography;

type ValidateFormValues = {
  code: string;
  orderValue: number;
  shippingFee?: number;
  brandNamesText?: string;
};

const COUPON_TYPE_LABEL: Record<CouponType, string> = {
  percent: "Giảm theo phần trăm",
  fixed: "Giảm tiền cố định",
  free_ship: "Miễn phí vận chuyển",
  gift: "Quà tặng",
};

const COUPON_TYPE_OPTIONS: { value: CouponType | "all"; label: string }[] = [
  { value: "all", label: "Tất cả loại" },
  { value: "percent", label: COUPON_TYPE_LABEL.percent },
  { value: "fixed", label: COUPON_TYPE_LABEL.fixed },
  { value: "free_ship", label: COUPON_TYPE_LABEL.free_ship },
  { value: "gift", label: COUPON_TYPE_LABEL.gift },
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

const formatCurrency = new Intl.NumberFormat("vi-VN");

const splitCsv = (raw?: string) =>
  (raw ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const getCouponStatus = (coupon: Coupon) => {
  const now = Date.now();
  const startsAt = new Date(coupon.startsAt).getTime();
  const expiresAt = new Date(coupon.expiresAt).getTime();

  if (Number.isNaN(startsAt) || Number.isNaN(expiresAt)) {
    return { label: "Không xác định", color: "default" as const };
  }

  if (startsAt > now) {
    return { label: "Chưa bắt đầu", color: "gold" as const };
  }

  if (expiresAt < now) {
    return { label: "Đã hết hạn", color: "red" as const };
  }

  return { label: "Đang hiệu lực", color: "green" as const };
};

const renderCouponValue = (coupon: Coupon) => {
  if (coupon.type === "percent") {
    return `${coupon.value}%`;
  }
  return `${formatCurrency.format(coupon.value)} VND`;
};

export function AdminCouponsPage() {
  const [validateForm] = Form.useForm<ValidateFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState<CouponType | "all">("all");
  const [lookupCode, setLookupCode] = useState("");

  const coupons = useCouponStore((state) => state.coupons);
  const loading = useCouponStore((state) => state.loading);
  const page = useCouponStore((state) => state.page);
  const pageSize = useCouponStore((state) => state.pageSize);
  const total = useCouponStore((state) => state.total);
  const selectedCoupon = useCouponStore((state) => state.selectedCoupon);
  const findingByCode = useCouponStore((state) => state.findingByCode);
  const validationResult = useCouponStore((state) => state.validationResult);
  const validating = useCouponStore((state) => state.validating);
  const loadCoupons = useCouponStore((state) => state.loadCoupons);
  const findCouponByCode = useCouponStore((state) => state.findCouponByCode);
  const validateCoupon = useCouponStore((state) => state.validateCoupon);
  const clearSelectedCoupon = useCouponStore((state) => state.clearSelectedCoupon);
  const clearValidationResult = useCouponStore((state) => state.clearValidationResult);

  useEffect(() => {
    void loadCoupons({ page: 1, pageSize: 10 }).catch((error) => {
      messageApi.error(getErrorMessage(error));
    });
  }, [loadCoupons, messageApi]);

  const filteredCoupons = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return coupons.filter((coupon) => {
      const matchedKeyword =
        normalizedKeyword.length === 0 ||
        coupon.code.toLowerCase().includes(normalizedKeyword) ||
        coupon.name.toLowerCase().includes(normalizedKeyword);

      const matchedType = typeFilter === "all" || coupon.type === typeFilter;

      return matchedKeyword && matchedType;
    });
  }, [coupons, keyword, typeFilter]);

  const handleLookupCoupon = async () => {
    const code = lookupCode.trim();
    if (!code) {
      messageApi.warning("Vui lòng nhập mã giảm giá để tra cứu.");
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
      title: "Mã",
      dataIndex: "code",
      key: "code",
      width: 130,
      render: (code: string) => <Text strong>{code}</Text>,
    },
    {
      title: "Tên chương trình",
      dataIndex: "name",
      key: "name",
      width: 220,
    },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      width: 170,
      render: (type: CouponType) => COUPON_TYPE_LABEL[type],
    },
    {
      title: "Giá trị",
      key: "value",
      width: 140,
      render: (_, record) => renderCouponValue(record),
    },
    {
      title: "Tối đa",
      dataIndex: "maxDiscount",
      key: "maxDiscount",
      width: 130,
      render: (value?: number) => (value ? `${formatCurrency.format(value)} VND` : "-"),
    },
    {
      title: "Đơn tối thiểu",
      dataIndex: "minOrderValue",
      key: "minOrderValue",
      width: 140,
      render: (value?: number) => (value ? `${formatCurrency.format(value)} VND` : "-"),
    },
    {
      title: "Lượt dùng",
      key: "usage",
      width: 130,
      render: (_, record) => (
        <Text>
          {record.usageCount}/{record.usageLimit ?? "Không giới hạn"}
        </Text>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 130,
      render: (_, record) => {
        const status = getCouponStatus(record);
        return <Tag color={status.color}>{status.label}</Tag>;
      },
    },
    {
      title: "Hiệu lực đến",
      dataIndex: "expiresAt",
      key: "expiresAt",
      width: 160,
      render: (value: string) => formatDateTime(value),
    },
  ];

  return (
    <div className="space-y-5">
      {contextHolder}

      <div>
        <Title level={3} className="mb-1! mt-0!">
          Quản lý mã giảm giá
        </Title>
        <Paragraph className="mb-0!" type="secondary">
          Theo dõi mã giảm giá đang hoạt động, tra cứu theo mã và kiểm tra điều kiện áp dụng theo giá trị đơn hàng.
        </Paragraph>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm theo mã hoặc tên chương trình"
            className="min-w-[260px]"
            allowClear
          />
          <Select
            value={typeFilter}
            options={COUPON_TYPE_OPTIONS}
            onChange={(value) => setTypeFilter(value)}
            className="min-w-[220px]"
          />
        </div>

        <Table<Coupon>
          rowKey="id"
          columns={columns}
          dataSource={filteredCoupons}
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (value) => `Tổng ${value} mã giảm giá đang hoạt động`,
          }}
          onChange={(pagination: TablePaginationConfig) => {
            const nextPage = pagination.current ?? page;
            const nextPageSize = pagination.pageSize ?? pageSize;
            void loadCoupons({ page: nextPage, pageSize: nextPageSize }).catch((error) => {
              messageApi.error(getErrorMessage(error));
            });
          }}
        />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card title="Tra cứu mã giảm giá theo mã">
            <Space.Compact className="mb-4 w-full">
              <Input
                value={lookupCode}
                onChange={(event) => setLookupCode(event.target.value)}
                placeholder="Nhập mã giảm giá, ví dụ: WELCOME10"
                allowClear
              />
              <Button type="primary" onClick={() => void handleLookupCoupon()} loading={findingByCode}>
                Tra cứu
              </Button>
            </Space.Compact>

            {selectedCoupon ? (
              <div className="space-y-2">
                <Text strong>{selectedCoupon.name}</Text>
                <div>
                  <Text type="secondary">Mã:</Text> <Text>{selectedCoupon.code}</Text>
                </div>
                <div>
                  <Text type="secondary">Loại:</Text> <Text>{COUPON_TYPE_LABEL[selectedCoupon.type]}</Text>
                </div>
                <div>
                  <Text type="secondary">Giá trị:</Text> <Text>{renderCouponValue(selectedCoupon)}</Text>
                </div>
                <div>
                  <Text type="secondary">Bắt đầu:</Text> <Text>{formatDateTime(selectedCoupon.startsAt)}</Text>
                </div>
                <div>
                  <Text type="secondary">Hết hạn:</Text> <Text>{formatDateTime(selectedCoupon.expiresAt)}</Text>
                </div>
              </div>
            ) : (
              <Text type="secondary">Chưa có dữ liệu tra cứu mã giảm giá.</Text>
            )}
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card title="Kiểm tra điều kiện áp dụng mã giảm giá">
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
                label="Mã giảm giá"
                name="code"
                rules={[{ required: true, message: "Vui lòng nhập mã giảm giá." }]}
              >
                <Input placeholder="Ví dụ: WELCOME10" />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    label="Giá trị đơn hàng"
                    name="orderValue"
                    rules={[{ required: true, message: "Vui lòng nhập giá trị đơn hàng." }]}
                  >
                    <InputNumber min={0} className="w-full" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Phí vận chuyển" name="shippingFee">
                    <InputNumber min={0} className="w-full" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                label="Danh sách thương hiệu (ngăn cách bởi dấu phẩy)"
                name="brandNamesText"
              >
                <Input placeholder="Ví dụ: RioShop, Nike" />
              </Form.Item>
              <Button type="primary" onClick={() => void handleValidateCoupon()} loading={validating}>
                Kiểm tra mã
              </Button>
            </Form>

            {validationResult ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Card size="small">
                  <Statistic
                    title="Kết quả"
                    value={validationResult.isValid ? "Hợp lệ" : "Không hợp lệ"}
                    valueStyle={{ color: validationResult.isValid ? "#16a34a" : "#dc2626", fontSize: 20 }}
                  />
                  {validationResult.reason ? (
                    <Text type="secondary">{validationResult.reason}</Text>
                  ) : null}
                </Card>
                <Card size="small">
                  <Statistic title="Giảm giá" value={formatCurrency.format(validationResult.discount)} suffix="VND" />
                  <Statistic title="Thành tiền cuối" value={formatCurrency.format(validationResult.finalAmount)} suffix="VND" />
                </Card>
              </div>
            ) : null}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
