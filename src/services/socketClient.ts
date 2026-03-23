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

const SOCKET_BASE_URL = (import.meta.env.VITE_SOCKET_URL ?? API_BASE_URL).replace(/\/$/, "");

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

    const hasNotificationListeners = socket.listeners("notification").length > 0;
    if (!hasNotificationListeners) {
      socket.disconnect();
    }
  };
};
