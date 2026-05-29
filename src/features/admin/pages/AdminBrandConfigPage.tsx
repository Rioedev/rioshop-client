import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Space,
  Switch,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import {
  type BrandConfig,
  type BrandConfigPaymentGateway,
  type BrandConfigShippingRule,
  type UpdateBrandConfigPayload,
} from "../../../services/brandConfigService";
import { useBrandConfigStore } from "../../../stores/brandConfigStore";
import { getErrorMessage } from "../../../utils/errorMessage";

const { Paragraph, Text, Title } = Typography;

const DEFAULT_BRAND_KEY = "rioshop-default";

type JsonObject = Record<string, unknown>;

type BrandConfigFormValues = {
  brandKey: string;
  displayName: string;
  logoLight?: string;
  logoDark?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  taxRate?: number;
  supportEmail?: string;
  supportPhone?: string;
  supportHotlineNote?: string;
  supportHotlineNoteSecondary?: string;
  storeAddress?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  zalo?: string;
  messenger?: string;
  promoBarText?: string;
  promoBarActive: boolean;
  footerIntroHeading?: string;
  footerIntro?: string;
  footerCompanyName?: string;
  footerCompanyLegalText?: string;
  footerComplianceBadgesText?: string;
  footerNewsletterPlaceholder?: string;
  loyalty: boolean;
  flashSale: boolean;
  review: boolean;
  maintenanceMode: boolean;
  paymentGatewaysJson: string;
  shippingRulesJson: string;
  storefrontHomeJson: string;
};

const isPlainObject = (value: unknown): value is JsonObject => (
  Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const toNullableString = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const toOptionalString = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const parseJsonArray = <T extends JsonObject>(raw: string, fieldLabel: string): T[] => {
  const text = raw.trim();
  if (!text) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${fieldLabel} không đúng định dạng JSON.`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`${fieldLabel} phải là một mảng JSON.`);
  }

  return parsed.map((item, index) => {
    if (!isPlainObject(item)) {
      throw new Error(`${fieldLabel}: phần tử thứ ${index + 1} phải là object JSON.`);
    }
    return item as T;
  });
};

const parseJsonObject = <T extends JsonObject>(raw: string, fieldLabel: string): T => {
  const text = raw.trim();
  if (!text) {
    return {} as T;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${fieldLabel} không đúng định dạng JSON.`);
  }

  if (!isPlainObject(parsed)) {
    throw new Error(`${fieldLabel} phải là object JSON.`);
  }

  return parsed as T;
};

const getDefaultFormValues = (brandKey = DEFAULT_BRAND_KEY): BrandConfigFormValues => ({
  brandKey,
  displayName: "",
  logoLight: "",
  logoDark: "",
  primaryColor: "",
  secondaryColor: "",
  fontFamily: "",
  taxRate: undefined,
  supportEmail: "",
  supportPhone: "",
  supportHotlineNote: "",
  supportHotlineNoteSecondary: "",
  storeAddress: "",
  facebook: "",
  instagram: "",
  tiktok: "",
  youtube: "",
  zalo: "",
  messenger: "",
  promoBarText: "",
  promoBarActive: true,
  footerIntroHeading: "",
  footerIntro: "",
  footerCompanyName: "",
  footerCompanyLegalText: "",
  footerComplianceBadgesText: "",
  footerNewsletterPlaceholder: "",
  loyalty: true,
  flashSale: true,
  review: true,
  maintenanceMode: false,
  paymentGatewaysJson: "[]",
  shippingRulesJson: "[]",
  storefrontHomeJson: "{}",
});

