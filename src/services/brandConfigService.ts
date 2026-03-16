import { apiClient } from "./apiClient";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type JsonObject = Record<string, unknown>;

export type BrandConfigLogo = {
  light?: string | null;
  dark?: string | null;
};

export type BrandConfigTheme = {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  fontFamily?: string | null;
};

export type BrandConfigPaymentGateway = {
  provider: string;
  isActive?: boolean;
  config?: JsonObject;
};

export type BrandConfigShippingRule = {
  method: string;
  carriers?: string[];
  feeSchedule?: JsonObject;
};

export type BrandConfigSocialLinks = {
  facebook?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
};

export type BrandConfigFeatureFlags = {
  loyalty?: boolean;
  flashSale?: boolean;
  review?: boolean;
};

type BrandConfigApiItem = {
  _id?: string;
  id?: string;
  brandKey: string;
  displayName: string;
  logo?: BrandConfigLogo;
  theme?: BrandConfigTheme;
  paymentGateways?: BrandConfigPaymentGateway[];
  shippingRules?: BrandConfigShippingRule[];
  taxRate?: number;
  supportEmail?: string;
  supportPhone?: string;
  socialLinks?: BrandConfigSocialLinks;
  featureFlags?: BrandConfigFeatureFlags;
  maintenanceMode?: boolean;
  updatedAt?: string;
};

export type BrandConfig = {
  id: string;
  brandKey: string;
  displayName: string;
  logo?: BrandConfigLogo;
  theme?: BrandConfigTheme;
  paymentGateways: BrandConfigPaymentGateway[];
  shippingRules: BrandConfigShippingRule[];
  taxRate?: number;
  supportEmail?: string | null;
  supportPhone?: string | null;
  socialLinks?: BrandConfigSocialLinks;
  featureFlags: Required<BrandConfigFeatureFlags>;
  maintenanceMode: boolean;
  updatedAt?: string;
};

export type UpdateBrandConfigPayload = Partial<{
  displayName: string;
  logo: BrandConfigLogo;
  theme: BrandConfigTheme;
  paymentGateways: BrandConfigPaymentGateway[];
  shippingRules: BrandConfigShippingRule[];
  taxRate: number;
  supportEmail: string | null;
  supportPhone: string | null;
  socialLinks: BrandConfigSocialLinks;
  featureFlags: BrandConfigFeatureFlags;
  maintenanceMode: boolean;
}>;

const normalizeBrandConfig = (item: BrandConfigApiItem): BrandConfig => ({
  id: item.id ?? item._id ?? "",
  brandKey: item.brandKey,
  displayName: item.displayName,
  logo: item.logo,
  theme: item.theme,
  paymentGateways: item.paymentGateways ?? [],
  shippingRules: item.shippingRules ?? [],
  taxRate: item.taxRate,
  supportEmail: item.supportEmail,
  supportPhone: item.supportPhone,
  socialLinks: item.socialLinks,
  featureFlags: {
    loyalty: item.featureFlags?.loyalty ?? true,
    flashSale: item.featureFlags?.flashSale ?? true,
    review: item.featureFlags?.review ?? true,
  },
  maintenanceMode: item.maintenanceMode ?? false,
  updatedAt: item.updatedAt,
});

export const brandConfigService = {
  async getBrandConfig(brandKey: string): Promise<BrandConfig> {
    const response = await apiClient.get<ApiResponse<BrandConfigApiItem>>(
      `/api/brand-configs/${encodeURIComponent(brandKey)}`,
    );
    return normalizeBrandConfig(response.data.data);
  },

  async updateBrandConfig(brandKey: string, payload: UpdateBrandConfigPayload): Promise<BrandConfig> {
    const response = await apiClient.put<ApiResponse<BrandConfigApiItem>>(
      `/api/brand-configs/${encodeURIComponent(brandKey)}`,
      payload,
    );
    return normalizeBrandConfig(response.data.data);
  },
};
