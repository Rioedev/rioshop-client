import { create } from "zustand";
import {
  notificationService,
  type NotificationItem,
} from "../services/notificationService";
import { getErrorMessage } from "../utils/errorMessage";

type NotificationState = {
  notifications: NotificationItem[];
  loading: boolean;
  saving: boolean;
  page: number;
  pageSize: number;
  total: number;
  unreadOnly: boolean;
  unreadCount: number;
  loadNotifications: (params?: { page?: number; pageSize?: number; unreadOnly?: boolean }) => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  setUnreadOnly: (unreadOnly: boolean) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  applyRealtimeNotification: (payload: { isRead?: boolean }) => void;
  reset: () => void;
};

let unreadCountRequest: Promise<number> | null = null;
let lastUnreadCountFetchedAt = 0;
const UNREAD_COUNT_REFRESH_MIN_GAP_MS = 1200;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  loading: false,
  saving: false,
  page: 1,
  pageSize: 10,
  total: 0,
  unreadOnly: false,
  unreadCount: 0,

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

  refreshUnreadCount: async () => {
    const now = Date.now();
    if (now - lastUnreadCountFetchedAt < UNREAD_COUNT_REFRESH_MIN_GAP_MS) {
      return;
    }

    if (unreadCountRequest) {
      try {
        const unreadCount = await unreadCountRequest;
        set({ unreadCount });
        return;
      } catch (error) {
        throw new Error(getErrorMessage(error));
      }
    }

    try {
      unreadCountRequest = notificationService.getUnreadCount();
      const unreadCount = await unreadCountRequest;
      set({ unreadCount });
      lastUnreadCountFetchedAt = Date.now();
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      unreadCountRequest = null;
    }
  },

  setUnreadOnly: (unreadOnly) => set({ unreadOnly }),

  markAsRead: async (id) => {
    set({ saving: true });
    try {
      const wasUnread = get().notifications.some((item) => item.id === id && !item.isRead);
      await notificationService.markAsRead(id);
      const state = get();
      await state.loadNotifications({
        page: state.page,
        pageSize: state.pageSize,
        unreadOnly: state.unreadOnly,
      });
      if (wasUnread) {
        set((current) => ({
          unreadCount: Math.max(0, current.unreadCount - 1),
        }));
      }
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },

  markAllAsRead: async () => {
    set({ saving: true });
    try {
      await notificationService.markAllAsRead();
      const state = get();
      await state.loadNotifications({
        page: 1,
        pageSize: state.pageSize,
        unreadOnly: state.unreadOnly,
      });
      set({ unreadCount: 0 });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },

  deleteNotification: async (id) => {
    set({ saving: true });
    try {
      const wasUnread = get().notifications.some((item) => item.id === id && !item.isRead);
      await notificationService.deleteNotification(id);
      const state = get();
      await state.loadNotifications({
        page: state.page,
        pageSize: state.pageSize,
        unreadOnly: state.unreadOnly,
      });
      if (wasUnread) {
        set((current) => ({
          unreadCount: Math.max(0, current.unreadCount - 1),
        }));
      }
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ saving: false });
    }
  },

  applyRealtimeNotification: (payload) =>
    set((state) => {
      if (payload?.isRead) {
        return state;
      }
      return {
        unreadCount: state.unreadCount + 1,
      };
    }),

  reset: () =>
    set(() => {
      unreadCountRequest = null;
      lastUnreadCountFetchedAt = 0;
      return {
        notifications: [],
        loading: false,
        saving: false,
        page: 1,
        pageSize: 10,
        total: 0,
        unreadOnly: false,
        unreadCount: 0,
      };
    }),
}));

