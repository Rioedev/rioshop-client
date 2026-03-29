import {
  Button,
  Card,
  Input,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import type { NotificationChannel, NotificationItem, NotificationType } from "../../../services/notificationService";
import { useNotificationStore } from "../../../stores/notificationStore";
import { getErrorMessage } from "../../../utils/errorMessage";

const { Paragraph, Text, Title } = Typography;

const TYPE_LABEL_MAP: Record<NotificationType, string> = {
  order_update: "Cập nhật đơn hàng",
  promo: "Khuyến mãi",
  loyalty: "Điểm thưởng",
  review_reply: "Phản hồi đánh giá",
  system: "Hệ thống",
};

const TYPE_COLOR_MAP: Record<NotificationType, string> = {
  order_update: "blue",
  promo: "magenta",
  loyalty: "gold",
  review_reply: "purple",
  system: "default",
};

const CHANNEL_LABEL_MAP: Record<NotificationChannel, string> = {
  in_app: "Trong ứng dụng",
  push: "Đẩy",
  email: "Email",
  sms: "SMS",
};

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

export function AdminNotificationsPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [searchText, setSearchText] = useState("");

  const notifications = useNotificationStore((state) => state.notifications);
  const loading = useNotificationStore((state) => state.loading);
  const saving = useNotificationStore((state) => state.saving);
  const page = useNotificationStore((state) => state.page);
  const pageSize = useNotificationStore((state) => state.pageSize);
  const total = useNotificationStore((state) => state.total);
  const unreadOnly = useNotificationStore((state) => state.unreadOnly);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const loadNotifications = useNotificationStore((state) => state.loadNotifications);
  const refreshUnreadCount = useNotificationStore((state) => state.refreshUnreadCount);
  const setUnreadOnly = useNotificationStore((state) => state.setUnreadOnly);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const deleteNotification = useNotificationStore((state) => state.deleteNotification);

  useEffect(() => {
    void loadNotifications({ page: 1, pageSize: 10, unreadOnly: false }).catch((error) => {
      messageApi.error(getErrorMessage(error));
    });
    void refreshUnreadCount().catch(() => undefined);
  }, [loadNotifications, messageApi, refreshUnreadCount]);

  const filteredNotifications = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return notifications;

    return notifications.filter((item) =>
      item.title.toLowerCase().includes(keyword) ||
      item.body.toLowerCase().includes(keyword) ||
      TYPE_LABEL_MAP[item.type].toLowerCase().includes(keyword),
    );
  }, [notifications, searchText]);

  const handleToggleUnreadOnly = async (checked: boolean) => {
    setUnreadOnly(checked);
    try {
      await loadNotifications({ page: 1, pageSize, unreadOnly: checked });
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      messageApi.success("Đã đánh dấu thông báo là đã đọc.");
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotification(id);
      messageApi.success("Đã xóa thông báo.");
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      messageApi.success("Đã đánh dấu tất cả thông báo là đã đọc.");
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const columns: ColumnsType<NotificationItem> = [
    {
      title: "Nội dung",
      key: "content",
      width: 420,
      render: (_, record) => (
        <div className="space-y-1">
          <Text strong>{record.title}</Text>
          <div>
            <Text type="secondary">{record.body}</Text>
          </div>
        </div>
      ),
    },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      width: 170,
      render: (type: NotificationType) => <Tag color={TYPE_COLOR_MAP[type]}>{TYPE_LABEL_MAP[type]}</Tag>,
    },
    {
      title: "Kênh",
      dataIndex: "channel",
      key: "channel",
      width: 230,
      render: (channels: NotificationChannel[]) => (
        <Space wrap>
          {channels.map((channel) => (
            <Tag key={channel}>{CHANNEL_LABEL_MAP[channel]}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "isRead",
      key: "isRead",
      width: 120,
      render: (isRead: boolean) => (
        <Tag color={isRead ? "green" : "gold"}>
          {isRead ? "Đã đọc" : "Chưa đọc"}
        </Tag>
      ),
    },
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (value?: string) => formatDateTime(value),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 170,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            onClick={() => void handleMarkAsRead(record.id)}
            disabled={record.isRead || saving}
          >
            Đánh dấu đã đọc
          </Button>
          <Popconfirm
            title="Xóa thông báo"
            description="Bạn có chắc muốn xóa thông báo này?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => void handleDeleteNotification(record.id)}
            disabled={saving}
          >
            <Button size="small" danger disabled={saving}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {contextHolder}

      <div>
        <Title level={3} className="mb-1! mt-0!">
          Quản lý thông báo
        </Title>
        <Paragraph className="mb-0!" type="secondary">
          Theo dõi danh sách thông báo của tài khoản hiện tại, lọc thông báo chưa đọc và xử lý nhanh ngay trên bảng.
        </Paragraph>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Space wrap>
            <Input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              allowClear
              placeholder="Tìm theo tiêu đề, nội dung hoặc loại thông báo"
              className="min-w-[280px] max-w-[420px]"
            />
            <Space>
              <Text>Lọc chưa đọc</Text>
              <Switch
                checked={unreadOnly}
                checkedChildren="Bật"
                unCheckedChildren="Tắt"
                onChange={(checked) => void handleToggleUnreadOnly(checked)}
                disabled={loading || saving}
              />
            </Space>
          </Space>
          <Space>
            <Tag color={unreadCount > 0 ? "gold" : "green"}>
              Chưa đọc: {unreadCount}
            </Tag>
            <Button onClick={() => void handleMarkAllAsRead()} disabled={saving || unreadCount <= 0}>
              Đánh dấu tất cả đã đọc
            </Button>
          </Space>
        </div>

        <Table<NotificationItem>
          rowKey="id"
          columns={columns}
          dataSource={filteredNotifications}
          loading={loading || saving}
          scroll={{ x: 1300 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (value) => `Tổng ${value} thông báo`,
          }}
          onChange={(pagination: TablePaginationConfig) => {
            const nextPage = pagination.current ?? page;
            const nextPageSize = pagination.pageSize ?? pageSize;
            void loadNotifications({
              page: nextPage,
              pageSize: nextPageSize,
              unreadOnly,
            }).catch((error) => {
              messageApi.error(getErrorMessage(error));
            });
          }}
        />
      </Card>
    </div>
  );
}


