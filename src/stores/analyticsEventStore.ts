import { AxiosError } from "axios";
import { create } from "zustand";
import {
  analyticsEventService,
  type AnalyticsDashboardData,
  type AnalyticsEvent,
  type AnalyticsEventType,
} from "../services/analyticsEventService";

type AnalyticsEventState = {
  events: AnalyticsEvent[];
  loading: boolean;
  dashboardLoading: boolean;
  page: number;
  pageSize: number;
  total: number;
  eventFilter?: AnalyticsEventType;
  startDate?: string;
  endDate?: string;
  dashboard: AnalyticsDashboardData | null;
  loadEvents: (params?: {
    page?: number;
    pageSize?: number;
    eventFilter?: AnalyticsEventType;
    startDate?: string;
    endDate?: string;
  }) => Promise<void>;
  loadDashboard: (params?: { startDate?: string; endDate?: string }) => Promise<void>;
  setEventFilter: (eventFilter?: AnalyticsEventType) => void;
  setDateRange: (startDate?: string, endDate?: string) => void;
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

export const useAnalyticsEventStore = create<AnalyticsEventState>((set, get) => ({
  events: [],
  loading: false,
  dashboardLoading: false,
  page: 1,
  pageSize: 20,
  total: 0,
  eventFilter: undefined,
  startDate: undefined,
  endDate: undefined,
  dashboard: null,

  loadEvents: async (params) => {
    const state = get();
    const nextPage = params?.page ?? state.page;
    const nextPageSize = params?.pageSize ?? state.pageSize;
    const nextEventFilter = params?.eventFilter ?? state.eventFilter;
    const nextStartDate = params?.startDate ?? state.startDate;
    const nextEndDate = params?.endDate ?? state.endDate;

    set({ loading: true });
    try {
      const result = await analyticsEventService.getAnalyticsEvents({
        page: nextPage,
        limit: nextPageSize,
        event: nextEventFilter,
        startDate: nextStartDate,
        endDate: nextEndDate,
      });

      set({
        events: result.docs,
        total: result.totalDocs,
        page: result.page,
        pageSize: result.limit,
        eventFilter: nextEventFilter,
        startDate: nextStartDate,
        endDate: nextEndDate,
      });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ loading: false });
    }
  },

  loadDashboard: async (params) => {
    const state = get();
    const nextStartDate = params?.startDate ?? state.startDate;
    const nextEndDate = params?.endDate ?? state.endDate;

    set({ dashboardLoading: true });
    try {
      const result = await analyticsEventService.getAnalyticsDashboard({
        startDate: nextStartDate,
        endDate: nextEndDate,
      });
      set({ dashboard: result });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ dashboardLoading: false });
    }
  },

  setEventFilter: (eventFilter) => set({ eventFilter }),
  setDateRange: (startDate, endDate) => set({ startDate, endDate }),
}));
