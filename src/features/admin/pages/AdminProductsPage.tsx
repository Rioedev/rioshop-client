import { AxiosError } from "axios";
import {
  Button,
  Card,
  Col,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import { DeleteOutlined, InboxOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import type { UploadProps } from "antd/es/upload";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  productService,
  type Product,
  type ProductMedia,
  type ProductMediaType,
  type ProductPayload,
  type ProductGender,
  type ProductStatus,
  type ProductStatusFilter,
  type ProductVariant,
  type ProductVariantSize,
} from "../../../services/productService";
import { useProductStore } from "../../../stores/productStore";
import { RichTextEditor } from "../../../components/editor/RichTextEditor";

const { Paragraph, Title, Text } = Typography;
const REQUIRED_RULE = [{ required: true, message: "Trường bắt buộc" }];

type MediaFormValue = {
  url: string;
  type: ProductMediaType;
  altText?: string;
  isPrimary?: boolean;
  pendingFileId?: string;
};

type VariantImageFormValue = {
  url: string;
  pendingFileId?: string;
};

type VariantFormValue = {
  variantId: string;
  sku: string;
  size: ProductVariantSize;
  sizeLabel?: string;
  additionalPrice?: number;
  isActive?: boolean;
  colorName?: string;
  colorHex?: string;
  imageItems?: VariantImageFormValue[];
};

type ProductFormValues = {
  sku: string;
  name: string;
  brand: string;
  categoryId: string;
  gender?: ProductGender;
  ageGroup?: "adult" | "teen" | "kids" | "baby";
  basePrice: number;
  salePrice: number;
  stock: number;
  status: ProductStatus;
  description?: string;
  shortDescription?: string;
  materialText?: string;
  careText?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywordsText?: string;
  media: MediaFormValue[];
  variants: VariantFormValue[];
};

const STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Nháp",
  active: "Đang bán",
  archived: "Lưu trữ",
  out_of_stock: "Hết hàng",
};

const STATUS_COLORS: Record<ProductStatus, string> = {
  draft: "gold",
  active: "green",
  archived: "default",
  out_of_stock: "red",
};

const STATUS_FILTER_OPTIONS: { value: ProductStatusFilter; label: string }[] = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "active", label: "Đang bán" },
  { value: "draft", label: "Nháp" },
  { value: "archived", label: "Lưu trữ" },
  { value: "out_of_stock", label: "Hết hàng" },
];

const PRODUCT_STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "active", label: "Đang bán" },
  { value: "draft", label: "Nháp" },
  { value: "out_of_stock", label: "Hết hàng" },
  { value: "archived", label: "Lưu trữ" },
];

const VARIANT_SIZE_OPTIONS: { value: ProductVariantSize; label: ProductVariantSize }[] = [
  { value: "XS", label: "XS" },
  { value: "S", label: "S" },
  { value: "M", label: "M" },
  { value: "L", label: "L" },
  { value: "XL", label: "XL" },
  { value: "2XL", label: "2XL" },
  { value: "3XL", label: "3XL" },
];

const MEDIA_TYPE_OPTIONS: { value: ProductMediaType; label: string }[] = [
  { value: "image", label: "Hình ảnh" },
  { value: "video", label: "Video" },
  { value: "360", label: "360" },
];

const GENDER_OPTIONS: { value: ProductGender; label: string }[] = [
  { value: "men", label: "Nam" },
  { value: "women", label: "Nữ" },
  { value: "unisex", label: "Unisex" },
  { value: "kids", label: "Trẻ em" },
];

const AGE_GROUP_OPTIONS: { value: "adult" | "teen" | "kids" | "baby"; label: string }[] = [
  { value: "adult", label: "Người lớn" },
  { value: "teen", label: "Thanh thiếu niên" },
  { value: "kids", label: "Thiếu nhi" },
  { value: "baby", label: "Em bé" },
];

const formatCurrency = new Intl.NumberFormat("vi-VN");

const getErrorMessage = (error: unknown) => {
  if (error instanceof AxiosError) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Yêu cầu thất bại";
};

const toSlug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const toList = (value?: string) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const defaultVariant = (index: number): VariantFormValue => ({
  variantId: `variant-${index + 1}`,
  sku: "",
  size: "M",
  sizeLabel: "M",
  additionalPrice: 0,
  isActive: true,
  colorName: "",
  colorHex: "",
  imageItems: [],
});