const mapConfigToFormValues = (config: BrandConfig): BrandConfigFormValues => ({
  brandKey: config.brandKey,
  displayName: config.displayName,
  logoLight: config.logo?.light ?? "",
  logoDark: config.logo?.dark ?? "",
  primaryColor: config.theme?.primaryColor ?? "",
  secondaryColor: config.theme?.secondaryColor ?? "",
  fontFamily: config.theme?.fontFamily ?? "",
  taxRate: config.taxRate,
  supportEmail: config.supportEmail ?? "",
  supportPhone: config.supportPhone ?? "",
  supportHotlineNote: config.supportHotlineNote ?? "",
  supportHotlineNoteSecondary: config.supportHotlineNoteSecondary ?? "",
  storeAddress: config.storeAddress ?? "",
  facebook: config.socialLinks?.facebook ?? "",
  instagram: config.socialLinks?.instagram ?? "",
  tiktok: config.socialLinks?.tiktok ?? "",
  youtube: config.socialLinks?.youtube ?? "",
  zalo: config.socialLinks?.zalo ?? "",
  messenger: config.socialLinks?.messenger ?? "",
  promoBarText: config.storefront?.promoBar?.text ?? "",
  promoBarActive: config.storefront?.promoBar?.isActive ?? true,
  footerIntroHeading: config.storefront?.footer?.introHeading ?? "",
  footerIntro: config.storefront?.footer?.intro ?? "",
  footerCompanyName: config.storefront?.footer?.companyName ?? "",
  footerCompanyLegalText: config.storefront?.footer?.companyLegalText ?? "",
  footerComplianceBadgesText: (config.storefront?.footer?.complianceBadges ?? []).join("\n"),
  footerNewsletterPlaceholder: config.storefront?.footer?.newsletterPlaceholder ?? "",
  loyalty: config.featureFlags.loyalty,
  flashSale: config.featureFlags.flashSale,
  review: config.featureFlags.review,
  maintenanceMode: config.maintenanceMode,
  paymentGatewaysJson: JSON.stringify(config.paymentGateways, null, 2),
  shippingRulesJson: JSON.stringify(config.shippingRules, null, 2),
  storefrontHomeJson: JSON.stringify(config.storefront?.home ?? {}, null, 2),
});

const mapJsonToPaymentGateways = (raw: string): BrandConfigPaymentGateway[] => {
  const items = parseJsonArray<JsonObject>(raw, "Danh sách cổng thanh toán");

  return items.map((item, index) => {
    const provider = typeof item.provider === "string" ? item.provider.trim() : "";

    if (!provider) {
      throw new Error(`Danh sách cổng thanh toán: phần tử thứ ${index + 1} thiếu "provider".`);
    }

    return {
      provider,
      isActive: typeof item.isActive === "boolean" ? item.isActive : true,
      config: isPlainObject(item.config) ? item.config : undefined,
    };
  });
};

const mapJsonToShippingRules = (raw: string): BrandConfigShippingRule[] => {
  const items = parseJsonArray<JsonObject>(raw, "Danh sách quy tắc vận chuyển");

  return items.map((item, index) => {
    const method = typeof item.method === "string" ? item.method.trim() : "";

    if (!method) {
      throw new Error(`Danh sách quy tắc vận chuyển: phần tử thứ ${index + 1} thiếu "method".`);
    }

    const carriers = Array.isArray(item.carriers)
      ? item.carriers
        .filter((carrier): carrier is string => typeof carrier === "string")
        .map((carrier) => carrier.trim())
        .filter(Boolean)
      : undefined;

    return {
      method,
      carriers,
      feeSchedule: isPlainObject(item.feeSchedule) ? item.feeSchedule : undefined,
    };
  });
};

