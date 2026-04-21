import { create } from "zustand";
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
import { runStoreTask, runStoreTaskWithFlag } from "./storeAsync";

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

    await runStoreTaskWithFlag(set, "loading", async () => {
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
    });
  },

  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setPaymentStatusFilter: (paymentStatusFilter) => set({ paymentStatusFilter }),

  getOrderById: async (id) => {
    return runStoreTask(() => orderService.getOrderById(id));
  },

  updateOrderStatus: async (id, payload) => {
    await runStoreTaskWithFlag(set, "saving", async () => {
      await orderService.updateOrderStatus(id, payload);
      const state = get();
      await state.loadOrders({
        page: state.page,
        pageSize: state.pageSize,
        statusFilter: state.statusFilter,
        paymentStatusFilter: state.paymentStatusFilter,
      });
    });
  },

  updateReturnRequestStatus: async (id, payload) => {
    return runStoreTaskWithFlag(set, "saving", async () => {
      return await orderService.updateReturnRequestStatus(id, payload);
    });
  },

  cancelOrder: async (id, note) => {
    await runStoreTaskWithFlag(set, "saving", async () => {
      await orderService.cancelOrder(id, note);
      const state = get();
      await state.loadOrders({
        page: state.page,
        pageSize: state.pageSize,
        statusFilter: state.statusFilter,
        paymentStatusFilter: state.paymentStatusFilter,
      });
    });
  },

  syncShipmentFromGhn: async (shipmentId) => {
    return runStoreTask(() => orderService.syncShipmentFromGhn(shipmentId));
  },

  syncActiveGhnShipments: async (limit = 30) => {
    return runStoreTask(() => orderService.syncActiveGhnShipments(limit));
  },

  fetchOrders: async (params = {}) => {
    return runStoreTask(() => orderService.getOrders(params));
  },
}));


