import { BellOutlined } from "@ant-design/icons";
import { Button, Empty, Modal, Switch, Tag, message } from "antd";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../stores/authStore";
import { useNotificationStore } from "../../../stores/notificationStore";
import { storeButtonClassNames } from "./StorePageChrome";

const TYPE_LABEL_MAP = {
  order_update: "Cập nhật đơn hàng",
  promo: "Khuyến mãi",
  loyalty: "Điểm thưởng",
  review_reply: "Phản hồi đánh giá",
  system: "Hệ thống",
};

const TYPE_COLOR_MAP = {
  order_update: "blue",
  promo: "magenta",
  loyalty: "gold",
  review_reply: "purple",
  system: "default",
};

const formatDateTime = (value?: string) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

type StoreNotificationsModalProps = {
  open: boolean;
  onClose: () => void;
};

export function StoreNotificationsModal({ open, onClose }: StoreNotificationsModalProps) {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const notifications = useNotificationStore((state) => state.notifications);
  const loading = useNotificationStore((state) => state.loading);
  const saving = useNotificationStore((state) => state.saving);
  const page = useNotificationStore((state) => state.page);
  const pageSize = useNotificationStore((state) => state.pageSize);
  const total = useNotificationStore((state) => state.total);
  const unreadOnly = useNotificationStore((state) => state.unreadOnly);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const loadNotifications = useNotificationStore((state) => state.loadNotifications);
  const setUnreadOnly = useNotificationStore((state) => state.setUnreadOnly);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const deleteNotification = useNotificationStore((state) => state.deleteNotification);

  useEffect(() => {
    if (!open || !isAuthenticated) {
      return;
    }

    void loadNotifications({ page: 1, pageSize: 8, unreadOnly: false }).catch((error) => {
      messageApi.error(error instanceof Error ? error.message : "Không tải được thông báo.");
    });
  }, [isAuthenticated, loadNotifications, messageApi, open]);

  const handleToggleUnread = async (checked: boolean) => {
    setUnreadOnly(checked);
    try {
      await loadNotifications({
        page: 1,
        pageSize,
        unreadOnly: checked,
      });
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "Không lọc được thông báo.");
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "Không đánh dấu đã đọc được.");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      messageApi.success("Đã đánh dấu tất cả thông báo là đã đọc.");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "Không xử lý được yêu cầu.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      messageApi.success("Đã xóa thông báo.");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "Không xóa được thông báo.");
    }
  };

  const handleOpenLink = (href: string) => {
    onClose();
    navigate(href);
  };

  return (
    <>
      {contextHolder}
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        width={760}
        title="Thông báo của bạn"
        destroyOnHidden
      >
        {!isAuthenticated ? (
          <div className="space-y-4 py-2">
            <p className="m-0 text-sm text-slate-600">
              Vui lòng đăng nhập để xem thông báo đơn hàng, thanh toán và khuyến mãi.
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="primary"
                className={storeButtonClassNames.primaryCompact}
                onClick={() => {
                  onClose();
                  navigate("/login");
                }}
              >
                Đăng nhập
              </Button>
              <Button onClick={onClose}>Đóng</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>Chưa đọc: {unreadCount}</span>
                <span className="text-slate-300">|</span>
                <span>Tổng: {total}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Chỉ hiện chưa đọc</span>
                <Switch
                  checked={unreadOnly}
                  onChange={(checked) => void handleToggleUnread(checked)}
                  disabled={loading || saving}
                />
                <Button
                  size="small"
                  className={storeButtonClassNames.secondaryCompact}
                  disabled={saving || unreadCount <= 0}
                  onClick={() => void handleMarkAllAsRead()}
                >
                  Đánh dấu tất cả đã đọc
                </Button>
              </div>
            </div>

            {notifications.length === 0 && !loading ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={unreadOnly ? "Không còn thông báo chưa đọc." : "Chưa có thông báo nào."}
              />
            ) : (
              <div className="max-h-[58vh] space-y-3 overflow-auto pr-1">
                {notifications.map((item) => (
                  <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Tag color={TYPE_COLOR_MAP[item.type] || "default"}>
                            {TYPE_LABEL_MAP[item.type] || "Hệ thống"}
                          </Tag>
                          <Tag color={item.isRead ? "green" : "gold"}>{item.isRead ? "Đã đọc" : "Chưa đọc"}</Tag>
                          <span className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</span>
                        </div>
                        <p className="m-0 text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="m-0 mt-1 text-sm text-slate-600">{item.body}</p>
                      </div>
                      <BellOutlined className="text-base text-slate-400" />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {!item.isRead ? (
                        <Button size="small" onClick={() => void handleMarkAsRead(item.id)}>
                          Đánh dấu đã đọc
                        </Button>
                      ) : null}
                      {item.link ? (
                        <Button size="small" onClick={() => handleOpenLink(item.link || "/")}>
                          Mở liên kết
                        </Button>
                      ) : null}
                      <Button size="small" danger onClick={() => void handleDelete(item.id)}>
                        Xóa
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {total > pageSize ? (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                <span>
                  Trang {page} - Hiển thị {notifications.length}/{total}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="small"
                    disabled={page <= 1 || loading}
                    onClick={() =>
                      void loadNotifications({
                        page: page - 1,
                        pageSize,
                        unreadOnly,
                      })
                    }
                  >
                    Trước
                  </Button>
                  <Button
                    size="small"
                    disabled={page * pageSize >= total || loading}
                    onClick={() =>
                      void loadNotifications({
                        page: page + 1,
                        pageSize,
                        unreadOnly,
                      })
                    }
                  >
                    Sau
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Modal>
    </>
  );
}
