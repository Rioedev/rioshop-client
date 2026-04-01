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

type UnreadCountApiData = {
  unreadCount?: number;
};

const MOJIBAKE_PATTERN = /(Ã.|Â.|Ä.|Å.|Æ.|áº|á»|â€|â€œ|â€|â€“|â€”|â€¦)/;
const VIETNAMESE_CHAR_PATTERN =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/g;

const countVietnameseChars = (value: string): number => (value.match(VIETNAMESE_CHAR_PATTERN) || []).length;

const repairMojibakeText = (value?: string): string => {
  const input = value?.toString() || "";
  if (!input || !MOJIBAKE_PATTERN.test(input)) {
    return input;
  }

  try {
    const bytes = new Uint8Array(input.length);
    for (let index = 0; index < input.length; index += 1) {
      bytes[index] = input.charCodeAt(index) & 0xff;
    }

    const decoded = new TextDecoder("utf-8").decode(bytes);
    if (!decoded || decoded.includes("�")) {
      return input;
    }

    const inputVnCount = countVietnameseChars(input);
    const decodedVnCount = countVietnameseChars(decoded);
    if (decodedVnCount < inputVnCount) {
      return input;
    }

    return decoded;
  } catch {
    return input;
  }
};

const normalizeNotification = (item: NotificationApiItem): NotificationItem => ({
  id: item.id ?? item._id ?? "",
  userId: item.userId,
  type: item.type,
  title: repairMojibakeText(item.title),
  body: repairMojibakeText(item.body),
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

  async markAllAsRead(): Promise<{ matchedCount: number; modifiedCount: number }> {
    const response = await apiClient.put<ApiResponse<{ matchedCount?: number; modifiedCount?: number }>>(
      "/api/notifications/read-all",
    );

    return {
      matchedCount: Number(response.data.data?.matchedCount || 0),
      modifiedCount: Number(response.data.data?.modifiedCount || 0),
    };
  },

  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<ApiResponse<UnreadCountApiData>>("/api/notifications/unread-count");
    return Math.max(0, Number(response.data.data?.unreadCount || 0));
  },

  async deleteNotification(id: string): Promise<NotificationItem> {
    const response = await apiClient.delete<ApiResponse<NotificationApiItem>>(`/api/notifications/${id}`);
    return normalizeNotification(response.data.data);
  },
};