const normalizeMedia = (mediaValues: MediaFormValue[]): ProductMedia[] => {
  const media = mediaValues
    .map((item, index) => ({
      url: item.url?.trim(),
      type: item.type ?? "image",
      altText: item.altText?.trim() || "",
      isPrimary: Boolean(item.isPrimary),
      position: index,
    }))
    .filter((item) => item.url);

  if (media.length > 0 && !media.some((item) => item.isPrimary)) {
    media[0].isPrimary = true;
  }

  return media as ProductMedia[];
};

const normalizeVariants = (variantValues: VariantFormValue[]): ProductVariant[] => {
  return variantValues.reduce<ProductVariant[]>((acc, item, index) => {
    const variantId = item.variantId?.trim();
    const sku = item.sku?.trim();
    if (!variantId || !sku) {
      return acc;
    }

    acc.push({
      variantId,
      sku,
      size: item.size,
      sizeLabel: item.sizeLabel?.trim() || item.size,
      additionalPrice: item.additionalPrice ?? 0,
      isActive: item.isActive ?? true,
      position: index,
      color:
        item.colorName || item.colorHex
          ? { name: item.colorName?.trim() || "", hex: item.colorHex?.trim() || "" }
          : undefined,
      images: (item.imageItems ?? [])
        .map((imageItem) => imageItem.url?.trim())
        .filter(Boolean),
    });

    return acc;
  }, []);
};

const getPrimaryImage = (product: Product) =>
  product.media?.find((item) => item.isPrimary)?.url ?? product.media?.[0]?.url;

const getStock = (product: Product) =>
  product.inventorySummary?.available ?? product.inventorySummary?.total ?? 0;

