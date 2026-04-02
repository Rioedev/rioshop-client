import { AxiosError } from "axios";
import { create } from "zustand";
import { getErrorMessage } from "../utils/errorMessage";
import {
  customerUserService,
  type CreateCustomerPayload,
  type CustomerLoyaltyTierFilter,
  type CustomerStatus,
  type CustomerStatusFilter,
  type CustomerUser,
  type UpdateCustomerPayload,
} from "../services/customerUserService";

export type CustomerDeletedFilter = "active_only" | "deleted_only";

type CustomerUserState = {
  customers: CustomerUser[];
  loading: boolean;
  saving: boolean;
  isForbidden: boolean;
  page: number;
  pageSize: number;
  total: number;
  keyword: string;
  statusFilter: CustomerStatusFilter;
  loyaltyTierFilter: CustomerLoyaltyTierFilter;
  deletedFilter: CustomerDeletedFilter;
  loadCustomers: (params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    statusFilter?: CustomerStatusFilter;
    loyaltyTierFilter?: CustomerLoyaltyTierFilter;
    deletedFilter?: CustomerDeletedFilter;
  }) => Promise<void>;
  setKeyword: (keyword: string) => void;
  setStatusFilter: (statusFilter: CustomerStatusFilter) => void;
  setLoyaltyTierFilter: (loyaltyTierFilter: CustomerLoyaltyTierFilter) => void;
  setDeletedFilter: (deletedFilter: CustomerDeletedFilter) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  createCustomer: (payload: CreateCustomerPayload) => Promise<void>;
  updateCustomer: (id: string, payload: UpdateCustomerPayload) => Promise<void>;
  updateCustomerStatus: (id: string, status: CustomerStatus) => Promise<void>;
  softDeleteCustomer: (id: string) => Promise<void>;
};

export const useCustomerUserStore = create<CustomerUserState>((set, get) => ({
  customers: [],
  loading: false,
  saving: false,
  isForbidden: false,
  page: 1,
  pageSize: 10,
  total: 0,
  keyword: "",
  statusFilter: "all",
  loyaltyTierFilter: "all",
  deletedFilter: "active_only",

  loadCustomers: async (params) => {
    const state = get();
    const nextPage = params?.page ?? state.page;
    const nextPageSize = params?.pageSize ?? state.pageSize;
    const nextKeyword = params?.keyword ?? state.keyword;
    const nextStatusFilter = params?.statusFilter ?? state.statusFilter;
    const nextLoyaltyTierFilter = params?.loyaltyTierFilter ?? state.loyaltyTierFilter;
    const nextDeletedFilter = params?.deletedFilter ?? state.deletedFilter;

    set({ loading: true });
    try {
      const result = await customerUserService.getCustomers({
        page: nextPage,
        limit: nextPageSize,
        search: nextKeyword,
        status: nextStatusFilter,
        loyaltyTier: nextLoyaltyTierFilter,
        isDeleted: nextDeletedFilter === "deleted_only" ? true : undefined,
      });

      set({
        customers: result.docs,
        total: result.totalDocs,
        page: result.page,
        pageSize: result.limit,
        keyword: nextKeyword,
        statusFilter: nextStatusFilter,
        loyaltyTierFilter: nextLoyaltyTierFilter,
        deletedFilter: nextDeletedFilter,
        isForbidden: false,
      });
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 403) {
        set({
          customers: [],
          total: 0,
          isForbidden: true,
          page: nextPage,
          pageSize: nextPageSize,
          keyword: nextKeyword,
          statusFilter: nextStatusFilter,
          loyaltyTierFilter: nextLoyaltyTierFilter,
          deletedFilter: nextDeletedFilter,
        });
        return;
      }

      throw new Error(getErrorMessage(error));
    } finally {
      set({ loading: false });
    }
  },

  setKeyword: (keyword) => set({ keyword }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setLoyaltyTierFilter: (loyaltyTierFilter) => set({ loyaltyTierFilter }),
  setDeletedFilter: (deletedFilter) => set({ deletedFilter }),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize }),

  createCustomer: async (payload) => {
    set({ saving: true });
    try {
      await customerUserService.createCustomer(payload);
      await get().loadCustomers();
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },

  updateCustomer: async (id, payload) => {
    set({ saving: true });
    try {
      await customerUserService.updateCustomer(id, payload);
      await get().loadCustomers();
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },

  updateCustomerStatus: async (id, status) => {
    set({ saving: true });
    try {
      await customerUserService.updateCustomerStatus(id, status);
      await get().loadCustomers();
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },

  softDeleteCustomer: async (id) => {
    set({ saving: true });
    try {
      await customerUserService.softDeleteCustomer(id);
      await get().loadCustomers();
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },
}));


