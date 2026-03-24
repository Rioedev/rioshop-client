import { apiClient } from "./apiClient";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type UserAddressApi = {
  id?: string;
  label?: string;
  fullName: string;
  phone: string;
  province?: {
    code?: string;
    name?: string;
  };
  district?: {
    code?: string;
    name?: string;
  };
  ward?: {
    code?: string;
    name?: string;
  };
  street: string;
  isDefault?: boolean;
};

type UserProfileApi = {
  _id?: string;
  id?: string;
  email: string;
  phone?: string;
  fullName: string;
  avatar?: string;
  gender?: "male" | "female" | "other";
  dateOfBirth?: string;
  addresses?: UserAddressApi[];
  defaultAddressId?: string;
};

export type UserAddress = {
  id: string;
  label?: string;
  fullName: string;
  phone: string;
  province?: {
    code?: string;
    name?: string;
  };
  district?: {
    code?: string;
    name?: string;
  };
  ward?: {
    code?: string;
    name?: string;
  };
  street: string;
  isDefault?: boolean;
};

export type UserProfile = {
  id: string;
  email: string;
  phone?: string;
  fullName: string;
  avatar?: string;
  gender?: "male" | "female" | "other";
  dateOfBirth?: string;
  addresses: UserAddress[];
  defaultAddressId?: string;
};

export type UpdateUserProfilePayload = Partial<{
  fullName: string;
  email: string;
  phone: string;
  avatar: string;
  gender: "male" | "female" | "other";
  dateOfBirth: string | null;
  defaultAddressId: string;
  addresses: UserAddress[];
}>;

const normalizeAddress = (item: UserAddressApi, index: number): UserAddress => ({
  id: item.id?.trim() || `addr_${Date.now()}_${index}`,
  label: item.label?.trim() || undefined,
  fullName: item.fullName,
  phone: item.phone,
  province: item.province
    ? {
        code: item.province.code?.trim() || undefined,
        name: item.province.name?.trim() || undefined,
      }
    : undefined,
  district: item.district
    ? {
        code: item.district.code?.trim() || undefined,
        name: item.district.name?.trim() || undefined,
      }
    : undefined,
  ward: item.ward
    ? {
        code: item.ward.code?.trim() || undefined,
        name: item.ward.name?.trim() || undefined,
      }
    : undefined,
  street: item.street,
  isDefault: Boolean(item.isDefault),
});

const normalizeProfile = (data: UserProfileApi): UserProfile => ({
  id: data.id ?? data._id ?? "",
  email: data.email,
  phone: data.phone,
  fullName: data.fullName,
  avatar: data.avatar,
  gender: data.gender,
  dateOfBirth: data.dateOfBirth,
  addresses: (data.addresses ?? []).map(normalizeAddress),
  defaultAddressId: data.defaultAddressId,
});

export const userProfileService = {
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get<ApiResponse<UserProfileApi>>("/api/users/profile");
    return normalizeProfile(response.data.data);
  },

  async updateProfile(payload: UpdateUserProfilePayload): Promise<UserProfile> {
    const response = await apiClient.put<ApiResponse<UserProfileApi>>("/api/users/profile", payload);
    return normalizeProfile(response.data.data);
  },
};

