import { AxiosError } from "axios";
import { create } from "zustand";
import {
  orderService,
  type OrderRecord,
  type OrderStatus,
  type PaymentStatus,
  type UpdateOrderStatusPayload,
} from "../services/orderService";

type OrderStoreState = {
  orders: OrderRecord[];
  loading: boolean;
  saving: boolean;
  page: number;
  pageSize: number;
  total: number;
  statusFilter: OrderStatus | "all";
  paymentStatusFilter: PaymentStatus | "all";
  loadOrders: (params?: {
    page?: number;
    pageSize?: number;
    statusFilter?: OrderStatus | "all";
    paymentStatusFilter?: PaymentStatus | "all";
  }) => Promise<void>;
  setStatusFilter: (statusFilter: OrderStatus | "all") => void;
  setPaymentStatusFilter: (paymentStatusFilter: PaymentStatus | "all") => void;
  updateOrderStatus: (id: string, payload: UpdateOrderStatusPayload) => Promise<void>;
  cancelOrder: (id: string, note?: string) => Promise<void>;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof AxiosError) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Yêu cầu thất bại";
};

export const useOrderStore = create<OrderStoreState>((set, get) => ({
  orders: [],
  loading: false,
  saving: false,
  page: 1,
  pageSize: 10,
  total: 0,
  statusFilter: "all",
  paymentStatusFilter: "all",

  loadOrders: async (params) => {
    const state = get();
    const nextPage = params?.page ?? state.page;
    const nextPageSize = params?.pageSize ?? state.pageSize;
    const nextStatusFilter = params?.statusFilter ?? state.statusFilter;
    const nextPaymentStatusFilter = params?.paymentStatusFilter ?? state.paymentStatusFilter;

    set({ loading: true });
    try {
      const result = await orderService.getOrders({
        page: nextPage,
        limit: nextPageSize,
        status: nextStatusFilter,
        paymentStatus: nextPaymentStatusFilter,
      });

      set({
        orders: result.docs,
        total: result.totalDocs,
        page: result.page,
        pageSize: result.limit,
        statusFilter: nextStatusFilter,
        paymentStatusFilter: nextPaymentStatusFilter,
      });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ loading: false });
    }
  },

  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setPaymentStatusFilter: (paymentStatusFilter) => set({ paymentStatusFilter }),

  updateOrderStatus: async (id, payload) => {
    set({ saving: true });
    try {
      await orderService.updateOrderStatus(id, payload);
      const state = get();
      await state.loadOrders({
        page: state.page,
        pageSize: state.pageSize,
        statusFilter: state.statusFilter,
        paymentStatusFilter: state.paymentStatusFilter,
      });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },

  cancelOrder: async (id, note) => {
    set({ saving: true });
    try {
      await orderService.cancelOrder(id, note);
      const state = get();
      await state.loadOrders({
        page: state.page,
        pageSize: state.pageSize,
        statusFilter: state.statusFilter,
        paymentStatusFilter: state.paymentStatusFilter,
      });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },
}));
