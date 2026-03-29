import { create } from "zustand";
import { getErrorMessage } from "../utils/errorMessage";
import {
  couponService,
  type Coupon,
  type CouponType,
  type CouponUpdatePayload,
  type CouponUpsertPayload,
  type CouponValidationResult,
  type GetAdminCouponsParams,
  type ValidateCouponPayload,
} from "../services/couponService";

type CouponState = {
  coupons: Coupon[];
  loading: boolean;
  saving: boolean;
  page: number;
  pageSize: number;
  total: number;
  keyword: string;
  typeFilter: CouponType | "all";
  activeFilter: "all" | "active" | "inactive";
  selectedCoupon: Coupon | null;
  findingByCode: boolean;
  validationResult: CouponValidationResult | null;
  validating: boolean;
  loadCoupons: (params?: GetAdminCouponsParams) => Promise<void>;
  createCoupon: (payload: CouponUpsertPayload) => Promise<void>;
  updateCoupon: (id: string, payload: CouponUpdatePayload) => Promise<void>;
  deleteCoupon: (id: string) => Promise<void>;
  findCouponByCode: (code: string) => Promise<void>;
  validateCoupon: (payload: ValidateCouponPayload) => Promise<void>;
  setKeyword: (keyword: string) => void;
  setTypeFilter: (type: CouponType | "all") => void;
  setActiveFilter: (active: "all" | "active" | "inactive") => void;
  clearSelectedCoupon: () => void;
  clearValidationResult: () => void;
};

export const useCouponStore = create<CouponState>((set, get) => ({
  coupons: [],
  loading: false,
  saving: false,
  page: 1,
  pageSize: 10,
  total: 0,
  keyword: "",
  typeFilter: "all",
  activeFilter: "all",
  selectedCoupon: null,
  findingByCode: false,
  validationResult: null,
  validating: false,

  loadCoupons: async (params) => {
    const state = get();
    const nextPage = params?.page ?? state.page;
    const nextPageSize = params?.limit ?? state.pageSize;
    const nextKeyword = params?.keyword ?? state.keyword;
    const nextType = params?.type ?? state.typeFilter;
    const nextActiveFilter = params?.isActive ?? state.activeFilter;

    set({ loading: true });
    try {
      const result = await couponService.getAdminCoupons({
        page: nextPage,
        limit: nextPageSize,
        keyword: nextKeyword,
        type: nextType,
        isActive: nextActiveFilter,
      });
      set({
        coupons: result.docs,
        total: result.totalDocs,
        page: result.page,
        pageSize: result.limit,
        keyword: nextKeyword,
        typeFilter: nextType,
        activeFilter: nextActiveFilter,
      });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ loading: false });
    }
  },

  createCoupon: async (payload) => {
    set({ saving: true });
    try {
      await couponService.createCoupon(payload);
      const state = get();
      await state.loadCoupons({
        page: 1,
        limit: state.pageSize,
        keyword: state.keyword,
        type: state.typeFilter,
        isActive: state.activeFilter,
      });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },

  updateCoupon: async (id, payload) => {
    set({ saving: true });
    try {
      await couponService.updateCoupon(id, payload);
      const state = get();
      await state.loadCoupons({
        page: state.page,
        limit: state.pageSize,
        keyword: state.keyword,
        type: state.typeFilter,
        isActive: state.activeFilter,
      });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },

  deleteCoupon: async (id) => {
    set({ saving: true });
    try {
      await couponService.deleteCoupon(id);
      const state = get();
      await state.loadCoupons({
        page: state.page,
        limit: state.pageSize,
        keyword: state.keyword,
        type: state.typeFilter,
        isActive: state.activeFilter,
      });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },

  findCouponByCode: async (code) => {
    set({ findingByCode: true });
    try {
      const coupon = await couponService.getCouponByCode(code);
      set({ selectedCoupon: coupon });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ findingByCode: false });
    }
  },

  validateCoupon: async (payload) => {
    set({ validating: true });
    try {
      const result = await couponService.validateCoupon(payload);
      set({ validationResult: result });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ validating: false });
    }
  },

  setKeyword: (keyword) => set({ keyword }),
  setTypeFilter: (typeFilter) => set({ typeFilter }),
  setActiveFilter: (activeFilter) => set({ activeFilter }),
  clearSelectedCoupon: () => set({ selectedCoupon: null }),
  clearValidationResult: () => set({ validationResult: null }),
}));


