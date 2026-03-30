import {
  Button,
  Card,
  Form,
  Image,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import { InboxOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import type { UploadProps } from "antd/es/upload";
import { useCallback, useEffect, useState } from "react";
import { RichTextEditor } from "../../../components/editor/RichTextEditor";
import { blogService, type BlogPayload, type BlogPost } from "../../../services/blogService";
import { ensureImageFile, getImageValidationError } from "../../../services/mediaUploadService";
import { getErrorMessage } from "../../../utils/errorMessage";

const { Text, Title } = Typography;

type BlogFilter = "all" | "published" | "unpublished";

type BlogFormValues = {
  title: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  coverImage?: string;
  tagsText?: string;
  authorName?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  publishedAt?: string;
};

const BLOG_STATUS_OPTIONS: Array<{ label: string; value: BlogFilter }> = [
  { label: "Tất cả bài viết", value: "all" },
  { label: "Đã xuất bản", value: "published" },
  { label: "Bản nháp", value: "unpublished" },
];

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

const toDateTimeLocalValue = (value?: string) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - localOffsetMs).toISOString().slice(0, 16);
};

const parseTagsText = (value?: string) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const resolvePublishedFilter = (value: BlogFilter): boolean | "all" => {
  if (value === "published") return true;
  if (value === "unpublished") return false;
  return "all";
};

