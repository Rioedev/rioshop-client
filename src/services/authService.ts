import { apiClient } from "./apiClient";

export type AccountType = "user" | "admin";
export type AdminRole = "superadmin" | "manager" | "warehouse" | "cs" | "marketer" | "sales";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  accountType: AccountType;
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

export type ChangePasswordPayload = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  userId: string;
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
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
    return {
      user: {
        ...response.data.data.user,
        role: "user",
        accountType: "user",
      },
      token: response.data.data.token,
    };
  },

  async loginAdmin(payload: LoginPayload): Promise<AuthResponse> {
    type AdminApiAuthResponse = {
      admin: {
        id: string;
        email: string;
        fullName: string;
        role: AdminRole;
      };
      token: string;
    };

    const response = await apiClient.post<ApiResponse<AdminApiAuthResponse>>(
      "/api/admins/login",
      payload,
    );

    return {
      user: {
        id: response.data.data.admin.id,
        email: response.data.data.admin.email,
        fullName: response.data.data.admin.fullName,
        role: response.data.data.admin.role,
        accountType: "admin",
      },
      token: response.data.data.token,
    };
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      "/api/auth/register",
      payload,
    );
    return {
      user: {
        ...response.data.data.user,
        role: "user",
        accountType: "user",
      },
      token: response.data.data.token,
    };
  },

  async getCurrentUser(accountType: AccountType): Promise<AuthUser> {
    if (accountType === "admin") {
      type AdminMeResponse = {
        _id: string;
        email: string;
        fullName: string;
        role: AdminRole;
      };
      const response = await apiClient.get<ApiResponse<AdminMeResponse>>("/api/admins/me");

      return {
        id: response.data.data._id,
        email: response.data.data.email,
        fullName: response.data.data.fullName,
        role: response.data.data.role,
        accountType: "admin",
      };
    }

    type UserMeResponse = {
      _id?: string;
      id?: string;
      email: string;
      fullName: string;
      phone?: string;
    };
    const response = await apiClient.get<ApiResponse<UserMeResponse>>("/api/auth/me");

    return {
      id: response.data.data.id ?? response.data.data._id ?? "",
      email: response.data.data.email,
      fullName: response.data.data.fullName,
      phone: response.data.data.phone,
      role: "user",
      accountType: "user",
    };
  },

  async logout(accountType: AccountType): Promise<void> {
    if (accountType === "admin") {
      await apiClient.post("/api/admins/logout");
      return;
    }

    await apiClient.post("/api/auth/logout");
  },

  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await apiClient.post("/api/auth/change-password", payload);
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
    await apiClient.post("/api/auth/forgot-password", payload);
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    await apiClient.post("/api/auth/reset-password", payload);
  },
};
