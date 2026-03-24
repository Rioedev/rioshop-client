import { AxiosError } from "axios";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Rate,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import type { ReviewItem, ReviewStatus } from "../../../services/reviewService";
import { useReviewStore } from "../../../stores/reviewStore";

const { Paragraph, Text, Title } = Typography;

type ReplyFormValues = {
  body: string;
};

const STATUS_LABEL_MAP: Record<ReviewStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

const STATUS_COLOR_MAP: Record<ReviewStatus, string> = {
  pending: "gold",
  approved: "green",
  rejected: "red",
};

const FIT_LABEL_MAP: Record<string, string> = {
  true_to_size: "Đúng size",
  runs_small: "Nhỏ hơn size chuẩn",
  runs_large: "Lớn hơn size chuẩn",
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

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

export function AdminReviewsPage() {
  const [replyForm] = Form.useForm<ReplyFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [productIdInput, setProductIdInput] = useState("");
  const [searchText, setSearchText] = useState("");
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [replyingReview, setReplyingReview] = useState<ReviewItem | null>(null);

  const productId = useReviewStore((state) => state.productId);
  const reviews = useReviewStore((state) => state.reviews);
  const stats = useReviewStore((state) => state.stats);
  const loading = useReviewStore((state) => state.loading);
  const saving = useReviewStore((state) => state.saving);
  const page = useReviewStore((state) => state.page);
  const pageSize = useReviewStore((state) => state.pageSize);
  const total = useReviewStore((state) => state.total);
  const includePending = useReviewStore((state) => state.includePending);
  const includeRejected = useReviewStore((state) => state.includeRejected);
  const loadReviews = useReviewStore((state) => state.loadReviews);
  const setProductId = useReviewStore((state) => state.setProductId);
  const setIncludePending = useReviewStore((state) => state.setIncludePending);
  const setIncludeRejected = useReviewStore((state) => state.setIncludeRejected);
  const updateReviewStatus = useReviewStore((state) => state.updateReviewStatus);
  const replyReview = useReviewStore((state) => state.replyReview);
  const deleteReview = useReviewStore((state) => state.deleteReview);

  useEffect(() => {
    setProductIdInput(productId);
  }, [productId]);

  useEffect(() => {
    void loadReviews({
      page: 1,
      pageSize,
      includePending,
      includeRejected,
    }).catch((error) => {
      messageApi.error(getErrorMessage(error));
    });
    // Load initial list once when entering page.
    // Filter toggles trigger their own reload handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadReviews, messageApi, pageSize]);

  const filteredReviews = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return reviews;

    return reviews.filter((review) =>
      (review.title ?? "").toLowerCase().includes(keyword) ||
      review.body.toLowerCase().includes(keyword) ||
      (review.user?.fullName ?? "").toLowerCase().includes(keyword) ||
      (review.product?.name ?? "").toLowerCase().includes(keyword) ||
      STATUS_LABEL_MAP[review.status].toLowerCase().includes(keyword),
    );
  }, [reviews, searchText]);

  const handleLoadReviews = async () => {
    const normalizedProductId = productIdInput.trim();

    setProductId(normalizedProductId);
    try {
      await loadReviews({
        productId: normalizedProductId || undefined,
        page: 1,
        pageSize,
        includePending,
        includeRejected,
      });
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleTogglePending = async (checked: boolean) => {
    setIncludePending(checked);

    try {
      await loadReviews({
        productId: productId.trim() || undefined,
        page: 1,
        pageSize,
        includePending: checked,
        includeRejected,
      });
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleToggleRejected = async (checked: boolean) => {
    setIncludeRejected(checked);

    try {
      await loadReviews({
        productId: productId.trim() || undefined,
        page: 1,
        pageSize,
        includePending,
        includeRejected: checked,
      });
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleUpdateStatus = async (id: string, status: ReviewStatus) => {
    try {
      await updateReviewStatus(id, status);
      messageApi.success("Cập nhật trạng thái bình luận thành công.");
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleDeleteReview = async (id: string) => {
    try {
      await deleteReview(id);
      messageApi.success("Xóa bình luận thành công.");
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const openReplyModal = (review: ReviewItem) => {
    setReplyingReview(review);
    replyForm.setFieldsValue({
      body: review.adminReply?.body ?? "",
    });
    setIsReplyModalOpen(true);
  };

  const closeReplyModal = () => {
    setReplyingReview(null);
    setIsReplyModalOpen(false);
    replyForm.resetFields();
  };

  const handleSubmitReply = async () => {
    if (!replyingReview) return;

    try {
      const values = await replyForm.validateFields();
      await replyReview(replyingReview.id, values.body.trim());
      messageApi.success("Phản hồi bình luận thành công.");
      closeReplyModal();
    } catch (error) {
      if (error instanceof Error && "errorFields" in error) {
        return;
      }
      messageApi.error(getErrorMessage(error));
    }
  };

  const columns: ColumnsType<ReviewItem> = [
    {
      title: "Sản phẩm",
      key: "product",
      width: 250,
      render: (_, record) => (
        <div>
          <div>{record.product?.name ?? "Sản phẩm không xác định"}</div>
          <Text type="secondary">{record.productId}</Text>
        </div>
      ),
    },
    {
      title: "Khách hàng",
      key: "user",
      width: 220,
      render: (_, record) => (
        <div>
          <div>{record.user?.fullName ?? "Khách ẩn danh"}</div>
          <Text type="secondary">{record.userId}</Text>
        </div>
      ),
    },
    {
      title: "Đánh giá",
      key: "rating",
      width: 190,
      render: (_, record) => (
        <div>
          <Rate value={record.rating} disabled />
          <div>
            <Text type="secondary">
              {record.fit ? FIT_LABEL_MAP[record.fit] ?? record.fit : "Không có thông tin size"}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Nội dung",
      key: "content",
      width: 380,
      render: (_, record) => (
        <div className="space-y-1">
          <Text strong>{record.title || "(Không có tiêu đề)"}</Text>
          <div>
            <Text>{record.body}</Text>
          </div>
          {record.adminReply?.body ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <Text strong>Phản hồi admin:</Text>
              <div>
                <Text type="secondary">{record.adminReply.body}</Text>
              </div>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 140,
      render: (_, record) => (
        <Tag color={STATUS_COLOR_MAP[record.status]}>{STATUS_LABEL_MAP[record.status]}</Tag>
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
      width: 260,
      render: (_, record) => (
        <Space wrap>
          <Button
            size="small"
            onClick={() => void handleUpdateStatus(record.id, "approved")}
            disabled={record.status === "approved" || saving}
          >
            Duyệt
          </Button>
          <Button
            size="small"
            danger
            onClick={() => void handleUpdateStatus(record.id, "rejected")}
            disabled={record.status === "rejected" || saving}
          >
            Từ chối
          </Button>
          <Button
            size="small"
            onClick={() => openReplyModal(record)}
            disabled={saving}
          >
            Phản hồi
          </Button>
          <Popconfirm
            title="Xóa bình luận"
            description="Bạn có chắc muốn xóa bình luận này?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => void handleDeleteReview(record.id)}
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
          Quản lý bình luận sản phẩm
        </Title>
        <Paragraph className="mb-0!" type="secondary">
          Duyệt, từ chối, phản hồi hoặc xóa bình luận theo từng sản phẩm.
        </Paragraph>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            value={productIdInput}
            onChange={(event) => setProductIdInput(event.target.value)}
            allowClear
            placeholder="Lọc theo Product ID (để trống = tất cả sản phẩm)"
            className="min-w-[320px] max-w-[520px]"
          />
          <Button type="primary" onClick={() => void handleLoadReviews()} loading={loading}>
            Tải bình luận
          </Button>
          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            allowClear
            placeholder="Tìm theo khách hàng, sản phẩm, nội dung, trạng thái"
            className="min-w-[280px] max-w-[420px]"
          />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-6">
          <Space>
            <Text>Hiển thị chờ duyệt</Text>
            <Switch
              checked={includePending}
              checkedChildren="Bật"
              unCheckedChildren="Tắt"
              onChange={(checked) => void handleTogglePending(checked)}
              disabled={loading || saving}
            />
          </Space>
          <Space>
            <Text>Hiển thị từ chối</Text>
            <Switch
              checked={includeRejected}
              checkedChildren="Bật"
              unCheckedChildren="Tắt"
              onChange={(checked) => void handleToggleRejected(checked)}
              disabled={loading || saving}
            />
          </Space>
          <Text type="secondary">
            Trung bình: {stats.avg.toFixed(2)} sao | Tổng duyệt: {stats.count}
          </Text>
        </div>

        <Table<ReviewItem>
          rowKey="id"
          columns={columns}
          dataSource={filteredReviews}
          loading={loading || saving}
          scroll={{ x: 1800 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (value) => `Tổng ${value} bình luận`,
          }}
          onChange={(pagination: TablePaginationConfig) => {
            const nextPage = pagination.current ?? page;
            const nextPageSize = pagination.pageSize ?? pageSize;
            void loadReviews({
              productId: productId.trim() || undefined,
              page: nextPage,
              pageSize: nextPageSize,
              includePending,
              includeRejected,
            }).catch((error) => {
              messageApi.error(getErrorMessage(error));
            });
          }}
        />
      </Card>

      <Modal
        title="Phản hồi bình luận"
        open={isReplyModalOpen}
        onCancel={closeReplyModal}
        onOk={() => void handleSubmitReply()}
        okText="Lưu phản hồi"
        cancelText="Hủy"
        confirmLoading={saving}
      >
        <Form form={replyForm} layout="vertical">
          <Form.Item
            label="Nội dung phản hồi"
            name="body"
            rules={[
              { required: true, message: "Vui lòng nhập nội dung phản hồi." },
              { min: 3, message: "Nội dung phản hồi tối thiểu 3 ký tự." },
            ]}
          >
            <Input.TextArea rows={5} placeholder="Nhập phản hồi dành cho khách hàng..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
