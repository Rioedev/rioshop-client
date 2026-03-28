import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "./apiClient";

export type RealtimeNotificationPayload = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  imageUrl?: string;
  link?: string;
  isRead: boolean;
  readAt?: string;
  channel: string[];
  createdAt?: string;
};

export type RealtimeOrderPayload = {
  action: string;
  source?: string;
  orderId: string;
  orderNumber?: string;
  status?: string;
  paymentStatus?: string;
  updatedAt?: string;
};

export type RealtimeInventoryPayload = {
  action: string;
  source?: string;
  productId: string;
  variantSku?: string;
  onHand?: number;
  reserved?: number;
  available?: number;
  incoming?: number;
  orderId?: string;
  updatedAt?: string;
};

export type RealtimeFlashSalePayload = {
  action: string;
  source?: string;
  flashSaleId: string;
  isActive?: boolean;
  updatedAt?: string;
};

type AdminRealtimeHandlers = {
  onOrderUpdated?: (payload: RealtimeOrderPayload) => void;
  onInventoryUpdated?: (payload: RealtimeInventoryPayload) => void;
  onFlashSaleUpdated?: (payload: RealtimeFlashSalePayload) => void;
};

const SOCKET_BASE_URL = (import.meta.env.VITE_SOCKET_URL ?? API_BASE_URL).replace(/\/$/, "");
const ACTIVE_CHANNEL_EVENTS = ["notification", "order-updated", "inventory-updated", "flash-sale-updated"] as const;

let socketClient: Socket | null = null;

const getSocketClient = () => {
  if (!socketClient) {
    socketClient = io(SOCKET_BASE_URL, {
      autoConnect: false,
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }

  return socketClient;
};

const shouldDisconnectSocket = (socket: Socket) =>
  !ACTIVE_CHANNEL_EVENTS.some((eventName) => socket.listeners(eventName).length > 0);

const normalizeOrderPayload = (payload: Partial<RealtimeOrderPayload>): RealtimeOrderPayload => ({
  action: payload.action?.toString().trim() || "updated",
  source: payload.source?.toString().trim(),
  orderId: payload.orderId?.toString().trim() || "",
  orderNumber: payload.orderNumber?.toString().trim(),
  status: payload.status?.toString().trim(),
  paymentStatus: payload.paymentStatus?.toString().trim(),
  updatedAt: payload.updatedAt?.toString(),
});

const normalizeInventoryPayload = (
  payload: Partial<RealtimeInventoryPayload>,
): RealtimeInventoryPayload => ({
  action: payload.action?.toString().trim() || "updated",
  source: payload.source?.toString().trim(),
  productId: payload.productId?.toString().trim() || "",
  variantSku: payload.variantSku?.toString().trim(),
  onHand: Number.isFinite(Number(payload.onHand)) ? Number(payload.onHand) : undefined,
  reserved: Number.isFinite(Number(payload.reserved)) ? Number(payload.reserved) : undefined,
  available: Number.isFinite(Number(payload.available)) ? Number(payload.available) : undefined,
  incoming: Number.isFinite(Number(payload.incoming)) ? Number(payload.incoming) : undefined,
  orderId: payload.orderId?.toString().trim(),
  updatedAt: payload.updatedAt?.toString(),
});

const normalizeFlashSalePayload = (
  payload: Partial<RealtimeFlashSalePayload>,
): RealtimeFlashSalePayload => ({
  action: payload.action?.toString().trim() || "updated",
  source: payload.source?.toString().trim(),
  flashSaleId: payload.flashSaleId?.toString().trim() || "",
  isActive: payload.isActive === undefined ? undefined : Boolean(payload.isActive),
  updatedAt: payload.updatedAt?.toString(),
});

export const subscribeUserNotifications = (
  userId: string,
  onNotification: (payload: RealtimeNotificationPayload) => void,
) => {
  const normalizedUserId = userId?.toString().trim();
  if (!normalizedUserId) {
    return () => undefined;
  }

  const socket = getSocketClient();

  const joinUserRoom = () => {
    socket.emit("join-user", normalizedUserId);
  };

  const handleNotification = (payload: { notification?: Partial<RealtimeNotificationPayload> }) => {
    const item = payload?.notification;
    if (!item) {
      return;
    }

    onNotification({
      id: item.id?.toString().trim() || "",
      userId: item.userId?.toString().trim() || normalizedUserId,
      type: item.type?.toString().trim() || "system",
      title: item.title?.toString() || "",
      body: item.body?.toString() || "",
      imageUrl: item.imageUrl?.toString(),
      link: item.link?.toString(),
      isRead: Boolean(item.isRead),
      readAt: item.readAt?.toString(),
      channel: Array.isArray(item.channel) ? item.channel.map((value) => value.toString()) : ["in_app"],
      createdAt: item.createdAt?.toString(),
    });
  };

  socket.on("connect", joinUserRoom);
  socket.on("notification", handleNotification);

  if (socket.connected) {
    joinUserRoom();
  } else {
    socket.connect();
  }

  return () => {
    socket.emit("leave-user", normalizedUserId);
    socket.off("connect", joinUserRoom);
    socket.off("notification", handleNotification);

    if (shouldDisconnectSocket(socket)) {
      socket.disconnect();
    }
  };
};

export const subscribeAdminRealtime = (handlers: AdminRealtimeHandlers) => {
  const socket = getSocketClient();

  const joinAdminRoom = () => {
    socket.emit("join-admin");
  };

  const handleOrderUpdated = (payload: Partial<RealtimeOrderPayload>) => {
    handlers.onOrderUpdated?.(normalizeOrderPayload(payload || {}));
  };

  const handleInventoryUpdated = (payload: Partial<RealtimeInventoryPayload>) => {
    handlers.onInventoryUpdated?.(normalizeInventoryPayload(payload || {}));
  };

  const handleFlashSaleUpdated = (payload: Partial<RealtimeFlashSalePayload>) => {
    handlers.onFlashSaleUpdated?.(normalizeFlashSalePayload(payload || {}));
  };

  socket.on("connect", joinAdminRoom);
  socket.on("order-updated", handleOrderUpdated);
  socket.on("inventory-updated", handleInventoryUpdated);
  socket.on("flash-sale-updated", handleFlashSaleUpdated);

  if (socket.connected) {
    joinAdminRoom();
  } else {
    socket.connect();
  }

  return () => {
    socket.emit("leave-admin");
    socket.off("connect", joinAdminRoom);
    socket.off("order-updated", handleOrderUpdated);
    socket.off("inventory-updated", handleInventoryUpdated);
    socket.off("flash-sale-updated", handleFlashSaleUpdated);

    if (shouldDisconnectSocket(socket)) {
      socket.disconnect();
    }
  };
};