export function AdminProductsPage() {
  const [form] = Form.useForm<ProductFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const skipFirstSearch = useRef(true);
  const pendingUploadFilesRef = useRef<Record<string, File>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchText, setSearchText] = useState("");
  const [pendingUploadCount, setPendingUploadCount] = useState(0);

  const {
    products,
    categoryOptions,
    categoryLookup,
    loading,
    categoryLoading,
    saving,
    page,
    pageSize,
    total,
    keyword,
    categoryId,
    statusFilter,
    loadProducts,
    loadCategoryOptions,
    setKeyword,
    setCategoryId,
    setStatusFilter,
    createProduct,
    updateProduct,
    deleteProduct,
  } = useProductStore();

  useEffect(() => {
    setSearchText(keyword);
  }, [keyword]);

  useEffect(() => {
    void Promise.all([
      loadCategoryOptions(),
      loadProducts({ page: 1, pageSize: 10, keyword: "", categoryId: undefined, statusFilter: "all" }),
    ]).catch((error) => messageApi.error(getErrorMessage(error)));
  }, [loadCategoryOptions, loadProducts, messageApi]);

  useEffect(() => {
    if (skipFirstSearch.current) {
      skipFirstSearch.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const q = searchText.trim();
      setKeyword(q);
      const nextCategory = q ? undefined : categoryId;
      if (q && categoryId) setCategoryId(undefined);
      void loadProducts({ page: 1, pageSize, keyword: q, categoryId: nextCategory, statusFilter }).catch(
        (error) => messageApi.error(getErrorMessage(error)),
      );
    }, 350);
    return () => clearTimeout(timer);
  }, [categoryId, loadProducts, messageApi, pageSize, searchText, setCategoryId, setKeyword, statusFilter]);

  const categoryFilterOptions = useMemo(
    () => [{ value: "all", label: "Tất cả danh mục" }, ...categoryOptions],
    [categoryOptions],
  );

  const registerPendingFile = (file: File) => {
    // eslint-disable-next-line react-hooks/purity
    const pendingFileId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    pendingUploadFilesRef.current[pendingFileId] = file;
    setPendingUploadCount(Object.keys(pendingUploadFilesRef.current).length);
    return pendingFileId;
  };

  const unregisterPendingFile = (pendingFileId?: string) => {
    if (!pendingFileId) return;
    delete pendingUploadFilesRef.current[pendingFileId];
    setPendingUploadCount(Object.keys(pendingUploadFilesRef.current).length);
  };

  const resetPendingFiles = () => {
    pendingUploadFilesRef.current = {};
    setPendingUploadCount(0);
  };

  const handleUpload: UploadProps["customRequest"] = async ({ file, onSuccess, onError }) => {
    try {
      const nextFile = file as File;
      const pendingFileId = registerPendingFile(nextFile);

      const current = (form.getFieldValue("media") ?? []) as MediaFormValue[];
      form.setFieldValue("media", [
        ...current,
        {
          url: `[Local file] ${nextFile.name}`,
          type: "image",
          isPrimary: current.length === 0,
          pendingFileId,
        },
      ]);
      onSuccess?.("ok");
      messageApi.success("Đã thêm ảnh, hệ thống sẽ tải lên khi bạn bấm Lưu.");
    } catch (error) {
      onError?.(error as Error);
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleVariantUpload = (variantFieldName: number): UploadProps["customRequest"] =>
    async ({ file, onSuccess, onError }) => {
      try {
        const nextFile = file as File;
        const pendingFileId = registerPendingFile(nextFile);
        const current = (form.getFieldValue(["variants", variantFieldName, "imageItems"]) ?? []) as VariantImageFormValue[];
        form.setFieldValue(["variants", variantFieldName, "imageItems"], [
          ...current,
          { url: `[Local file] ${nextFile.name}`, pendingFileId },
        ]);
        onSuccess?.("ok");
        messageApi.success("Đã thêm ảnh biến thể, hệ thống sẽ tải lên khi bạn bấm Lưu.");
      } catch (error) {
        onError?.(error as Error);
        messageApi.error(getErrorMessage(error));
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

  const handleEditorImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      throw new Error("Chi chap nhan file anh");
    }
    if (file.size / 1024 / 1024 > 5) {
      throw new Error("Kich thuoc anh phai nho hon 5MB");
    }
    return productService.uploadProductImage(file);
  };

  const handleCategoryChange = async (value: string) => {
    const nextCategoryId = value === "all" ? undefined : value;
    setCategoryId(nextCategoryId);

    try {
      await loadProducts({
        page: 1,
        pageSize,
        keyword,
        categoryId: nextCategoryId,
        statusFilter,
      });
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleStatusFilterChange = async (value: ProductStatusFilter) => {
    setStatusFilter(value);

    try {
      await loadProducts({
        page: 1,
        pageSize,
        keyword,
        categoryId,
        statusFilter: value,
      });
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    resetPendingFiles();
    form.resetFields();
    form.setFieldsValue({
      status: "active",
      stock: 0,
      media: [],
      variants: [defaultVariant(0)],
      gender: "unisex",
      ageGroup: "adult",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    resetPendingFiles();
    form.setFieldsValue({
      sku: product.sku,
      name: product.name,
      brand: product.brand,
      categoryId: product.category?._id,
      basePrice: product.pricing.basePrice,
      salePrice: product.pricing.salePrice,
      stock: product.inventorySummary?.total ?? getStock(product),
      status: product.status,
      description: product.description,
      shortDescription: product.shortDescription,
      gender: product.gender,
      ageGroup: product.ageGroup,
      materialText: (product.material ?? []).join(", "),
      careText: (product.care ?? []).join(", "),
      seoTitle: product.seoMeta?.title,
      seoDescription: product.seoMeta?.description,
      seoKeywordsText: (product.seoMeta?.keywords ?? []).join(", "),
      media: (product.media ?? []).map((item) => ({
        url: item.url,
        type: item.type,
        altText: item.altText,
        isPrimary: item.isPrimary,
      })),
      variants:
        product.variants?.map((item) => ({
          variantId: item.variantId,
          sku: item.sku,
          size: item.size,
          sizeLabel: item.sizeLabel,
          additionalPrice: item.additionalPrice,
          isActive: item.isActive,
          colorName: item.color?.name,
          colorHex: item.color?.hex,
          imageItems: (item.images ?? []).map((url) => ({ url })),
        })) ?? [defaultVariant(0)],
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue(true) as ProductFormValues;
      const category = categoryLookup[values.categoryId];
      if (!category) return messageApi.error("Không tìm thấy danh mục");

      const slug = toSlug(values.name);
      if (!slug) return messageApi.error("Tên sản phẩm không hợp lệ");

      const mediaValues = values.media ?? [];
      const resolvedMediaValues: MediaFormValue[] = [];
      for (const item of mediaValues) {
        if (!item.pendingFileId) {
          resolvedMediaValues.push(item);
          continue;
        }
        const pendingFile = pendingUploadFilesRef.current[item.pendingFileId];
        if (!pendingFile) {
          return messageApi.error("Thiếu một ảnh cục bộ. Vui lòng chọn lại.");
        }
        const url = await productService.uploadProductImage(pendingFile);
        resolvedMediaValues.push({ ...item, url, pendingFileId: undefined });
      }

      const variantValues = values.variants ?? [];
      const resolvedVariantValues: VariantFormValue[] = [];
      for (const variantValue of variantValues) {
        const imageItems = variantValue.imageItems ?? [];
        const resolvedImageItems: VariantImageFormValue[] = [];
        for (const imageItem of imageItems) {
          if (!imageItem.pendingFileId) {
            resolvedImageItems.push(imageItem);
            continue;
          }
          const pendingFile = pendingUploadFilesRef.current[imageItem.pendingFileId];
          if (!pendingFile) {
            return messageApi.error("Thiếu một ảnh biến thể cục bộ. Vui lòng chọn lại.");
          }
          const url = await productService.uploadProductImage(pendingFile);
          resolvedImageItems.push({ ...imageItem, url, pendingFileId: undefined });
        }
        resolvedVariantValues.push({ ...variantValue, imageItems: resolvedImageItems });
      }

      const media = normalizeMedia(resolvedMediaValues);
      if (media.length === 0) return messageApi.error("Vui lòng thêm ít nhất 1 ảnh/video sản phẩm");

      const variants = normalizeVariants(resolvedVariantValues);
      if (variants.length === 0) return messageApi.error("Vui lòng thêm ít nhất 1 biến thể");

      const reserved = editingProduct?.inventorySummary?.reserved ?? 0;
      const totalStock = values.stock ?? 0;
      const payload: ProductPayload = {
        sku: values.sku.trim(),
        slug,
        name: values.name.trim(),
        brand: values.brand.trim(),
        description: values.description?.trim() || "",
        shortDescription: values.shortDescription?.trim() || "",
        category,
        pricing: { basePrice: values.basePrice, salePrice: values.salePrice, currency: "VND" },
        inventorySummary: { total: totalStock, available: Math.max(totalStock - reserved, 0), reserved },
        status: values.status,
        gender: values.gender,
        ageGroup: values.ageGroup,
        material: toList(values.materialText),
        care: toList(values.careText),
        seoMeta: {
          title: values.seoTitle?.trim() || "",
          description: values.seoDescription?.trim() || "",
          keywords: toList(values.seoKeywordsText),
        },
        media,
        variants,
      };

      if (editingProduct) await updateProduct(editingProduct._id, payload);
      else await createProduct(payload);

      messageApi.success(editingProduct ? "Cập nhật sản phẩm thành công" : "Tạo sản phẩm thành công");
      setIsModalOpen(false);
      setEditingProduct(null);
      resetPendingFiles();
      form.resetFields();
    } catch (error) {
      if (error instanceof Error && "errorFields" in error) return;
      messageApi.error(getErrorMessage(error));
    }
  };

  const columns: ColumnsType<Product> = [
    {
      title: "Ảnh",
      key: "image",
      width: 80,
      render: (_, record) =>
        getPrimaryImage(record) ? (
          <Image src={getPrimaryImage(record)} width={48} height={48} className="rounded-md object-cover" preview={false} />
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    { title: "Mã SKU", dataIndex: "sku", key: "sku", width: 130 },
    { title: "Tên", dataIndex: "name", key: "name", width: 220 },
    { title: "Biến thể", key: "variants", width: 90, render: (_, r) => r.variants?.length ?? 0 },
    { title: "Danh mục", key: "category", width: 150, render: (_, r) => r.category?.name ?? "-" },
    { title: "Giá bán", key: "price", width: 140, render: (_, r) => `${formatCurrency.format(r.pricing.salePrice)} VND` },
    { title: "Tồn kho", key: "stock", width: 90, render: (_, r) => getStock(r) },
    { title: "Trạng thái", dataIndex: "status", key: "status", width: 120, render: (status: ProductStatus) => <Tag color={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Tag> },
    {
      title: "Hành động",
      key: "actions",
      width: 180,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openEditModal(record)}>Sửa</Button>
          <Popconfirm
            title="Xóa sản phẩm"
            description="Bạn có chắc muốn xóa mềm sản phẩm này?"
            onConfirm={() => void deleteProduct(record._id).then(() => messageApi.success("Xóa sản phẩm thành công")).catch((e) => messageApi.error(getErrorMessage(e)))}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button size="small" danger loading={saving}>Xóa</Button>
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
          <Title level={3} className="mb-1! mt-0!">Quản lý sản phẩm</Title>
          <Paragraph className="mb-0!" type="secondary">Quản lý thông tin, ảnh và biến thể sản phẩm.</Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>Thêm sản phẩm</Button>
      </div>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}><Card><Text type="secondary">Tổng sản phẩm</Text><Title level={3}>{total}</Title></Card></Col>
        <Col xs={24} md={8}><Card><Text type="secondary">Đang bán</Text><Title level={3}>{products.filter((p) => p.status === "active").length}</Title></Card></Col>
        <Col xs={24} md={8}><Card><Text type="secondary">Sắp hết hàng (&lt;=10)</Text><Title level={3} className="text-amber-600!">{products.filter((p) => getStock(p) <= 10).length}</Title></Card></Col>
      </Row>

      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px_180px]">
          <Input value={searchText} onChange={(e) => setSearchText(e.target.value)} allowClear placeholder="Tìm theo tên, SKU, thương hiệu hoặc SKU biến thể" />
          <Select value={categoryId ?? "all"} options={categoryFilterOptions} onChange={(value) => void handleCategoryChange(value)} loading={categoryLoading} disabled={keyword.trim().length > 0} />
          <Select<ProductStatusFilter> value={statusFilter} options={STATUS_FILTER_OPTIONS} onChange={(value) => void handleStatusFilterChange(value)} />
        </div>
        <Table<Product>
          rowKey="_id"
          columns={columns}
          dataSource={products}
          loading={loading || saving}
          scroll={{ x: 1400 }}
          pagination={{ current: page, pageSize, total, showSizeChanger: true, showTotal: (value) => `Tổng ${value} sản phẩm` }}
          onChange={(pagination: TablePaginationConfig) =>
            void loadProducts({ page: pagination.current ?? 1, pageSize: pagination.pageSize ?? pageSize, keyword, categoryId, statusFilter }).catch((e) => messageApi.error(getErrorMessage(e)))
          }
        />
      </Card>

      <Modal
        title={null}
        open={isModalOpen}
        onCancel={() => {
          resetPendingFiles();
          setIsModalOpen(false);
        }}
        onOk={() => void handleSave()}
        okText={editingProduct ? "Cập nhật" : "Tạo mới"}
        cancelText="Hủy"
        okButtonProps={{ loading: saving, className: "bg-sky-700! hover:bg-sky-800!" }}
        width="min(1280px, calc(100vw - 32px))"
        destroyOnHidden
      >
        <div className="mb-5 rounded-2xl bg-linear-to-r from-slate-900 to-sky-800 p-4 text-white">
          <Title level={4} className="mb-1! mt-0! text-white!">
            {editingProduct ? "Chỉnh sửa sản phẩm" : "Tạo sản phẩm mới"}
          </Title>
          <Text className="text-slate-200!">
            Điền thông tin cơ bản, thêm ảnh và cấu hình biến thể trước khi lưu.
          </Text>
        </div>

        <Form<ProductFormValues> form={form} layout="vertical" className="product-form-smooth">
          <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <Text strong className="text-base">Trạng thái</Text>
                <Form.Item label="Hiển thị" name="status" rules={REQUIRED_RULE} className="mb-3! mt-3!">
                  <Select options={PRODUCT_STATUS_OPTIONS} />
                </Form.Item>
                <Form.Item label="Tồn kho" name="stock" rules={REQUIRED_RULE} className="mb-0!">
                  <InputNumber min={0} className="w-full!" placeholder="0" />
                </Form.Item>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <Text strong className="text-base">Giá bán</Text>
                <Form.Item label="Giá gốc" name="basePrice" rules={REQUIRED_RULE} className="mb-3! mt-3!">
                  <InputNumber min={0} className="w-full!" placeholder="0" />
                </Form.Item>
                <Form.Item label="Giá bán" name="salePrice" rules={REQUIRED_RULE} className="mb-0!">
                  <InputNumber min={0} className="w-full!" placeholder="0" />
                </Form.Item>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <Text strong className="text-base">Chi tiết nhanh</Text>
                <Form.Item label="Danh mục" name="categoryId" rules={REQUIRED_RULE} className="mb-3! mt-3!">
                  <Select options={categoryOptions} optionFilterProp="label" showSearch placeholder="Chọn danh mục" />
                </Form.Item>
                <Form.Item label="Giới tính" name="gender" className="mb-3!">
                  <Select options={GENDER_OPTIONS} placeholder="Chọn giới tính" />
                </Form.Item>
                <Form.Item label="Nhóm tuổi" name="ageGroup" className="mb-3!">
                  <Select options={AGE_GROUP_OPTIONS} placeholder="Chọn nhóm tuổi" />
                </Form.Item>
                <Form.Item label="Thương hiệu" name="brand" rules={REQUIRED_RULE} className="mb-0!">
                  <Input placeholder="Nhập thương hiệu" />
                </Form.Item>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <Title level={5} className="mb-3! mt-0!">Thông tin chung</Title>
                <div className="grid gap-3 md:grid-cols-2">
                  <Form.Item label="SKU" name="sku" rules={REQUIRED_RULE}><Input placeholder="Ví dụ: RIO-TEE-001" /></Form.Item>
                  <Form.Item label="Tên sản phẩm" name="name" rules={REQUIRED_RULE}><Input placeholder="Nhập tên sản phẩm" /></Form.Item>
                </div>
                <Form.Item label="Mô tả ngắn" name="shortDescription" className="mb-3!">
                  <Input placeholder="Mô tả ngắn hiển thị ở danh sách sản phẩm" />
                </Form.Item>
                <Form.Item label="Mô tả" className="mb-0!">
                  <Form.Item noStyle shouldUpdate>
                    {() => (
                      <RichTextEditor
                        value={(form.getFieldValue("description") as string | undefined) ?? ""}
                        onChange={(nextValue) => form.setFieldValue("description", nextValue)}
                        placeholder="Mô tả chi tiết sản phẩm..."
                        onUploadImage={handleEditorImageUpload}
                      />
                    )}
                  </Form.Item>
                </Form.Item>
                <Form.Item name="description" hidden>
                  <Input />
                </Form.Item>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Title level={5} className="mb-0! mt-0!">Media</Title>
                  <div className="flex items-center gap-2">
                    <Upload accept="image/*" showUploadList={false} customRequest={handleUpload} beforeUpload={beforeUpload}>
                      <Button size="small" icon={<InboxOutlined />}>Chọn ảnh</Button>
                    </Upload>
                    <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => {
                      const fields = (form.getFieldValue("media") ?? []) as MediaFormValue[];
                      form.setFieldValue("media", [...fields, { type: "image", isPrimary: fields.length === 0, url: "" }]);
                    }}>
                      Thêm URL
                    </Button>
                  </div>
                </div>
                {pendingUploadCount > 0 ? <Text type="secondary" className="mb-2 block">{pendingUploadCount} tệp cục bộ sẽ được tải lên khi bạn bấm Lưu.</Text> : null}
                <Form.List name="media">
                  {(fields, { remove }) => (
                    <div className="space-y-2">
                      {fields.map((field) => (
                        <div key={field.key} className="grid gap-2 md:grid-cols-[110px_1fr_1fr_80px_36px]">
                          <Form.Item name={[field.name, "type"]} rules={REQUIRED_RULE}><Select options={MEDIA_TYPE_OPTIONS} /></Form.Item>
                          <Form.Item name={[field.name, "url"]} rules={REQUIRED_RULE}><Input placeholder="https://..." /></Form.Item>
                          <Form.Item name={[field.name, "altText"]}><Input placeholder="Văn bản mô tả ảnh" /></Form.Item>
                          <Form.Item name={[field.name, "isPrimary"]} valuePropName="checked"><Switch /></Form.Item>
                          <Button
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => {
                              const mediaValues = (form.getFieldValue("media") ?? []) as MediaFormValue[];
                              unregisterPendingFile(mediaValues[field.name]?.pendingFileId);
                              remove(field.name);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </Form.List>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <Title level={5} className="mb-3! mt-0!">Thuộc tính thêm</Title>
                <Form.Item label="Chất liệu (phân tách bằng dấu phẩy)" name="materialText" className="mb-3!">
                  <Input placeholder="Cotton, Spandex, Polyester" />
                </Form.Item>
                <Form.Item label="Hướng dẫn bảo quản (phân tách bằng dấu phẩy)" name="careText" className="mb-0!">
                  <Input placeholder="Giặt lạnh, Không sấy, Ủi nhẹ" />
                </Form.Item>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <Title level={5} className="mb-3! mt-0!">SEO Meta</Title>
                <Form.Item label="SEO Title" name="seoTitle" className="mb-3!">
                  <Input placeholder="Tiêu đề SEO" />
                </Form.Item>
                <Form.Item label="SEO Description" name="seoDescription" className="mb-3!">
                  <Input.TextArea rows={2} placeholder="Mô tả SEO" />
                </Form.Item>
                <Form.Item label="SEO Keywords (phân tách bằng dấu phẩy)" name="seoKeywordsText" className="mb-0!">
                  <Input placeholder="áo thun nam, rio shop, áo thể thao" />
                </Form.Item>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Title level={5} className="mb-0! mt-0!">Biến thể</Title>
                  <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => form.setFieldValue("variants", [...((form.getFieldValue("variants") ?? []) as VariantFormValue[]), defaultVariant(((form.getFieldValue("variants") ?? []) as VariantFormValue[]).length)])}>
                    Thêm biến thể
                  </Button>
                </div>
                <Form.List name="variants">
                  {(fields, { remove }) => (
                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <Card
                          key={field.key}
                          size="small"
                          title={`Biến thể #${index + 1}`}
                          extra={
                            <Button
                              size="small"
                              danger
                              onClick={() => {
                                const variantImages = (form.getFieldValue(["variants", field.name, "imageItems"]) ?? []) as VariantImageFormValue[];
                                variantImages.forEach((variantImage) => unregisterPendingFile(variantImage.pendingFileId));
                                remove(field.name);
                              }}
                            >
                              Xóa
                            </Button>
                          }
                        >
                          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start">
                            <div className="grid gap-3 md:grid-cols-2">
                              <Form.Item label="Mã biến thể" name={[field.name, "variantId"]} rules={REQUIRED_RULE}><Input placeholder="variant-1" /></Form.Item>
                              <Form.Item label="SKU biến thể" name={[field.name, "sku"]} rules={REQUIRED_RULE}><Input placeholder="RIO-TEE-001-M" /></Form.Item>
                              <Form.Item label="Kích thước" name={[field.name, "size"]} rules={REQUIRED_RULE}><Select options={VARIANT_SIZE_OPTIONS} /></Form.Item>
                              <Form.Item label="Nhãn size" name={[field.name, "sizeLabel"]}><Input placeholder="M" /></Form.Item>
                              <Form.Item label="Giá cộng thêm" name={[field.name, "additionalPrice"]}><InputNumber min={0} className="w-full!" placeholder="0" /></Form.Item>
                              <Form.Item label="Hoạt động" name={[field.name, "isActive"]} valuePropName="checked"><Switch /></Form.Item>
                              <Form.Item label="Tên màu" name={[field.name, "colorName"]}><Input placeholder="Đỏ đô" /></Form.Item>
                              <Form.Item label="Mã màu HEX" name={[field.name, "colorHex"]}><Input placeholder="#FF0000" /></Form.Item>
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                              <Text className="text-sm" strong>Ảnh biến thể</Text>
                              <div className="mt-2">
                                <Upload accept="image/*" showUploadList={false} customRequest={handleVariantUpload(field.name)} beforeUpload={beforeUpload}>
                                  <Button size="small" icon={<PlusOutlined />} block>Thêm ảnh</Button>
                                </Upload>
                              </div>
                              <Form.List name={[field.name, "imageItems"]}>
                                {(imageFields, { remove: removeImage }) => (
                                  <div className="mt-2 space-y-2">
                                    {imageFields.map((imageField) => (
                                      <div key={imageField.key} className="grid gap-2 grid-cols-[1fr_32px]">
                                        <Form.Item name={[imageField.name, "url"]} rules={REQUIRED_RULE}>
                                          <Input size="small" placeholder="URL ảnh biến thể" />
                                        </Form.Item>
                                        <Button
                                          size="small"
                                          danger
                                          icon={<DeleteOutlined />}
                                          onClick={() => {
                                            const imageItem = form.getFieldValue([
                                              "variants",
                                              field.name,
                                              "imageItems",
                                              imageField.name,
                                            ]) as VariantImageFormValue | undefined;
                                            unregisterPendingFile(imageItem?.pendingFileId);
                                            removeImage(imageField.name);
                                          }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </Form.List>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </Form.List>
              </div>
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
