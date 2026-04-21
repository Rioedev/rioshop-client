import { create } from "zustand";
import {
  notificationService,
  type NotificationItem,
} from "../services/notificationService";
import { runStoreTask, runStoreTaskWithFlag } from "./storeAsync";

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

    await runStoreTaskWithFlag(set, "loading", async () => {
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
    });
  },

  refreshUnreadCount: async () => {
    const now = Date.now();
    if (now - lastUnreadCountFetchedAt < UNREAD_COUNT_REFRESH_MIN_GAP_MS) {
      return;
    }

    if (unreadCountRequest) {
      const unreadCount = await runStoreTask(async () => unreadCountRequest as Promise<number>);
      set({ unreadCount });
      return;
    }

    unreadCountRequest = notificationService.getUnreadCount();
    try {
      const unreadCount = await runStoreTask(async () => unreadCountRequest as Promise<number>);
      set({ unreadCount });
      lastUnreadCountFetchedAt = Date.now();
    } finally {
      unreadCountRequest = null;
    }
  },

  setUnreadOnly: (unreadOnly) => set({ unreadOnly }),

  markAsRead: async (id) => {
    await runStoreTaskWithFlag(set, "saving", async () => {
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
    });
  },

  markAllAsRead: async () => {
    await runStoreTaskWithFlag(set, "saving", async () => {
      await notificationService.markAllAsRead();
      const state = get();
      await state.loadNotifications({
        page: 1,
        pageSize: state.pageSize,
        unreadOnly: state.unreadOnly,
      });
      set({ unreadCount: 0 });
    });
  },

  deleteNotification: async (id) => {
    await runStoreTaskWithFlag(set, "saving", async () => {
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
    });
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

