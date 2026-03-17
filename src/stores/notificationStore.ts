import { AxiosError } from "axios";
import { create } from "zustand";
import {
  notificationService,
  type NotificationItem,
} from "../services/notificationService";

type NotificationState = {
  notifications: NotificationItem[];
  loading: boolean;
  saving: boolean;
  page: number;
  pageSize: number;
  total: number;
  unreadOnly: boolean;
  loadNotifications: (params?: { page?: number; pageSize?: number; unreadOnly?: boolean }) => Promise<void>;
  setUnreadOnly: (unreadOnly: boolean) => void;
  markAsRead: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
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

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  loading: false,
  saving: false,
  page: 1,
  pageSize: 10,
  total: 0,
  unreadOnly: false,

  loadNotifications: async (params) => {
    const state = get();
    const nextPage = params?.page ?? state.page;
    const nextPageSize = params?.pageSize ?? state.pageSize;
    const nextUnreadOnly = params?.unreadOnly ?? state.unreadOnly;

    set({ loading: true });
    try {
      const result = await notificationService.getNotifications({
        page: nextPage,
        limit: nextPageSize,
        unreadOnly: nextUnreadOnly,
      });

      set({
        notifications: result.docs,
        total: result.totalDocs,
        page: result.page,
        pageSize: result.limit,
        unreadOnly: nextUnreadOnly,
      });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ loading: false });
    }
  },

  setUnreadOnly: (unreadOnly) => set({ unreadOnly }),

  markAsRead: async (id) => {
    set({ saving: true });
    try {
      await notificationService.markAsRead(id);
      const state = get();
      await state.loadNotifications({
        page: state.page,
        pageSize: state.pageSize,
        unreadOnly: state.unreadOnly,
      });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },

  deleteNotification: async (id) => {
    set({ saving: true });
    try {
      await notificationService.deleteNotification(id);
      const state = get();
      await state.loadNotifications({
        page: state.page,
        pageSize: state.pageSize,
        unreadOnly: state.unreadOnly,
      });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },
}));
