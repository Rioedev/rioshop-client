import { apiClient } from "./apiClient";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  fullName: string;
};

type AuthResponse = {
  user: AuthUser;
  token: string;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>("/api/auth/login", payload);
    return response.data.data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      "/api/auth/register",
      payload,
    );
    return response.data.data;
  },

  async getCurrentUser(): Promise<AuthUser> {
    const response = await apiClient.get<ApiResponse<AuthUser>>("/api/auth/me");
    return response.data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post("/api/auth/logout");
  },
};

