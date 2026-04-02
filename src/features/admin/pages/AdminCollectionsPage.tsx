import {
  Button,
  Card,
  Form,
  Image,
  Input,
  InputNumber,
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
import { useEffect, useState } from "react";
import {
  collectionService,
  type Collection,
  type CollectionPayload,
} from "../../../services/collectionService";
import {
  useCollectionStore,
  type CollectionStatusFilter,
} from "../../../stores/collectionStore";
import { getErrorMessage } from "../../../utils/errorMessage";

const { Title, Text } = Typography;

type CollectionFormValues = {
  name: string;
  description?: string;
  image?: string;
  bannerImage?: string;
  position?: number;
  isActive?: boolean;
};

const STATUS_OPTIONS: { label: string; value: CollectionStatusFilter }[] = [
  { label: "Tất cả trạng thái", value: "all" },
  { label: "Đang hoạt động", value: "active" },
  { label: "Không hoạt động", value: "inactive" },
];

export function AdminCollectionsPage() {
  const [form] = Form.useForm<CollectionFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [searchText, setSearchText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [bannerImageUploading, setBannerImageUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [uploadedBannerImageUrl, setUploadedBannerImageUrl] = useState("");

  const {
    collections,
    loading,
    saving,
    page,
    pageSize,
    total,
    keyword,
    statusFilter,
    loadCollections,
    setKeyword,
    setStatusFilter,
    createCollection,
    updateCollection,
    deleteCollection,
  } = useCollectionStore();

  useEffect(() => {
    setSearchText(keyword);
  }, [keyword]);

  useEffect(() => {
    void loadCollections({
      page: 1,
      pageSize: 10,
      keyword: "",
      statusFilter: "all",
    }).catch((error) => messageApi.error(getErrorMessage(error)));
  }, [loadCollections, messageApi]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const q = searchText.trim();
      setKeyword(q);
      void loadCollections({
        page: 1,
        pageSize,
        keyword: q,
        statusFilter,
      }).catch((error) => messageApi.error(getErrorMessage(error)));
    }, 350);

    return () => clearTimeout(timer);
  }, [loadCollections, messageApi, pageSize, searchText, setKeyword, statusFilter]);

  const openCreateModal = () => {
    setEditingCollection(null);
    setUploadedImageUrl("");
    setUploadedBannerImageUrl("");
    form.resetFields();
    form.setFieldsValue({
      position: 0,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (collection: Collection) => {
    setEditingCollection(collection);
    setUploadedImageUrl(collection.image ?? "");
    setUploadedBannerImageUrl(collection.bannerImage ?? "");
    form.setFieldsValue({
      name: collection.name,
      description: collection.description,
      image: collection.image,
      bannerImage: collection.bannerImage,
      position: collection.position,
      isActive: collection.isActive,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    form.resetFields();
    setUploadedImageUrl("");
    setUploadedBannerImageUrl("");
    setEditingCollection(null);
    setIsModalOpen(false);
  };

  const uploadImage: UploadProps["customRequest"] = async (options) => {
    const { file, onSuccess, onError } = options;
    try {
      setImageUploading(true);
      const imageUrl = await collectionService.uploadCollectionImage(file as File);
      setUploadedImageUrl(imageUrl);
      form.setFieldValue("image", imageUrl);
      onSuccess?.("ok");
      messageApi.success("Tải ảnh lên thành công");
    } catch (error) {
      onError?.(error as Error);
      messageApi.error(getErrorMessage(error));
    } finally {
      setImageUploading(false);
    }
  };

  const uploadBannerImage: UploadProps["customRequest"] = async (options) => {
    const { file, onSuccess, onError } = options;
    try {
      setBannerImageUploading(true);
      const imageUrl = await collectionService.uploadCollectionImage(file as File);
      setUploadedBannerImageUrl(imageUrl);
      form.setFieldValue("bannerImage", imageUrl);
      onSuccess?.("ok");
      messageApi.success("Tải banner lên thành công");
    } catch (error) {
      onError?.(error as Error);
      messageApi.error(getErrorMessage(error));
    } finally {
      setBannerImageUploading(false);
    }
  };

  const beforeUpload: UploadProps["beforeUpload"] = (file) => {
    if (!file.type.startsWith("image/")) {
      messageApi.error("Chỉ chấp nhận file ảnh");
      return false;
    }

    if (file.size / 1024 / 1024 > 5) {
      messageApi.error("Kích thước ảnh phải nhỏ hơn 5MB");
      return false;
    }

    return true;
  };

  const handleSaveCollection = async () => {
    try {
      const values = await form.validateFields();
      const payload: CollectionPayload = {
        name: values.name.trim(),
        description: values.description?.trim() || "",
        image: values.image || "",
        bannerImage: values.bannerImage || "",
        position: values.position ?? 0,
      };

      if (editingCollection) {
        payload.isActive = values.isActive ?? true;
        await updateCollection(editingCollection._id, payload);
        messageApi.success("Cập nhật bộ sưu tập thành công");
      } else {
        await createCollection(payload);
        messageApi.success("Tạo bộ sưu tập thành công");
      }

      closeModal();
    } catch (error) {
      if (error instanceof Error && "errorFields" in error) {
        return;
      }
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleDeleteCollection = async (id: string) => {
    try {
      await deleteCollection(id);
      messageApi.success("Xóa bộ sưu tập thành công");
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleStatusFilterChange = async (nextStatus: CollectionStatusFilter) => {
    setStatusFilter(nextStatus);
    try {
      await loadCollections({
        page: 1,
        pageSize,
        keyword,
        statusFilter: nextStatus,
      });
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handlePageChange = async (pagination: TablePaginationConfig) => {
    try {
      await loadCollections({
        page: pagination.current ?? 1,
        pageSize: pagination.pageSize ?? pageSize,
        keyword,
        statusFilter,
      });
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const columns: ColumnsType<Collection> = [
    {
      title: "Ảnh",
      dataIndex: "image",
      key: "image",
      width: 90,
      render: (image?: string) =>
        image ? (
          <Image src={image} width={50} height={50} className="rounded-md object-cover" preview={false} />
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: "Tên bộ sưu tập",
      key: "name",
      width: 260,
      render: (_, record) => (
        <div>
          <Text strong>{record.name}</Text>
          <div>
            <Text type="secondary">{record.slug}</Text>
          </div>
        </div>
      ),
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      width: 320,
      render: (description?: string) => <Text type="secondary">{description?.trim() || "-"}</Text>,
    },
    {
      title: "Vị trí",
      dataIndex: "position",
      key: "position",
      width: 90,
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 140,
      render: (isActive: boolean) => (
        <Tag color={isActive ? "green" : "default"}>
          {isActive ? "Đang hoạt động" : "Không hoạt động"}
        </Tag>
      ),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 170,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openEditModal(record)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa bộ sưu tập"
            description="Bạn có chắc muốn xóa bộ sưu tập này?"
            onConfirm={() => void handleDeleteCollection(record._id)}
            okText="Xóa"
            cancelText="Hủy"
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
            Quản lý bộ sưu tập
          </Title>
          <Text type="secondary">
            Nhóm sản phẩm theo chủ đề mùa vụ, chiến dịch hoặc phong cách.
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          Thêm bộ sưu tập
        </Button>
      </div>

      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            allowClear
            placeholder="Tìm kiếm theo tên bộ sưu tập..."
          />
          <Select
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={(value) => void handleStatusFilterChange(value)}
          />
        </div>

        <Table<Collection>
          rowKey="_id"
          columns={columns}
          dataSource={collections}
          loading={loading || saving}
          scroll={{ x: 1100 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (value) => `Tổng ${value} bộ sưu tập`,
          }}
          onChange={handlePageChange}
        />
      </Card>

      <Modal
        title={null}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={() => void handleSaveCollection()}
        okText={editingCollection ? "Cập nhật" : "Tạo mới"}
        cancelText="Hủy"
        okButtonProps={{ loading: saving, className: "bg-sky-700! hover:bg-sky-800!" }}
        width={760}
        destroyOnHidden
      >
        <div className="mb-5 rounded-2xl bg-linear-to-r from-slate-900 to-sky-800 p-4 text-white">
          <Title level={4} className="mb-1! mt-0! text-white!">
            {editingCollection ? "Chỉnh sửa bộ sưu tập" : "Tạo bộ sưu tập mới"}
          </Title>
          <Text className="text-slate-200!">
            Bộ sưu tập giúp gom sản phẩm đa danh mục theo cùng thông điệp tiếp thị.
          </Text>
        </div>

        <Form<CollectionFormValues> form={form} layout="vertical">
          <div className="grid gap-4 md:grid-cols-2">
            <Form.Item
              label="Tên bộ sưu tập"
              name="name"
              rules={[{ required: true, message: "Vui lòng nhập tên bộ sưu tập" }]}
            >
              <Input placeholder="Ví dụ: BST Thu Đông 2026" />
            </Form.Item>

            <Form.Item label="Vị trí hiển thị" name="position">
              <InputNumber min={0} className="w-full!" />
            </Form.Item>
          </div>

          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={3} placeholder="Mô tả ngắn cho bộ sưu tập" />
          </Form.Item>

          <Form.Item label="Banner bộ sưu tập">
            <div className="grid gap-4 md:grid-cols-[1fr_260px] md:items-start">
              <div>
                <Upload.Dragger
                  accept="image/*"
                  maxCount={1}
                  showUploadList={false}
                  customRequest={uploadBannerImage}
                  beforeUpload={beforeUpload}
                  className="rounded-xl!"
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">
                    Kéo thả banner vào đây hoặc bấm để tải lên
                  </p>
                  <p className="ant-upload-hint">
                    Hỗ trợ JPG/PNG/WebP, dung lượng tối đa 5MB
                  </p>
                </Upload.Dragger>
                <Form.Item name="bannerImage" hidden>
                  <Input />
                </Form.Item>
                {bannerImageUploading ? (
                  <Text type="secondary" className="mt-2 block">
                    Đang tải banner lên...
                  </Text>
                ) : null}
              </div>

              <div className="rounded-xl border border-slate-200 p-2">
                {uploadedBannerImageUrl ? (
                  <Image
                    src={uploadedBannerImageUrl}
                    width={220}
                    height={124}
                    className="rounded-lg object-cover"
                    preview={false}
                  />
                ) : (
                  <div className="flex h-[124px] w-[220px] items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                    Chưa có banner
                  </div>
                )}
              </div>
            </div>
          </Form.Item>

          <Form.Item label="Ảnh đại diện">
            <div className="grid gap-4 md:grid-cols-[1fr_180px] md:items-start">
              <div>
                <Upload.Dragger
                  accept="image/*"
                  maxCount={1}
                  showUploadList={false}
                  customRequest={uploadImage}
                  beforeUpload={beforeUpload}
                  className="rounded-xl!"
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">
                    Kéo thả ảnh vào đây hoặc bấm để tải ảnh lên
                  </p>
                  <p className="ant-upload-hint">
                    Hỗ trợ JPG/PNG/WebP, dung lượng tối đa 5MB
                  </p>
                </Upload.Dragger>
                <Form.Item name="image" hidden>
                  <Input />
                </Form.Item>
                {imageUploading ? (
                  <Text type="secondary" className="mt-2 block">
                    Đang tải ảnh lên...
                  </Text>
                ) : null}
              </div>

              <div className="rounded-xl border border-slate-200 p-2">
                {uploadedImageUrl ? (
                  <Image
                    src={uploadedImageUrl}
                    width={140}
                    height={140}
                    className="rounded-lg object-cover"
                    preview={false}
                  />
                ) : (
                  <div className="flex h-35 w-35 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                    Chưa có ảnh
                  </div>
                )}
              </div>
            </div>
          </Form.Item>

          {editingCollection ? (
            <Form.Item label="Trạng thái" name="isActive" valuePropName="checked">
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>
    </div>
  );
}
