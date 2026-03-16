import { apiClient } from "./apiClient";
import type { AdminRole } from "./authService";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type AdminAccountApiItem = {
  _id?: string;
  id?: string;
  email: string;
  fullName: string;
  role: AdminRole;
  permissions?: string[];
  isActive?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminAccount = {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateAdminAccountPayload = {
  email: string;
  password: string;
  fullName: string;
  role: AdminRole;
  permissions?: string[];
};

export type UpdateAdminAccountPayload = Partial<
  Pick<CreateAdminAccountPayload, "fullName" | "role" | "permissions"> & {
    isActive: boolean;
  }
>;

const normalizeAdminAccount = (item: AdminAccountApiItem): AdminAccount => ({
  id: item.id ?? item._id ?? "",
  email: item.email,
  fullName: item.fullName,
  role: item.role,
  permissions: item.permissions ?? [],
  isActive: item.isActive ?? true,
  lastLoginAt: item.lastLoginAt,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

export const adminAccountService = {
  async getAdminAccounts(): Promise<AdminAccount[]> {
    const response = await apiClient.get<ApiResponse<AdminAccountApiItem[]>>("/api/admins");
    return response.data.data.map(normalizeAdminAccount);
  },

  async createAdminAccount(payload: CreateAdminAccountPayload): Promise<AdminAccount> {
    const response = await apiClient.post<ApiResponse<AdminAccountApiItem>>("/api/admins", payload);
    return normalizeAdminAccount(response.data.data);
  },

  async updateAdminAccount(id: string, payload: UpdateAdminAccountPayload): Promise<AdminAccount> {
    const response = await apiClient.put<ApiResponse<AdminAccountApiItem>>(`/api/admins/${id}`, payload);
    return normalizeAdminAccount(response.data.data);
  },

  async deleteAdminAccount(id: string): Promise<void> {
    await apiClient.delete(`/api/admins/${id}`);
  },
};