const splitLines = (value?: string): string[] =>
  (value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const mapFormToPayload = (values: BrandConfigFormValues): UpdateBrandConfigPayload => ({
  displayName: values.displayName.trim(),
  logo: {
    light: toNullableString(values.logoLight),
    dark: toNullableString(values.logoDark),
  },
  theme: {
    primaryColor: toNullableString(values.primaryColor),
    secondaryColor: toNullableString(values.secondaryColor),
    fontFamily: toNullableString(values.fontFamily),
  },
  taxRate: values.taxRate,
  supportEmail: toNullableString(values.supportEmail),
  supportPhone: toNullableString(values.supportPhone),
  supportHotlineNote: toNullableString(values.supportHotlineNote),
  supportHotlineNoteSecondary: toNullableString(values.supportHotlineNoteSecondary),
  storeAddress: toNullableString(values.storeAddress),
  socialLinks: {
    facebook: toOptionalString(values.facebook),
    instagram: toOptionalString(values.instagram),
    tiktok: toOptionalString(values.tiktok),
    youtube: toOptionalString(values.youtube),
    zalo: toOptionalString(values.zalo),
    messenger: toOptionalString(values.messenger),
  },
  featureFlags: {
    loyalty: values.loyalty,
    flashSale: values.flashSale,
    review: values.review,
  },
  maintenanceMode: values.maintenanceMode,
  paymentGateways: mapJsonToPaymentGateways(values.paymentGatewaysJson),
  shippingRules: mapJsonToShippingRules(values.shippingRulesJson),
  storefront: {
    promoBar: {
      text: toOptionalString(values.promoBarText),
      isActive: values.promoBarActive,
    },
    footer: {
      introHeading: toOptionalString(values.footerIntroHeading),
      intro: toOptionalString(values.footerIntro),
      companyName: toOptionalString(values.footerCompanyName),
      companyLegalText: toOptionalString(values.footerCompanyLegalText),
      complianceBadges: splitLines(values.footerComplianceBadgesText),
      newsletterPlaceholder: toOptionalString(values.footerNewsletterPlaceholder),
    },
    home: parseJsonObject(values.storefrontHomeJson, "Nội dung Home Storefront"),
  },
});

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

export function AdminBrandConfigPage() {
  const [form] = Form.useForm<BrandConfigFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [activeBrandKey, setActiveBrandKey] = useState(DEFAULT_BRAND_KEY);

  const config = useBrandConfigStore((state) => state.config);
  const loading = useBrandConfigStore((state) => state.loading);
  const saving = useBrandConfigStore((state) => state.saving);
  const notFound = useBrandConfigStore((state) => state.notFound);
  const loadBrandConfig = useBrandConfigStore((state) => state.loadBrandConfig);
  const updateBrandConfig = useBrandConfigStore((state) => state.updateBrandConfig);

  const applyDefaultForm = useCallback((brandKey: string) => {
    form.setFieldsValue(getDefaultFormValues(brandKey));
  }, [form]);

  const loadConfigData = useCallback(async (brandKey: string) => {
    try {
      await loadBrandConfig(brandKey);
      const latest = useBrandConfigStore.getState();

      if (latest.notFound || !latest.config) {
        applyDefaultForm(brandKey);
        messageApi.info("Chưa có cấu hình cho thương hiệu này. Bạn có thể nhập thông tin và bấm Lưu để tạo mới.");
        return;
      }

      form.setFieldsValue(mapConfigToFormValues(latest.config));
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  }, [applyDefaultForm, form, loadBrandConfig, messageApi]);

  const handleLoadConfig = useCallback(async (rawBrandKey?: string) => {
    const brandKey = (rawBrandKey ?? form.getFieldValue("brandKey") ?? "").trim();

    if (!brandKey) {
      messageApi.warning("Vui lòng nhập mã thương hiệu (brandKey).");
      return;
    }

    setActiveBrandKey(brandKey);
    form.setFieldValue("brandKey", brandKey);
    await loadConfigData(brandKey);
  }, [form, loadConfigData, messageApi]);

  useEffect(() => {
    form.setFieldValue("brandKey", DEFAULT_BRAND_KEY);
    void loadConfigData(DEFAULT_BRAND_KEY);
  }, [form, loadConfigData]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const brandKey = values.brandKey.trim();

      if (!brandKey) {
        messageApi.warning("Vui lòng nhập mã thương hiệu (brandKey).");
        return;
      }

      const payload = mapFormToPayload(values);
      await updateBrandConfig(brandKey, payload);

      const latestConfig = useBrandConfigStore.getState().config;
      if (latestConfig) {
        form.setFieldsValue(mapConfigToFormValues(latestConfig));
        setActiveBrandKey(latestConfig.brandKey);
      }

      messageApi.success("Lưu cấu hình thương hiệu thành công.");
    } catch (error) {
      if (error instanceof Error && "errorFields" in error) {
        return;
      }
      messageApi.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-5">
      {contextHolder}

      <div>
        <Title level={3} className="mb-1! mt-0!">
          Cấu hình thương hiệu
        </Title>
        <Paragraph className="mb-0!" type="secondary">
          Quản lý thông tin hiển thị, chủ đề, hỗ trợ khách hàng và các cờ tính năng cho từng thương hiệu.
        </Paragraph>
      </div>

      <Card>
        <Form form={form} layout="vertical" initialValues={getDefaultFormValues()}>
          <Row gutter={16}>
            <Col xs={24} md={14} lg={10}>
              <Form.Item
                label="Mã thương hiệu (brandKey)"
                name="brandKey"
                rules={[{ required: true, message: "Vui lòng nhập mã thương hiệu." }]}
              >
                <Input placeholder="Ví dụ: rioshop-default" />
              </Form.Item>
            </Col>
            <Col xs={24} md={10} lg={14}>
              <Form.Item label=" ">
                <Space wrap>
                  <Button onClick={() => void handleLoadConfig()} loading={loading}>
                    Tải cấu hình
                  </Button>
                  <Button type="primary" onClick={() => void handleSave()} loading={saving}>
                    Lưu cấu hình
                  </Button>
                  <Text type="secondary">Đang thao tác với: {activeBrandKey}</Text>
                </Space>
              </Form.Item>
            </Col>
          </Row>

          {notFound ? (
            <Alert
              showIcon
              type="info"
              className="mb-4"
              message="Chưa có dữ liệu cấu hình"
              description="Bản ghi chưa tồn tại trên hệ thống. Khi bấm Lưu cấu hình, hệ thống sẽ tự tạo mới."
            />
          ) : null}

          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Card size="small" title="Thông tin cơ bản">
                <Form.Item
                  label="Tên hiển thị"
                  name="displayName"
                  rules={[
                    { required: true, message: "Vui lòng nhập tên hiển thị." },
                    { min: 2, message: "Tên hiển thị phải có ít nhất 2 ký tự." },
                  ]}
                >
                  <Input placeholder="Ví dụ: RioShop" />
                </Form.Item>

                <Form.Item label="Thuế suất" name="taxRate" tooltip="Nhập dạng thập phân, ví dụ 0.1 nghĩa là 10%">
                  <InputNumber
                    min={0}
                    step={0.01}
                    precision={4}
                    className="w-full"
                    placeholder="Ví dụ: 0.1"
                  />
                </Form.Item>

                <Form.Item
                  label="Bảo trì hệ thống"
                  name="maintenanceMode"
                  valuePropName="checked"
                  className="mb-0!"
                >
                  <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
                </Form.Item>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card size="small" title="Logo và chủ đề">
                <Form.Item label="Logo sáng (URL)" name="logoLight">
                  <Input placeholder="https://..." />
                </Form.Item>
                <Form.Item label="Logo tối (URL)" name="logoDark">
                  <Input placeholder="https://..." />
                </Form.Item>
                <Form.Item label="Màu chính" name="primaryColor">
                  <Input placeholder="#0f172a" />
                </Form.Item>
                <Form.Item label="Màu phụ" name="secondaryColor">
                  <Input placeholder="#f97316" />
                </Form.Item>
                <Form.Item label="Phông chữ" name="fontFamily" className="mb-0!">
                  <Input placeholder="Ví dụ: Poppins, sans-serif" />
                </Form.Item>
              </Card>
            </Col>
          </Row>

          <Row gutter={16} className="mt-4">
            <Col xs={24} lg={12}>
              <Card size="small" title="Liên hệ hỗ trợ">
                <Form.Item label="Email hỗ trợ" name="supportEmail">
                  <Input placeholder="support@rioshop.vn" />
                </Form.Item>
                <Form.Item label="Hotline" name="supportPhone">
                  <Input placeholder="1900 8888" />
                </Form.Item>
                <Form.Item
                  label="Mô tả phím 1 (tùy chọn)"
                  name="supportHotlineNote"
                  tooltip="Hiện ở footer dưới hotline. Ví dụ: Bấm phím 1 để được tư vấn mua hàng"
                >
                  <Input placeholder="Bấm phím 1 để được tư vấn mua hàng" />
                </Form.Item>
                <Form.Item label="Mô tả phím 2 (tùy chọn)" name="supportHotlineNoteSecondary">
                  <Input placeholder="Bấm phím 2 để góp ý, khiếu nại" />
                </Form.Item>
                <Form.Item label="Địa chỉ cửa hàng" name="storeAddress" className="mb-0!">
                  <Input.TextArea
                    rows={2}
                    placeholder="VD: Đường An Định - Phường Việt Hòa - TP Hải Phòng"
                  />
                </Form.Item>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card size="small" title="Mạng xã hội">
                <Form.Item label="Facebook" name="facebook">
                  <Input placeholder="https://facebook.com/..." />
                </Form.Item>
                <Form.Item label="Instagram" name="instagram">
                  <Input placeholder="https://instagram.com/..." />
                </Form.Item>
                <Form.Item label="TikTok" name="tiktok">
                  <Input placeholder="https://tiktok.com/@..." />
                </Form.Item>
                <Form.Item label="YouTube" name="youtube">
                  <Input placeholder="https://youtube.com/@..." />
                </Form.Item>
                <Form.Item label="Zalo" name="zalo">
                  <Input placeholder="https://zalo.me/..." />
                </Form.Item>
                <Form.Item label="Messenger" name="messenger" className="mb-0!">
                  <Input placeholder="https://m.me/..." />
                </Form.Item>
              </Card>
            </Col>
          </Row>

          <Row gutter={16} className="mt-4">
            <Col xs={24} lg={12}>
              <Card size="small" title="Dải băng khuyến mại (trên cùng trang)">
                <Form.Item
                  label="Nội dung"
                  name="promoBarText"
                  tooltip="Hiện ở dải băng trên cùng đầu trang. Để trống nếu không muốn hiện."
                >
                  <Input placeholder="VD: FLASH SALE 10H - 14H | Giảm đến 50%" />
                </Form.Item>
                <Form.Item
                  label="Bật hiển thị"
                  name="promoBarActive"
                  valuePropName="checked"
                  className="mb-0!"
                >
                  <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
                </Form.Item>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card size="small" title="Footer — Giới thiệu & quy định">
                <Form.Item label="Heading lời chào" name="footerIntroHeading">
                  <Input placeholder="VD: RIOSHOP XIN CHÀO 💖" />
                </Form.Item>
                <Form.Item label="Lời chào" name="footerIntro">
                  <Input.TextArea rows={2} placeholder="VD: Chúng tôi luôn quý trọng..." />
                </Form.Item>
                <Form.Item label="Placeholder ô đăng ký email" name="footerNewsletterPlaceholder">
                  <Input placeholder="Nhập địa chỉ email của bạn" />
                </Form.Item>
                <Form.Item label="Tên công ty (dòng dưới cùng)" name="footerCompanyName">
                  <Input placeholder="@ CÔNG TY CỔ PHẦN THỜI TRANG RIOSHOP" />
                </Form.Item>
                <Form.Item label="Thông tin pháp lý" name="footerCompanyLegalText">
                  <Input.TextArea
                    rows={3}
                    placeholder="Mã số doanh nghiệp: 0801206940..."
                  />
                </Form.Item>
                <Form.Item
                  label="Huy hiệu pháp lý (mỗi dòng 1 huy hiệu)"
                  name="footerComplianceBadgesText"
                  className="mb-0!"
                >
                  <Input.TextArea
                    rows={3}
                    placeholder={"DMCA PROTECTED\nĐÃ THÔNG BÁO BỘ CÔNG THƯƠNG"}
                  />
                </Form.Item>
              </Card>
            </Col>
          </Row>

          <Row gutter={16} className="mt-4">
            <Col xs={24}>
              <Card size="small" title="Cờ tính năng">
                <div className="grid gap-4 md:grid-cols-3">
                  <Form.Item label="Điểm thưởng" name="loyalty" valuePropName="checked" className="mb-0!">
                    <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
                  </Form.Item>
                  <Form.Item label="Flash Sale" name="flashSale" valuePropName="checked" className="mb-0!">
                    <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
                  </Form.Item>
                  <Form.Item label="Đánh giá sản phẩm" name="review" valuePropName="checked" className="mb-0!">
                    <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
                  </Form.Item>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={16} className="mt-4">
            <Col xs={24} lg={12}>
              <Card
                size="small"
                title="Cấu hình cổng thanh toán (JSON)"
                extra={<Text type="secondary">Mảng JSON</Text>}
              >
                <Form.Item
                  name="paymentGatewaysJson"
                  className="mb-0!"
                  rules={[{ required: true, message: "Vui lòng nhập JSON cổng thanh toán." }]}
                >
                  <Input.TextArea
                    rows={12}
                    className="font-mono"
                    placeholder='[{"provider":"momo","isActive":true,"config":{"mode":"test"}}]'
                  />
                </Form.Item>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                size="small"
                title="Quy tắc vận chuyển (JSON)"
                extra={<Text type="secondary">Mảng JSON</Text>}
              >
                <Form.Item
                  name="shippingRulesJson"
                  className="mb-0!"
                  rules={[{ required: true, message: "Vui lòng nhập JSON quy tắc vận chuyển." }]}
                >
                  <Input.TextArea
                    rows={12}
                    className="font-mono"
                    placeholder='[{"method":"standard","carriers":["GHN"],"feeSchedule":{"baseFee":25000}}]'
                  />
                </Form.Item>
              </Card>
            </Col>
          </Row>

          <Row gutter={16} className="mt-4">
            <Col xs={24}>
              <Card
                size="small"
                title="Nội dung Home Storefront (JSON)"
                extra={<Text type="secondary">Object JSON</Text>}
              >
                <Form.Item
                  name="storefrontHomeJson"
                  className="mb-0!"
                  rules={[{ required: true, message: "Vui lòng nhập JSON nội dung Home Storefront." }]}
                >
                  <Input.TextArea
                    rows={18}
                    className="font-mono"
                    placeholder='{"hero":{"kicker":"Bộ sưu tập mới"},"sections":{"couponTitle":"Lưu mã giảm giá"}}'
                  />
                </Form.Item>
              </Card>
            </Col>
          </Row>
        </Form>
      </Card>

      <Text type="secondary">
        Cập nhật gần nhất: {formatDateTime(config?.updatedAt)}
      </Text>
    </div>
  );
}

