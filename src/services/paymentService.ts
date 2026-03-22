import { apiClient } from "./apiClient";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type PaymentMethod = "momo" | "vnpay" | "zalopay" | "cod" | "bank_transfer" | "card";

export type PaymentRecord = {
  _id?: string;
  id?: string;
  orderId?: string | { _id?: string };
  method?: PaymentMethod;
  gateway?: string;
  gatewayTxId?: string;
  amount?: number;
  currency?: string;
  status?: "pending" | "success" | "failed" | "refunded";
  paidAt?: string;
  gatewayResponse?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type InitiatePaymentPayload = {
  orderId: string;
  method: PaymentMethod;
  amount?: number;
  currency?: string;
  returnUrl?: string;
  ipnUrl?: string;
};

export type InitiatePaymentResult = {
  payment: PaymentRecord;
  gatewayResponse?: Record<string, unknown>;
};

export const paymentService = {
  async createPayment(payload: InitiatePaymentPayload): Promise<InitiatePaymentResult> {
    const response = await apiClient.post<ApiResponse<InitiatePaymentResult>>("/api/payments", payload);
    return response.data.data;
  },

  async processWebhook(provider: "momo" | "vnpay" | "zalopay", payload: Record<string, unknown>): Promise<PaymentRecord> {
    const response = await apiClient.post<ApiResponse<PaymentRecord>>(`/api/payments/webhook/${provider}`, payload);
    return response.data.data;
  },

  async getPaymentById(paymentId: string): Promise<PaymentRecord> {
    const response = await apiClient.get<ApiResponse<PaymentRecord>>(`/api/payments/${paymentId}`);
    return response.data.data;
  },
};
