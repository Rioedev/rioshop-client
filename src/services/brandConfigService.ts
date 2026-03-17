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

export type StorefrontHomeMetric = {
  value: string;
  label: string;
};

export type StorefrontHomeValueProp = {
  title: string;
  text: string;
  iconKey?: string | null;
};

export type StorefrontHomeContent = {
  hero?: {
    kicker?: string | null;
    titleLine1?: string | null;
    titleLine2?: string | null;
    description?: string | null;
    primaryCtaLabel?: string | null;
    secondaryCtaLabel?: string | null;
    dealDescription?: string | null;
    sideKicker?: string | null;
    sideTitleLine1?: string | null;
    sideTitleLine2?: string | null;
    sideDescription?: string | null;
    dealCtaLabel?: string | null;
    sideCtaLabel?: string | null;
    metrics?: StorefrontHomeMetric[];
  };
  sections?: {
    categoriesMiniTitle?: string | null;
    categoriesTitle?: string | null;
    categoriesLinkLabel?: string | null;
    flashSaleMiniTitle?: string | null;
    flashSaleTitle?: string | null;
    flashSaleLinkLabel?: string | null;
    productsMiniTitle?: string | null;
    productsTitle?: string | null;
    productsLinkLabel?: string | null;
  };
  labels?: {
    flashDeal?: string | null;
    soldPercentPrefix?: string | null;
    soldOutSoon?: string | null;
    dealFallbackTitle?: string | null;
    buyDeal?: string | null;
    exploreNow?: string | null;
    noCategories?: string | null;
    noFlashSales?: string | null;
    noProducts?: string | null;
    loadingCategories?: string | null;
    loadingFlashSales?: string | null;
    loadingProducts?: string | null;
  };
  valueProps?: StorefrontHomeValueProp[];
  journal?: {
    kicker?: string | null;
    titleLine1?: string | null;
    titleLine2?: string | null;
    description?: string | null;
    ctaLabel?: string | null;
  };
  member?: {
    kicker?: string | null;
    title?: string | null;
    description?: string | null;
    emailPlaceholder?: string | null;
    ctaLabel?: string | null;
  };
  apiNotice?: string | null;
};

export type BrandConfigStorefront = {
  home?: StorefrontHomeContent;
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
  storefront?: BrandConfigStorefront;
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
  storefront?: BrandConfigStorefront;
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
  storefront: BrandConfigStorefront;
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
  storefront: item.storefront,
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
