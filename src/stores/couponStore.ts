import { AxiosError } from "axios";
import { create } from "zustand";
import {
  couponService,
  type Coupon,
  type CouponValidationResult,
  type ValidateCouponPayload,
} from "../services/couponService";

type CouponState = {
  coupons: Coupon[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  selectedCoupon: Coupon | null;
  findingByCode: boolean;
  validationResult: CouponValidationResult | null;
  validating: boolean;
  loadCoupons: (params?: { page?: number; pageSize?: number }) => Promise<void>;
  findCouponByCode: (code: string) => Promise<void>;
  validateCoupon: (payload: ValidateCouponPayload) => Promise<void>;
  clearSelectedCoupon: () => void;
  clearValidationResult: () => void;
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

export const useCouponStore = create<CouponState>((set, get) => ({
  coupons: [],
  loading: false,
  page: 1,
  pageSize: 10,
  total: 0,
  selectedCoupon: null,
  findingByCode: false,
  validationResult: null,
  validating: false,

  loadCoupons: async (params) => {
    const state = get();
    const nextPage = params?.page ?? state.page;
    const nextPageSize = params?.pageSize ?? state.pageSize;

    set({ loading: true });
    try {
      const result = await couponService.getActiveCoupons(nextPage, nextPageSize);
      set({
        coupons: result.docs,
        total: result.totalDocs,
        page: result.page,
        pageSize: result.limit,
      });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ loading: false });
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

  clearSelectedCoupon: () => set({ selectedCoupon: null }),
  clearValidationResult: () => set({ validationResult: null }),
}));
