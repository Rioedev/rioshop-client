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
  Table,
  Tag,
  Upload,
  message,
} from "antd";
import { InboxOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import type { UploadProps } from "antd/es/upload";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  productService,
  type Product,
  type ProductPayload,
  type ProductStatus,
  type ProductStatusFilter,
} from "../../../services/productService";
import {
  ensureImageFile,
  getImageValidationError,
} from "../../../services/mediaUploadService";
import { getErrorMessage } from "../../../utils/errorMessage";
import { useProductStore } from "../../../stores/productStore";
import { RichTextEditor } from "../../../components/editor/RichTextEditor";
import {
  buildProductSku,
  normalizeSkuInput,
} from "../utils/productSku";
import {
  AGE_GROUP_OPTIONS,
  GENDER_OPTIONS,
  PRODUCT_STATUS_OPTIONS,
  REQUIRED_RULE,
  STATUS_COLORS,
  STATUS_FILTER_OPTIONS,
  STATUS_LABELS,
  buildVariantSkuPreviewMatrix,
  defaultVariantGroup,
  flattenVariantGroups,
  formatCurrency,
  getPrimaryImage,
  getStock,
  mapVariantsToGroups,
  normalizeVariantComboKey,
  normalizeVariants,
  parseBulkSizeEntries,
  toList,
  toSlug,
  type ProductFormValues,
  type VariantGroupFormValue,
  type VariantImageFormValue,
  Paragraph,
  Text,
  Title,
} from "./adminProductsShared";
import { AdminProductVariantGroupsField } from "./AdminProductVariantGroupsField";

