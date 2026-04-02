import { apiClient } from "./apiClient";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type GhnProvince = {
  ProvinceID: number;
  ProvinceName: string;
  NameExtension?: string[];
};

export type GhnDistrict = {
  DistrictID: number;
  DistrictName: string;
  ProvinceID?: number;
  NameExtension?: string[];
};

export type GhnWard = {
  WardCode: string;
  WardName: string;
  DistrictID?: number;
  NameExtension?: string[];
};

export type ShippingMethod = "standard" | "express" | "same_day";

export type ShippingPolicy = {
  freeShipEnabled: boolean;
  freeShipThreshold: number;
  freeShipEligibleMethods: ShippingMethod[];
  sameDayFlatFee: number;
  ghnFallbackStandardFee: number;
  ghnFallbackExpressFee: number;
};

export type GhnFeePayload = {
  toDistrictId: number;
  toWardCode: string;
  shippingMethod?: ShippingMethod;
  subtotal?: number;
  insuranceValue?: number;
  packageProfile?: {
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
  };
};

export type GhnFeeResult = {
  totalFee: number;
  shippingMethod?: ShippingMethod;
  subtotal?: number;
  rawShippingFee?: number;
  shippingFeePayable?: number;
  freeShipDiscount?: number;
  isEligibleForFreeShip?: boolean;
  remainingToFreeShip?: number;
  freeShipProgress?: number;
  freeShipApplicableMethod?: boolean;
  freeShipEnabled?: boolean;
  freeShipThreshold?: number;
  freeShipEligibleMethods?: ShippingMethod[];
  sameDayFlatFee?: number;
  ghnFallbackStandardFee?: number;
  ghnFallbackExpressFee?: number;
  data: Record<string, unknown>;
  raw: Record<string, unknown>;
};

export const shippingService = {
  async getShippingPolicy(): Promise<ShippingPolicy> {
    const response = await apiClient.get<ApiResponse<ShippingPolicy>>("/api/shipments/policy");
    return response.data.data;
  },

  async getGhnProvinces(): Promise<GhnProvince[]> {
    const response = await apiClient.get<ApiResponse<GhnProvince[]>>(
      "/api/shipments/ghn/provinces",
    );
    return response.data.data || [];
  },

  async getGhnDistricts(provinceId: number): Promise<GhnDistrict[]> {
    const response = await apiClient.get<ApiResponse<GhnDistrict[]>>(
      "/api/shipments/ghn/districts",
      {
        params: { provinceId },
      },
    );
    return response.data.data || [];
  },

  async getGhnWards(districtId: number): Promise<GhnWard[]> {
    const response = await apiClient.get<ApiResponse<GhnWard[]>>("/api/shipments/ghn/wards", {
      params: { districtId },
    });
    return response.data.data || [];
  },

  async calculateGhnFee(payload: GhnFeePayload): Promise<GhnFeeResult> {
    const response = await apiClient.post<ApiResponse<GhnFeeResult>>(
      "/api/shipments/ghn/fee",
      payload,
    );
    return response.data.data;
  },
};
