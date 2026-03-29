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
  Tooltip,
  Typography,
  Upload,
  message,
} from "antd";
import { InboxOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import type { UploadProps } from "antd/es/upload";
import { useEffect, useMemo, useState } from "react";
import {
  categoryService,
  type Category,
  type CategoryPayload,
} from "../../../services/categoryService";
import {
  useCategoryStore,
  type CategoryStatusFilter,
} from "../../../stores/categoryStore";
import { getErrorMessage } from "../../../utils/errorMessage";

const { Text, Title } = Typography;

type CategoryFormValues = {
  name: string;
  description?: string;
  parentId?: string;
  position?: number;
  image?: string;
  icon?: string;
  isActive?: boolean;
};

type ParentCategoryOption = {
  value: string;
  label: string;
};

const STATUS_OPTIONS: { label: string; value: CategoryStatusFilter }[] = [
  { label: "Tất cả trạng thái", value: "all" },
  { label: "Đang hoạt động", value: "active" },
  { label: "Không hoạt động", value: "inactive" },
];

const getParentCategoryName = (category: Category): string => {
  if (!category.parentId) {
    return "Danh mục gốc";
  }
  if (typeof category.parentId === "string") {
    return category.parentId;
  }
  return category.parentId.name;
};

const buildParentCategoryOptions = (
  nodes: Category[],
  level = 0,
): ParentCategoryOption[] => {
  return nodes.flatMap((node) => {
    const currentOption: ParentCategoryOption = {
      value: node._id,
      label: `${"— ".repeat(level)}${node.name}`,
    };

    const children = (node.children ?? []).flatMap((child) =>
      buildParentCategoryOptions([child], level + 1),
    );

    return [currentOption, ...children];
  });
};

export function AdminCategoriesPage() {
  const [form] = Form.useForm<CategoryFormValues>();
  const [messageApi, contextHolder] = message.useMessage();

  const {
    categories,
    treeData,
    loading,
    saving,
    page,
    pageSize,
    total,
    keyword,
    statusFilter,
    loadCategories,
    loadCategoryTree,
    setKeyword,
    setStatusFilter,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategoryStore();

  const [searchText, setSearchText] = useState(keyword);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");

  useEffect(() => {
    void loadCategoryTree();
    void loadCategories({
      page: 1,
      pageSize: 10,
      keyword: "",
      statusFilter: "all",
    });
  }, [loadCategories, loadCategoryTree]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const searchKeyword = searchText.trim();
      setKeyword(searchKeyword);
      void loadCategories({
        page: 1,
        pageSize,
        keyword: searchKeyword,
        statusFilter,
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [loadCategories, pageSize, searchText, setKeyword, statusFilter]);

  const parentOptions = useMemo(
    () => buildParentCategoryOptions(treeData),
    [treeData],
  );

  const filteredParentOptions = parentOptions.filter(
    (option) => option.value !== editingCategory?._id,
  );

  const openCreateModal = () => {
    setEditingCategory(null);
    setUploadedImageUrl("");
    form.resetFields();
    form.setFieldsValue({ position: 0, isActive: true });
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setUploadedImageUrl(category.image ?? "");
    form.setFieldsValue({
      name: category.name,
      description: category.description,
      parentId:
        typeof category.parentId === "string"
          ? category.parentId
          : category.parentId?._id,
      position: category.position,
      image: category.image,
      icon: category.icon,
      isActive: category.isActive,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    form.resetFields();
    setUploadedImageUrl("");
    setEditingCategory(null);
    setIsModalOpen(false);
  };

  const uploadImage: UploadProps["customRequest"] = async (options) => {
    const { file, onSuccess, onError } = options;
    try {
      setImageUploading(true);
      const imageUrl = await categoryService.uploadCategoryImage(file as File);
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

  const handleSaveCategory = async () => {
    try {
      const values = await form.validateFields();
      const payload: CategoryPayload = {
        name: values.name.trim(),
        description: values.description?.trim() || "",
        parentId: values.parentId || null,
        position: values.position ?? 0,
        image: values.image || "",
        icon: values.icon?.trim() || "",
      };

      if (editingCategory) {
        payload.isActive = values.isActive ?? true;
        await updateCategory(editingCategory._id, payload);
        messageApi.success("Cập nhật danh mục thành công");
      } else {
        await createCategory(payload);
        messageApi.success("Tạo danh mục thành công");
      }

      closeModal();
    } catch (error) {
      if (error instanceof Error && "errorFields" in error) {
        return;
      }
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id);
      messageApi.success("Xóa danh mục thành công");
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handlePageChange = async (pagination: TablePaginationConfig) => {
    try {
      await loadCategories({
        page: pagination.current ?? 1,
        pageSize: pagination.pageSize ?? pageSize,
        keyword,
        statusFilter,
      });
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const columns: ColumnsType<Category> = [
    {
      title: "ID",
      dataIndex: "_id",
      key: "_id",
      width: 190,
      render: (id: string) => (
        <Tooltip title={id}>
          <Text className="inline-block max-w-37.5" ellipsis>
            {id}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Tên danh mục",
      dataIndex: "name",
      key: "name",
      width: 250,
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
      title: "Ảnh",
      dataIndex: "image",
      key: "image",
      width: 90,
      render: (image?: string) =>
        image ? (
          <Image
            src={image}
            width={50}
            height={50}
            className="rounded-md object-cover"
          />
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: "Danh mục cha",
      dataIndex: "parentId",
      key: "parentId",
      width: 180,
      render: (_, record) => getParentCategoryName(record),
    },
    {
      title: "Cấp",
      dataIndex: "level",
      key: "level",
      width: 80,
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
            title="Xóa danh mục"
            description="Bạn có chắc muốn xóa danh mục này?"
            onConfirm={() => void handleDeleteCategory(record._id)}
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
            Quản lý danh mục
          </Title>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          Thêm danh mục
        </Button>
      </div>

      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            allowClear
            placeholder="Tìm kiếm theo tên danh mục..."
          />
          <Select
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={(value) => setStatusFilter(value)}
          />
        </div>

        <Table<Category>
          rowKey="_id"
          columns={columns}
          dataSource={categories}
          loading={loading}
          scroll={{ x: 1100 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (value) => `Tổng ${value} danh mục`,
          }}
          onChange={handlePageChange}
        />
      </Card>

      <Modal
        title={null}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={() => void handleSaveCategory()}
        okText={editingCategory ? "Cập nhật" : "Tạo mới"}
        cancelText="Hủy"
        okButtonProps={{
          loading: saving,
          className: "bg-sky-700! hover:bg-sky-800!",
        }}
        width={760}
        destroyOnHidden
      >
        <div className="mb-5 rounded-2xl bg-linear-to-r from-slate-900 to-sky-800 p-4 text-white">
          <Title level={4} className="mb-1! mt-0! text-white!">
            {editingCategory ? "Chỉnh sửa danh mục" : "Tạo danh mục mới"}
          </Title>
          <Text className="text-slate-200!">
            Điền đầy đủ thông tin, tải ảnh đại diện và thiết lập trạng thái hiển thị.
          </Text>
        </div>

        <Form<CategoryFormValues> form={form} layout="vertical">
          <div className="grid gap-4 md:grid-cols-2">
            <Form.Item
              label="Tên danh mục"
              name="name"
              rules={[
                { required: true, message: "Vui lòng nhập tên danh mục" },
              ]}
            >
              <Input placeholder="Ví dụ: Áo thun nam" />
            </Form.Item>

            <Form.Item label="Danh mục cha" name="parentId">
              <Select
                allowClear
                options={filteredParentOptions}
                placeholder="Chọn danh mục cha (nếu có)"
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>

            <Form.Item label="Vị trí hiển thị" name="position">
              <InputNumber min={0} className="w-full!" />
            </Form.Item>

            <Form.Item label="Icon" name="icon">
              <Input placeholder="Ví dụ: tshirt-outline" />
            </Form.Item>
          </div>

          <Form.Item label="Mô tả" name="description">
            <Input.TextArea
              rows={3}
              placeholder="Nhập mô tả ngắn cho danh mục"
            />
          </Form.Item>

          <Form.Item label="Ảnh danh mục">
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
                  />
                ) : (
                  <div className="flex h-35 w-35 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                    Chưa có ảnh
                  </div>
                )}
              </div>
            </div>
          </Form.Item>

          {editingCategory ? (
            <Form.Item
              label="Trạng thái"
              name="isActive"
              valuePropName="checked"
            >
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>
    </div>
  );
}

