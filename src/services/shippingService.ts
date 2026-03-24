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

export type GhnFeePayload = {
  toDistrictId: number;
  toWardCode: string;
  shippingMethod?: "standard" | "express" | "same_day";
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
  data: Record<string, unknown>;
  raw: Record<string, unknown>;
};

export const shippingService = {
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

