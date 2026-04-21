import { create } from "zustand";
import { getErrorMessage } from "../utils/errorMessage";
import {
  type GetOrdersQueryParams,
  orderService,
  type OrderRecord,
  type OrderStatus,
  type PaginatedOrdersData,
  type PaymentStatus,
  type SyncActiveShipmentsResult,
  type SyncShipmentResult,
  type UpdateReturnRequestStatusPayload,
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
  getOrderById: (id: string) => Promise<OrderRecord>;
  updateOrderStatus: (id: string, payload: UpdateOrderStatusPayload) => Promise<void>;
  updateReturnRequestStatus: (
    id: string,
    payload: UpdateReturnRequestStatusPayload,
  ) => Promise<OrderRecord>;
  cancelOrder: (id: string, note?: string) => Promise<void>;
  syncShipmentFromGhn: (shipmentId: string) => Promise<SyncShipmentResult>;
  syncActiveGhnShipments: (limit?: number) => Promise<SyncActiveShipmentsResult>;
  fetchOrders: (params?: GetOrdersQueryParams) => Promise<PaginatedOrdersData>;
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

  getOrderById: async (id) => {
    try {
      return await orderService.getOrderById(id);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

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

  updateReturnRequestStatus: async (id, payload) => {
    set({ saving: true });
    try {
      return await orderService.updateReturnRequestStatus(id, payload);
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

  syncShipmentFromGhn: async (shipmentId) => {
    try {
      return await orderService.syncShipmentFromGhn(shipmentId);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  syncActiveGhnShipments: async (limit = 30) => {
    try {
      return await orderService.syncActiveGhnShipments(limit);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  fetchOrders: async (params = {}) => {
    try {
      return await orderService.getOrders(params);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
}));


