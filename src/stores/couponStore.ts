import { create } from "zustand";
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
import { runStoreTaskWithFlag } from "./storeAsync";

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

    await runStoreTaskWithFlag(set, "loading", async () => {
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
    });
  },

  createCoupon: async (payload) => {
    await runStoreTaskWithFlag(set, "saving", async () => {
      await couponService.createCoupon(payload);
      const state = get();
      await state.loadCoupons({
        page: 1,
        limit: state.pageSize,
        keyword: state.keyword,
        type: state.typeFilter,
        isActive: state.activeFilter,
      });
    });
  },

  updateCoupon: async (id, payload) => {
    await runStoreTaskWithFlag(set, "saving", async () => {
      await couponService.updateCoupon(id, payload);
      const state = get();
      await state.loadCoupons({
        page: state.page,
        limit: state.pageSize,
        keyword: state.keyword,
        type: state.typeFilter,
        isActive: state.activeFilter,
      });
    });
  },

  deleteCoupon: async (id) => {
    await runStoreTaskWithFlag(set, "saving", async () => {
      await couponService.deleteCoupon(id);
      const state = get();
      await state.loadCoupons({
        page: state.page,
        limit: state.pageSize,
        keyword: state.keyword,
        type: state.typeFilter,
        isActive: state.activeFilter,
      });
    });
  },

  findCouponByCode: async (code) => {
    await runStoreTaskWithFlag(set, "findingByCode", async () => {
      const coupon = await couponService.getCouponByCode(code);
      set({ selectedCoupon: coupon });
    });
  },

  validateCoupon: async (payload) => {
    await runStoreTaskWithFlag(set, "validating", async () => {
      const result = await couponService.validateCoupon(payload);
      set({ validationResult: result });
    });
  },

  setKeyword: (keyword) => set({ keyword }),
  setTypeFilter: (typeFilter) => set({ typeFilter }),
  setActiveFilter: (activeFilter) => set({ activeFilter }),
  clearSelectedCoupon: () => set({ selectedCoupon: null }),
  clearValidationResult: () => set({ validationResult: null }),
}));