export function AdminProductsPage() {
  const [form] = Form.useForm<ProductFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const skipFirstSearch = useRef(true);
  const pendingUploadFilesRef = useRef<Record<string, File>>({});
  const productSkuManuallyEditedRef = useRef(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchText, setSearchText] = useState("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [uploadedThumbnailUrl, setUploadedThumbnailUrl] = useState("");
  const watchedName = Form.useWatch("name", form);
  const watchedCategoryId = Form.useWatch("categoryId", form);
  const watchedSku = Form.useWatch("sku", form);
  const watchedVariantGroups = Form.useWatch("variantGroups", form);

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

  const getSuggestedProductSku = useCallback(
    (name = watchedName, currentCategoryId = watchedCategoryId) =>
      buildProductSku({
        name,
        categoryName: currentCategoryId ? categoryLookup[currentCategoryId]?.name : "",
      }),
    [categoryLookup, watchedCategoryId, watchedName],
  );

  const variantSkuPreviewMatrix = useMemo(() => {
    const productSkuForPreview = normalizeSkuInput(watchedSku || "") || getSuggestedProductSku();
    return buildVariantSkuPreviewMatrix(watchedVariantGroups ?? [], productSkuForPreview);
  }, [getSuggestedProductSku, watchedSku, watchedVariantGroups]);

  const syncProductSku = useCallback(() => {
    const nextSku = getSuggestedProductSku();
    if (nextSku !== (form.getFieldValue("sku") as string | undefined)) {
      form.setFieldValue("sku", nextSku);
    }
    return nextSku;
  }, [form, getSuggestedProductSku]);

  const regenerateProductSku = () => {
    productSkuManuallyEditedRef.current = false;
    syncProductSku();
  };

  const appendSizesForGroup = (groupIndex: number) => {
    const groups = ((form.getFieldValue("variantGroups") ?? []) as VariantGroupFormValue[]).map((group) => ({
      ...group,
      sizes: (group.sizes ?? []).map((sizeItem) => ({ ...sizeItem })),
      imageItems: (group.imageItems ?? []).map((imageItem) => ({ ...imageItem })),
    }));

    const targetGroup = groups[groupIndex];
    if (!targetGroup) {
      return;
    }

    const parsedEntries = parseBulkSizeEntries(targetGroup.bulkSizesText ?? "");
    if (parsedEntries.length === 0) {
      messageApi.warning("Nhập danh sách size theo định dạng: S:5, M:8, L:3");
      return;
    }

    const existingSizes = new Set((targetGroup.sizes ?? []).map((sizeItem) => sizeItem.size.trim().toLowerCase()));

    let createdCount = 0;
    for (const entry of parsedEntries) {
      const nextSize = entry.size.trim();
      if (!nextSize) {
        continue;
      }

      const sizeKey = nextSize.toLowerCase();
      if (existingSizes.has(sizeKey)) {
        continue;
      }

      targetGroup.sizes.push({
        variantId: "",
        sku: "",
        size: nextSize,
        sizeLabel: nextSize,
        stock: entry.stock ?? 0,
        additionalPrice: 0,
        isActive: true,
      });
      existingSizes.add(sizeKey);
      createdCount += 1;
    }

    groups[groupIndex] = { ...targetGroup, bulkSizesText: "" };
    form.setFieldValue("variantGroups", groups);

    if (createdCount === 0) {
      messageApi.warning("Không tạo được size mới (có thể bị trùng size trong màu này).");
      return;
    }

    messageApi.success(`Đã thêm ${createdCount} size cho màu này.`);
  };

  useEffect(() => {
    if (!isModalOpen || productSkuManuallyEditedRef.current) {
      return;
    }

    syncProductSku();
  }, [isModalOpen, syncProductSku]);

  const registerPendingFile = (file: File) => {
    const pendingFileId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    pendingUploadFilesRef.current[pendingFileId] = file;
    return pendingFileId;
  };

  const unregisterPendingFile = (pendingFileId?: string) => {
    if (!pendingFileId) return;
    delete pendingUploadFilesRef.current[pendingFileId];
  };

  const resetPendingFiles = () => {
    pendingUploadFilesRef.current = {};
  };

  const handleVariantGroupUpload = (groupFieldName: number): UploadProps["customRequest"] =>
    async ({ file, onSuccess, onError }) => {
      try {
        const nextFile = file as File;
        const pendingFileId = registerPendingFile(nextFile);
        const current = (form.getFieldValue(["variantGroups", groupFieldName, "imageItems"]) ?? []) as VariantImageFormValue[];
        form.setFieldValue(["variantGroups", groupFieldName, "imageItems"], [
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
    const validationError = getImageValidationError(file as File, 5);
    if (validationError) {
      messageApi.error(validationError);
      return false;
    }
    return true;
  };

  const handleEditorImageUpload = async (file: File) => {
    ensureImageFile(file, 5);
    return productService.uploadProductImage(file);
  };

  const uploadThumbnail: UploadProps["customRequest"] = async ({ file, onSuccess, onError }) => {
    try {
      setThumbnailUploading(true);
      const url = await productService.uploadProductImage(file as File);
      setUploadedThumbnailUrl(url);
      form.setFieldValue("thumbnailUrl", url);
      onSuccess?.("ok");
      messageApi.success("Đã tải ảnh đại diện");
    } catch (error) {
      onError?.(error as Error);
      messageApi.error(getErrorMessage(error));
    } finally {
      setThumbnailUploading(false);
    }
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
    productSkuManuallyEditedRef.current = false;
    setUploadedThumbnailUrl("");
    form.resetFields();
    form.setFieldsValue({
      status: "active",
      sku: "",
      variantGroups: [defaultVariantGroup()],
      gender: "unisex",
      ageGroup: "adult",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    resetPendingFiles();
    productSkuManuallyEditedRef.current = true;
    const primaryImage = getPrimaryImage(product) ?? "";
    setUploadedThumbnailUrl(primaryImage);
    form.setFieldsValue({
      sku: product.sku,
      name: product.name,
      brand: product.brand,
      categoryId: product.category?._id,
      basePrice: product.pricing.basePrice,
      salePrice: product.pricing.salePrice,
      status: product.status,
      description: product.description,
      shortDescription: product.shortDescription,
      thumbnailUrl: primaryImage,
      gender: product.gender,
      ageGroup: product.ageGroup,
      materialText: (product.material ?? []).join(", "),
      careText: (product.care ?? []).join(", "),
      seoTitle: product.seoMeta?.title,
      seoDescription: product.seoMeta?.description,
      seoKeywordsText: (product.seoMeta?.keywords ?? []).join(", "),
      variantGroups: mapVariantsToGroups(product.variants ?? []),
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

      const variantGroups = values.variantGroups ?? [];
      const resolvedVariantGroups: VariantGroupFormValue[] = [];
      for (const [groupIndex, groupValue] of variantGroups.entries()) {
        const colorName = groupValue.colorName?.trim() || "";
        const colorHex = groupValue.colorHex?.trim() || "";
        if (!colorName && !colorHex) {
          return messageApi.error(`Vui lòng nhập màu cho nhóm #${groupIndex + 1}.`);
        }

        const normalizedSizes = (groupValue.sizes ?? [])
          .map((sizeItem) => ({
            ...sizeItem,
            size: sizeItem.size?.trim() || "",
            sizeLabel: sizeItem.sizeLabel?.trim() || sizeItem.size?.trim() || "",
            stock: sizeItem.stock ?? 0,
            additionalPrice: sizeItem.additionalPrice ?? 0,
            isActive: sizeItem.isActive ?? true,
          }))
          .filter((sizeItem) => Boolean(sizeItem.size));

        if (normalizedSizes.length === 0) {
          return messageApi.error(`Vui lòng thêm ít nhất 1 size cho màu #${groupIndex + 1}.`);
        }

        const imageItems = groupValue.imageItems ?? [];
        const resolvedImageItems: VariantImageFormValue[] = [];
        for (const imageItem of imageItems) {
          if (!imageItem.pendingFileId) {
            resolvedImageItems.push(imageItem);
            continue;
          }
          const pendingFile = pendingUploadFilesRef.current[imageItem.pendingFileId];
          if (!pendingFile) {
            return messageApi.error("Thiếu một ảnh màu cục bộ. Vui lòng chọn lại.");
          }
          const url = await productService.uploadProductImage(pendingFile);
          resolvedImageItems.push({ ...imageItem, url, pendingFileId: undefined });
        }

        resolvedVariantGroups.push({
          colorName,
          colorHex,
          imageItems: resolvedImageItems,
          sizes: normalizedSizes,
          bulkSizesText: "",
        });
      }

      const resolvedVariantValues = flattenVariantGroups(resolvedVariantGroups);
      const variants = normalizeVariants(resolvedVariantValues);
      if (variants.length === 0) return messageApi.error("Vui lòng thêm ít nhất 1 biến thể");

      const comboSet = new Set<string>();
      for (const variant of variants) {
        const comboKey = normalizeVariantComboKey(variant.color?.name, variant.color?.hex, variant.size);
        if (comboSet.has(comboKey)) {
          return messageApi.error("Bị trùng biến thể cùng màu + size. Vui lòng kiểm tra lại.");
        }
        comboSet.add(comboKey);
      }

      const payload: ProductPayload = {
        sku: values.sku?.trim() || "",
        slug,
        name: values.name.trim(),
        brand: values.brand.trim(),
        description: values.description?.trim() || "",
        shortDescription: values.shortDescription?.trim() || "",
        category,
        pricing: { basePrice: values.basePrice, salePrice: values.salePrice, currency: "VND" },
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
        variants,
      };

      const nextThumbnail = values.thumbnailUrl?.trim();
      if (nextThumbnail) {
        payload.media = [
          {
            url: nextThumbnail,
            type: "image",
            isPrimary: true,
            position: 0,
          },
        ];
      }

      if (editingProduct) await updateProduct(editingProduct._id, payload);
      else await createProduct(payload);

      messageApi.success(editingProduct ? "Cập nhật sản phẩm thành công" : "Tạo sản phẩm thành công");
      setIsModalOpen(false);
      setEditingProduct(null);
      productSkuManuallyEditedRef.current = false;
      resetPendingFiles();
      setUploadedThumbnailUrl("");
      form.resetFields();
    } catch (error) {
      if (error instanceof Error && "errorFields" in error) return;
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleCopy = async (value: string, label: string) => {
    if (!value) {
      messageApi.warning(`Không có ${label.toLowerCase()} để sao chép.`);
      return;
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = value;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      messageApi.success(`Đã sao chép ${label}.`);
    } catch (error) {
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
            productSkuManuallyEditedRef.current = false;
            resetPendingFiles();
            setUploadedThumbnailUrl("");
            form.resetFields();
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
            Điền thông tin cơ bản và cấu hình màu, size, tồn kho theo từng size trước khi lưu.
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
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <Text strong className="text-base">Ảnh đại diện</Text>
                <Form.Item className="mb-0! mt-3!">
                  <div className="grid gap-3">
                    <Upload.Dragger
                      accept="image/*"
                      maxCount={1}
                      showUploadList={false}
                      customRequest={uploadThumbnail}
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
                        Ảnh này sẽ dùng làm thumbnail hiển thị ngoài Store
                      </p>
                    </Upload.Dragger>
                    <Form.Item name="thumbnailUrl" hidden>
                      <Input />
                    </Form.Item>
                    {thumbnailUploading ? (
                      <Text type="secondary">Đang tải ảnh đại diện...</Text>
                    ) : null}
                    {uploadedThumbnailUrl ? (
                      <Image
                        src={uploadedThumbnailUrl}
                        width={240}
                        height={160}
                        className="rounded-xl object-cover"
                        preview={false}
                      />
                    ) : (
                      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                        Chưa có ảnh đại diện
                      </div>
                    )}
                  </div>
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

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <Title level={5} className="mb-3! mt-0!">SEO meta</Title>
                <Form.Item label="SEO title" name="seoTitle" className="mb-3!">
                  <Input placeholder="Tiêu đề SEO" />
                </Form.Item>
                <Form.Item label="SEO description" name="seoDescription" className="mb-3!">
                  <Input.TextArea rows={2} placeholder="Mô tả SEO" />
                </Form.Item>
                <Form.Item label="SEO keywords (ngăn cách bằng dấu phẩy)" name="seoKeywordsText" className="mb-0!">
                  <Input placeholder="áo thun nam, rio shop, áo thể thao" />
                </Form.Item>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <Title level={5} className="mb-3! mt-0!">Thông tin chung</Title>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Form.Item label="SKU" className="mb-1!">
                      <Space.Compact block>
                        <Form.Item name="sku" noStyle>
                          <Input
                            placeholder="VD: AO-THUN"
                            onChange={(event) => {
                              productSkuManuallyEditedRef.current = true;
                              form.setFieldValue("sku", event.target.value);
                            }}
                            onBlur={() => {
                              if (!(form.getFieldValue("sku") as string | undefined)?.trim()) {
                                productSkuManuallyEditedRef.current = false;
                                syncProductSku();
                              }
                            }}
                          />
                        </Form.Item>
                        <Button onClick={regenerateProductSku}>Tự sinh</Button>
                      </Space.Compact>
                    </Form.Item>
                  </div>
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
                <Title level={5} className="mb-3! mt-0!">Thuộc tính thêm</Title>
                <Form.Item label="Chất liệu (phân tách bằng dấu phẩy)" name="materialText" className="mb-3!">
                  <Input placeholder="Cotton, Spandex, Polyester" />
                </Form.Item>
                <Form.Item label="Hướng dẫn bảo quản (phân tách bằng dấu phẩy)" name="careText" className="mb-0!">
                  <Input placeholder="Giặt lạnh, Không sấy, Ủi nhẹ" />
                </Form.Item>
              </div>

              <AdminProductVariantGroupsField
                form={form}
                variantSkuPreviewMatrix={variantSkuPreviewMatrix}
                appendSizesForGroup={appendSizesForGroup}
                handleVariantGroupUpload={handleVariantGroupUpload}
                beforeUpload={beforeUpload}
                unregisterPendingFile={unregisterPendingFile}
                handleCopy={handleCopy}
              />
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  );
}




