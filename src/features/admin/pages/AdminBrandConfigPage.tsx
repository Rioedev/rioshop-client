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
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
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
    throw new Error(`${fieldLabel} không dúng d?nh d?ng JSON.`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`${fieldLabel} ph?i là m?t m?ng JSON.`);
  }

  return parsed.map((item, index) => {
    if (!isPlainObject(item)) {
      throw new Error(`${fieldLabel}: ph?n t? th? ${index + 1} ph?i là object JSON.`);
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
    throw new Error(`${fieldLabel} không dúng d?nh d?ng JSON.`);
  }

  if (!isPlainObject(parsed)) {
    throw new Error(`${fieldLabel} ph?i là object JSON.`);
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
  facebook: "",
  instagram: "",
  tiktok: "",
  youtube: "",
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
  facebook: config.socialLinks?.facebook ?? "",
  instagram: config.socialLinks?.instagram ?? "",
  tiktok: config.socialLinks?.tiktok ?? "",
  youtube: config.socialLinks?.youtube ?? "",
  loyalty: config.featureFlags.loyalty,
  flashSale: config.featureFlags.flashSale,
  review: config.featureFlags.review,
  maintenanceMode: config.maintenanceMode,
  paymentGatewaysJson: JSON.stringify(config.paymentGateways, null, 2),
  shippingRulesJson: JSON.stringify(config.shippingRules, null, 2),
  storefrontHomeJson: JSON.stringify(config.storefront?.home ?? {}, null, 2),
});

const mapJsonToPaymentGateways = (raw: string): BrandConfigPaymentGateway[] => {
  const items = parseJsonArray<JsonObject>(raw, "Danh sách c?ng thanh toán");

  return items.map((item, index) => {
    const provider = typeof item.provider === "string" ? item.provider.trim() : "";

    if (!provider) {
      throw new Error(`Danh sách c?ng thanh toán: ph?n t? th? ${index + 1} thi?u "provider".`);
    }

    return {
      provider,
      isActive: typeof item.isActive === "boolean" ? item.isActive : true,
      config: isPlainObject(item.config) ? item.config : undefined,
    };
  });
};

const mapJsonToShippingRules = (raw: string): BrandConfigShippingRule[] => {
  const items = parseJsonArray<JsonObject>(raw, "Danh sách quy t?c v?n chuy?n");

  return items.map((item, index) => {
    const method = typeof item.method === "string" ? item.method.trim() : "";

    if (!method) {
      throw new Error(`Danh sách quy t?c v?n chuy?n: ph?n t? th? ${index + 1} thi?u "method".`);
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
  socialLinks: {
    facebook: toOptionalString(values.facebook),
    instagram: toOptionalString(values.instagram),
    tiktok: toOptionalString(values.tiktok),
    youtube: toOptionalString(values.youtube),
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
    home: parseJsonObject(values.storefrontHomeJson, "N?i dung Home Storefront"),
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
        messageApi.info("Chua có c?u hình cho thuong hi?u này. B?n có th? nh?p thông tin và b?m Luu d? t?o m?i.");
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
      messageApi.warning("Vui lòng nh?p mã thuong hi?u (brandKey).");
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
        messageApi.warning("Vui lòng nh?p mã thuong hi?u (brandKey).");
        return;
      }

      const payload = mapFormToPayload(values);
      await updateBrandConfig(brandKey, payload);

      const latestConfig = useBrandConfigStore.getState().config;
      if (latestConfig) {
        form.setFieldsValue(mapConfigToFormValues(latestConfig));
        setActiveBrandKey(latestConfig.brandKey);
      }

      messageApi.success("Luu c?u hình thuong hi?u thành công.");
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
          C?u hình thuong hi?u
        </Title>
        <Paragraph className="mb-0!" type="secondary">
          Qu?n lý thông tin hi?n th?, ch? d?, h? tr? khách hàng và các c? tính nang cho t?ng thuong hi?u.
        </Paragraph>
      </div>

      <Card>
        <Form form={form} layout="vertical" initialValues={getDefaultFormValues()}>
          <Row gutter={16}>
            <Col xs={24} md={14} lg={10}>
              <Form.Item
                label="Mã thuong hi?u (brandKey)"
                name="brandKey"
                rules={[{ required: true, message: "Vui lòng nh?p mã thuong hi?u." }]}
              >
                <Input placeholder="Ví d?: rioshop-default" />
              </Form.Item>
            </Col>
            <Col xs={24} md={10} lg={14}>
              <Form.Item label=" ">
                <Space wrap>
                  <Button onClick={() => void handleLoadConfig()} loading={loading}>
                    T?i c?u hình
                  </Button>
                  <Button type="primary" onClick={() => void handleSave()} loading={saving}>
                    Luu c?u hình
                  </Button>
                  <Text type="secondary">Ðang thao tác v?i: {activeBrandKey}</Text>
                </Space>
              </Form.Item>
            </Col>
          </Row>

          {notFound ? (
            <Alert
              showIcon
              type="info"
              className="mb-4"
              message="Chua có d? li?u c?u hình"
              description="B?n ghi chua t?n t?i trên h? th?ng. Khi b?m Luu c?u hình, h? th?ng s? t? t?o m?i."
            />
          ) : null}

          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Card size="small" title="Thông tin co b?n">
                <Form.Item
                  label="Tên hi?n th?"
                  name="displayName"
                  rules={[
                    { required: true, message: "Vui lòng nh?p tên hi?n th?." },
                    { min: 2, message: "Tên hi?n th? ph?i có ít nh?t 2 ký t?." },
                  ]}
                >
                  <Input placeholder="Ví d?: RioShop" />
                </Form.Item>

                <Form.Item label="Thu? su?t" name="taxRate" tooltip="Nh?p d?ng th?p phân, ví d? 0.1 nghia là 10%">
                  <InputNumber
                    min={0}
                    step={0.01}
                    precision={4}
                    className="w-full"
                    placeholder="Ví d?: 0.1"
                  />
                </Form.Item>

                <Form.Item
                  label="B?o trì h? th?ng"
                  name="maintenanceMode"
                  valuePropName="checked"
                  className="mb-0!"
                >
                  <Switch checkedChildren="B?t" unCheckedChildren="T?t" />
                </Form.Item>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card size="small" title="Logo và ch? d?">
                <Form.Item label="Logo sáng (URL)" name="logoLight">
                  <Input placeholder="https://..." />
                </Form.Item>
                <Form.Item label="Logo t?i (URL)" name="logoDark">
                  <Input placeholder="https://..." />
                </Form.Item>
                <Form.Item label="Màu chính" name="primaryColor">
                  <Input placeholder="#0f172a" />
                </Form.Item>
                <Form.Item label="Màu ph?" name="secondaryColor">
                  <Input placeholder="#f97316" />
                </Form.Item>
                <Form.Item label="Phông ch?" name="fontFamily" className="mb-0!">
                  <Input placeholder="Ví d?: Poppins, sans-serif" />
                </Form.Item>
              </Card>
            </Col>
          </Row>

          <Row gutter={16} className="mt-4">
            <Col xs={24} lg={12}>
              <Card size="small" title="Liên h? h? tr?">
                <Form.Item label="Email h? tr?" name="supportEmail">
                  <Input placeholder="support@tenmien.com" />
                </Form.Item>
                <Form.Item label="S? di?n tho?i h? tr?" name="supportPhone" className="mb-0!">
                  <Input placeholder="1900xxxx" />
                </Form.Item>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card size="small" title="M?ng xã h?i">
                <Form.Item label="Facebook" name="facebook">
                  <Input placeholder="https://facebook.com/..." />
                </Form.Item>
                <Form.Item label="Instagram" name="instagram">
                  <Input placeholder="https://instagram.com/..." />
                </Form.Item>
                <Form.Item label="TikTok" name="tiktok">
                  <Input placeholder="https://tiktok.com/@..." />
                </Form.Item>
                <Form.Item label="YouTube" name="youtube" className="mb-0!">
                  <Input placeholder="https://youtube.com/@..." />
                </Form.Item>
              </Card>
            </Col>
          </Row>

          <Row gutter={16} className="mt-4">
            <Col xs={24}>
              <Card size="small" title="C? tính nang">
                <div className="grid gap-4 md:grid-cols-3">
                  <Form.Item label="Ði?m thu?ng" name="loyalty" valuePropName="checked" className="mb-0!">
                    <Switch checkedChildren="B?t" unCheckedChildren="T?t" />
                  </Form.Item>
                  <Form.Item label="Flash Sale" name="flashSale" valuePropName="checked" className="mb-0!">
                    <Switch checkedChildren="B?t" unCheckedChildren="T?t" />
                  </Form.Item>
                  <Form.Item label="Ðánh giá s?n ph?m" name="review" valuePropName="checked" className="mb-0!">
                    <Switch checkedChildren="B?t" unCheckedChildren="T?t" />
                  </Form.Item>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={16} className="mt-4">
            <Col xs={24} lg={12}>
              <Card
                size="small"
                title="C?u hình c?ng thanh toán (JSON)"
                extra={<Text type="secondary">M?ng JSON</Text>}
              >
                <Form.Item
                  name="paymentGatewaysJson"
                  className="mb-0!"
                  rules={[{ required: true, message: "Vui lòng nh?p JSON c?ng thanh toán." }]}
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
                title="Quy t?c v?n chuy?n (JSON)"
                extra={<Text type="secondary">M?ng JSON</Text>}
              >
                <Form.Item
                  name="shippingRulesJson"
                  className="mb-0!"
                  rules={[{ required: true, message: "Vui lòng nh?p JSON quy t?c v?n chuy?n." }]}
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
                title="N?i dung Home Storefront (JSON)"
                extra={<Text type="secondary">Object JSON</Text>}
              >
                <Form.Item
                  name="storefrontHomeJson"
                  className="mb-0!"
                  rules={[{ required: true, message: "Vui lòng nh?p JSON n?i dung Home Storefront." }]}
                >
                  <Input.TextArea
                    rows={18}
                    className="font-mono"
                    placeholder='{"hero":{"kicker":"B? suu t?p m?i"},"sections":{"couponTitle":"Luu mã gi?m giá"}}'
                  />
                </Form.Item>
              </Card>
            </Col>
          </Row>
        </Form>
      </Card>

      <Text type="secondary">
        C?p nh?t g?n nh?t: {formatDateTime(config?.updatedAt)}
      </Text>
    </div>
  );
}