export function AdminBlogsPage() {
  const [form] = Form.useForm<BlogFormValues>();
  const [messageApi, contextHolder] = message.useMessage();

  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<BlogFilter>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [uploadedCoverUrl, setUploadedCoverUrl] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchText(searchText.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  const loadBlogs = useCallback(async (params?: {
    nextPage?: number;
    nextPageSize?: number;
    nextKeyword?: string;
    nextFilter?: BlogFilter;
  }) => {
    const resolvedPage = params?.nextPage ?? page;
    const resolvedPageSize = params?.nextPageSize ?? pageSize;
    const resolvedKeyword = params?.nextKeyword ?? debouncedSearchText;
    const resolvedFilter = params?.nextFilter ?? statusFilter;

    setLoading(true);
    try {
      const result = await blogService.getBlogs({
        page: resolvedPage,
        limit: resolvedPageSize,
        q: resolvedKeyword || undefined,
        isPublished: resolvePublishedFilter(resolvedFilter),
      });
      setBlogs(result.docs);
      setPage(result.page);
      setPageSize(result.limit);
      setTotal(result.totalDocs);
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchText, messageApi, page, pageSize, statusFilter]);

  useEffect(() => {
    void loadBlogs({
      nextPage: 1,
      nextPageSize: pageSize,
      nextKeyword: debouncedSearchText,
      nextFilter: statusFilter,
    });
  }, [debouncedSearchText, loadBlogs, pageSize, statusFilter]);

  const resetFormState = () => {
    form.resetFields();
    setUploadedCoverUrl("");
    setEditingBlog(null);
    setIsModalOpen(false);
  };

  const openCreateModal = () => {
    setEditingBlog(null);
    setUploadedCoverUrl("");
    form.resetFields();
    form.setFieldsValue({
      authorName: "RioShop",
      isPublished: true,
      isFeatured: false,
      publishedAt: toDateTimeLocalValue(new Date().toISOString()),
      content: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (blog: BlogPost) => {
    setEditingBlog(blog);
    setUploadedCoverUrl(blog.coverImage ?? "");
    form.setFieldsValue({
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt ?? "",
      content: blog.content ?? "",
      coverImage: blog.coverImage ?? "",
      tagsText: (blog.tags ?? []).join(", "),
      authorName: blog.authorName ?? "RioShop",
      isPublished: blog.isPublished ?? true,
      isFeatured: blog.isFeatured ?? false,
      publishedAt: toDateTimeLocalValue(blog.publishedAt),
    });
    setIsModalOpen(true);
  };

  const uploadCoverImage: UploadProps["customRequest"] = async ({ file, onError, onSuccess }) => {
    try {
      setCoverUploading(true);
      const url = await blogService.uploadBlogImage(file as File);
      setUploadedCoverUrl(url);
      form.setFieldValue("coverImage", url);
      onSuccess?.("ok");
      messageApi.success("Tải ảnh bìa thành công");
    } catch (error) {
      onError?.(error as Error);
      messageApi.error(getErrorMessage(error));
    } finally {
      setCoverUploading(false);
    }
  };

  const beforeUpload: UploadProps["beforeUpload"] = (file) => {
    const validationError = getImageValidationError(file as File, 5);
    if (validationError) {
      messageApi.error(validationError);
      return false;
    }

    return true;
  };

  const handleEditorImageUpload = async (file: File) => {
    ensureImageFile(file, 5);
    return blogService.uploadBlogImage(file);
  };

  const handleSaveBlog = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload: BlogPayload = {
        title: values.title.trim(),
        slug: values.slug?.trim() || undefined,
        excerpt: values.excerpt?.trim() || "",
        content: values.content?.trim() || "",
        coverImage: values.coverImage?.trim() || "",
        tags: parseTagsText(values.tagsText),
        authorName: values.authorName?.trim() || "RioShop",
        isPublished: values.isPublished ?? true,
        isFeatured: values.isFeatured ?? false,
        publishedAt: values.publishedAt ? new Date(values.publishedAt).toISOString() : undefined,
      };

      if (editingBlog?._id) {
        await blogService.updateBlog(editingBlog._id, payload);
        messageApi.success("Cập nhật bài viết thành công");
      } else {
        await blogService.createBlog(payload);
        messageApi.success("Tạo bài viết thành công");
      }

      resetFormState();
      await loadBlogs({ nextPage: 1 });
    } catch (error) {
      if (error instanceof Error && "errorFields" in error) {
        return;
      }
      messageApi.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlog = async (id: string) => {
    try {
      await blogService.deleteBlog(id);
      messageApi.success("Xóa bài viết thành công");

      const nextPage = blogs.length === 1 && page > 1 ? page - 1 : page;
      await loadBlogs({ nextPage });
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const columns: ColumnsType<BlogPost> = [
    {
      title: "Ảnh bìa",
      dataIndex: "coverImage",
      key: "coverImage",
      width: 110,
      render: (coverImage?: string) => (
        coverImage ? (
          <Image
            src={coverImage}
            width={68}
            height={46}
            className="rounded-md object-cover"
          />
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
    {
      title: "Tiêu đề",
      dataIndex: "title",
      key: "title",
      width: 330,
      render: (_, record) => (
        <div>
          <Text strong>{record.title}</Text>
          <div>
            <Text type="secondary">{record.slug}</Text>
          </div>
        </div>
      ),
    },
    {
      title: "Tác giả",
      dataIndex: "authorName",
      key: "authorName",
      width: 140,
      render: (authorName?: string) => authorName || "RioShop",
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 160,
      render: (_, record) => (
        <Space wrap size={[4, 4]}>
          <Tag color={record.isPublished ? "green" : "default"}>
            {record.isPublished ? "Đã xuất bản" : "Bản nháp"}
          </Tag>
          {record.isFeatured ? <Tag color="gold">Nổi bật</Tag> : null}
        </Space>
      ),
    },
    {
      title: "Ngày xuất bản",
      dataIndex: "publishedAt",
      key: "publishedAt",
      width: 150,
      render: (value?: string) => formatDateTime(value),
    },
    {
      title: "Cập nhật",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 150,
      render: (value?: string) => formatDateTime(value),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 180,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openEditModal(record)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa bài viết"
            description="Bạn có chắc muốn xóa bài viết này?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => void handleDeleteBlog(record._id)}
          >
            <Button size="small" danger>
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Title level={3} className="mb-1! mt-0!">
            Quản lý blog
          </Title>
          <Text type="secondary">
            Tạo, chỉnh sửa và quản lý bài viết hiển thị ở khu vực blog phía Store.
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          Thêm bài viết
        </Button>
      </div>

      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            allowClear
            placeholder="Tìm theo tiêu đề, mô tả hoặc nội dung..."
          />
          <Select<BlogFilter>
            value={statusFilter}
            options={BLOG_STATUS_OPTIONS}
            onChange={(value) => setStatusFilter(value)}
          />
        </div>

        <Table<BlogPost>
          rowKey="_id"
          columns={columns}
          dataSource={blogs}
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (value) => `Tổng ${value} bài viết`,
          }}
          onChange={(pagination: TablePaginationConfig) => {
            void loadBlogs({
              nextPage: pagination.current ?? page,
              nextPageSize: pagination.pageSize ?? pageSize,
            });
          }}
        />
      </Card>

      <Modal
        title={null}
        open={isModalOpen}
        onCancel={resetFormState}
        onOk={() => void handleSaveBlog()}
        okText={editingBlog ? "Cập nhật" : "Tạo mới"}
        cancelText="Hủy"
        okButtonProps={{
          loading: saving,
          className: "bg-sky-700! hover:bg-sky-800!",
        }}
        width="min(1100px, calc(100vw - 32px))"
        destroyOnHidden
      >
        <div className="mb-5 rounded-2xl bg-linear-to-r from-slate-900 to-sky-800 p-4 text-white">
          <Title level={4} className="mb-1! mt-0! text-white!">
            {editingBlog ? "Chỉnh sửa bài viết" : "Tạo bài viết mới"}
          </Title>
          <Text className="text-slate-200!">
            Nội dung sử dụng TipTap nên có thể chèn ảnh trực tiếp vào bài viết.
          </Text>
        </div>

        <Form<BlogFormValues> form={form} layout="vertical">
          <div className="grid gap-4 lg:grid-cols-2">
            <Form.Item
              label="Tiêu đề"
              name="title"
              rules={[{ required: true, message: "Vui lòng nhập tiêu đề bài viết" }]}
            >
              <Input placeholder="Ví dụ: Bí quyết phối đồ công sở nam 2026" />
            </Form.Item>

            <Form.Item label="Slug" name="slug">
              <Input placeholder="Để trống để hệ thống tự sinh theo tiêu đề" />
            </Form.Item>

            <Form.Item label="Tác giả" name="authorName">
              <Input placeholder="RioShop" />
            </Form.Item>

            <Form.Item label="Ngày xuất bản" name="publishedAt">
              <Input type="datetime-local" />
            </Form.Item>
          </div>

          <Form.Item label="Tóm tắt" name="excerpt">
            <Input.TextArea rows={3} placeholder="Mô tả ngắn hiển thị ở danh sách blog..." />
          </Form.Item>

          <Form.Item label="Tags (phân tách bằng dấu phẩy)" name="tagsText">
            <Input placeholder="quần jean nam, xu hướng 2026, phối đồ" />
          </Form.Item>

          <div className="grid gap-4 md:grid-cols-[1fr_220px] md:items-start">
            <div>
              <Form.Item label="Ảnh bìa">
                <Upload.Dragger
                  accept="image/*"
                  maxCount={1}
                  showUploadList={false}
                  customRequest={uploadCoverImage}
                  beforeUpload={beforeUpload}
                  className="rounded-xl!"
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">
                    Kéo thả ảnh vào đây hoặc bấm để tải lên
                  </p>
                  <p className="ant-upload-hint">
                    Hỗ trợ JPG/PNG/WebP, dung lượng tối đa 5MB
                  </p>
                </Upload.Dragger>
                <Form.Item name="coverImage" hidden>
                  <Input />
                </Form.Item>
                {coverUploading ? (
                  <Text type="secondary" className="mt-2 block">
                    Đang tải ảnh bìa...
                  </Text>
                ) : null}
              </Form.Item>
            </div>

            <div className="rounded-xl border border-slate-200 p-2">
              {uploadedCoverUrl ? (
                <Image
                  src={uploadedCoverUrl}
                  width={190}
                  height={120}
                  className="rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-30 w-full items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                  Chưa có ảnh bìa
                </div>
              )}
            </div>
          </div>

          <div className="mb-2 grid gap-4 sm:grid-cols-2">
            <Form.Item label="Xuất bản" name="isPublished" valuePropName="checked">
              <Switch checkedChildren="Đã xuất bản" unCheckedChildren="Bản nháp" />
            </Form.Item>
            <Form.Item label="Nổi bật" name="isFeatured" valuePropName="checked">
              <Switch checkedChildren="Nổi bật" unCheckedChildren="Bình thường" />
            </Form.Item>
          </div>

          <Form.Item label="Nội dung bài viết">
            <Form.Item noStyle shouldUpdate>
              {() => (
                <RichTextEditor
                  value={(form.getFieldValue("content") as string | undefined) ?? ""}
                  onChange={(nextValue) => form.setFieldValue("content", nextValue)}
                  placeholder="Nhập nội dung blog..."
                  onUploadImage={handleEditorImageUpload}
                />
              )}
            </Form.Item>
          </Form.Item>
          <Form.Item name="content" hidden>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
