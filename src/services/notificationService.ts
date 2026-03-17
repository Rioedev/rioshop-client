import { apiClient } from "./apiClient";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type NotificationType = "order_update" | "promo" | "loyalty" | "review_reply" | "system";
export type NotificationChannel = "in_app" | "push" | "email" | "sms";

type NotificationApiItem = {
  _id?: string;
  id?: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  imageUrl?: string;
  link?: string;
  isRead?: boolean;
  readAt?: string;
  channel?: NotificationChannel[];
  createdAt?: string;
};

export type NotificationItem = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  imageUrl?: string;
  link?: string;
  isRead: boolean;
  readAt?: string;
  channel: NotificationChannel[];
  createdAt?: string;
};

type PaginatedNotificationApiData = {
  docs: NotificationApiItem[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasPrevPage?: boolean;
  hasNextPage?: boolean;
};

export type PaginatedNotificationData = {
  docs: NotificationItem[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
};

export type NotificationQueryParams = {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
};

const normalizeNotification = (item: NotificationApiItem): NotificationItem => ({
  id: item.id ?? item._id ?? "",
  userId: item.userId,
  type: item.type,
  title: item.title,
  body: item.body,
  imageUrl: item.imageUrl,
  link: item.link,
  isRead: Boolean(item.isRead),
  readAt: item.readAt,
  channel: item.channel ?? ["in_app"],
  createdAt: item.createdAt,
});

const normalizePaginatedData = (data: PaginatedNotificationApiData): PaginatedNotificationData => ({
  docs: data.docs.map(normalizeNotification),
  totalDocs: data.totalDocs,
  limit: data.limit,
  page: data.page,
  totalPages: data.totalPages,
  hasPrevPage: Boolean(data.hasPrevPage),
  hasNextPage: Boolean(data.hasNextPage),
});

export const notificationService = {
  async getNotifications(params: NotificationQueryParams = {}): Promise<PaginatedNotificationData> {
    const response = await apiClient.get<ApiResponse<PaginatedNotificationApiData>>(
      "/api/notifications",
      {
        params: {
          page: params.page,
          limit: params.limit,
          unreadOnly: params.unreadOnly,
        },
      },
    );

    return normalizePaginatedData(response.data.data);
  },

  async markAsRead(id: string): Promise<NotificationItem> {
    const response = await apiClient.put<ApiResponse<NotificationApiItem>>(`/api/notifications/${id}/read`);
    return normalizeNotification(response.data.data);
  },

  async deleteNotification(id: string): Promise<NotificationItem> {
    const response = await apiClient.delete<ApiResponse<NotificationApiItem>>(`/api/notifications/${id}`);
    return normalizeNotification(response.data.data);
  },
};
