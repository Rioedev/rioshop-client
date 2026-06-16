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
import { DownloadOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import type { UploadProps } from "antd/es/upload";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type Product,
  type ProductPayload,
  type ProductStatus,
  type ProductStatusFilter,
  type ProductImportXlsxError,
} from "../../../services/productService";
import { inventoryService, type InventoryRecord } from "../../../services/inventoryService";
import {
  ensureImageFile,
  getImageValidationError,
} from "../../../services/mediaUploadService";
import { subscribeAdminRealtime } from "../../../services/socketClient";
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
  type SizeChartRowFormValue,
  type VariantGroupFormValue,
  type VariantImageFormValue,
  Paragraph,
  Text,
  Title,
} from "../shared/products";
import { getInventoryAlertInfo, type InventoryAlertInfo } from "../shared/inventoryAlerts";
import { AdminProductVariantGroupsField } from "./AdminProductVariantGroupsField";

type ProductInventoryAlertSummary = {
  count: number;
  worstAlert: InventoryAlertInfo;
};

export function AdminProductsPage() {
  const [form] = Form.useForm<ProductFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const skipFirstSearch = useRef(true);
  const pendingUploadFilesRef = useRef<Record<string, File>>({});
  const productSkuManuallyEditedRef = useRef(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchText, setSearchText] = useState("");
  const [importingXlsx, setImportingXlsx] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [importErrors, setImportErrors] = useState<ProductImportXlsxError[]>([]);
  const [importErrorTotal, setImportErrorTotal] = useState(0);
  const [importErrorOpen, setImportErrorOpen] = useState(false);
  const [productInventoryAlerts, setProductInventoryAlerts] = useState<Record<string, ProductInventoryAlertSummary>>({});
  const [inventoryAlertTotal, setInventoryAlertTotal] = useState(0);
  const watchedName = Form.useWatch("name", form);
  const watchedCategoryId = Form.useWatch("categoryId", form);
  const watchedSku = Form.useWatch("sku", form);
  const watchedVariantGroups = Form.useWatch("variantGroups", form);

  const {
    products,
    categoryOptions,
    collectionOptions,
    categoryLookup,
    collectionLookup,
    loading,
    categoryLoading,
    collectionLoading,
    saving,
    page,
    pageSize,
    total,
    keyword,
    categoryId,
    collectionId,
    statusFilter,
    loadProducts,
    loadCategoryOptions,
    loadCollectionOptions,
    setKeyword,
    setCategoryId,
    setCollectionId,
    setStatusFilter,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImage,
    exportProductsXlsx,
    downloadProductsImportTemplateXlsx,
    importProductsXlsx,
  } = useProductStore();

  const loadProductInventoryAlerts = useCallback(async () => {
    const pageSizeForAlerts = 100;
    const firstPage = await inventoryService.getLowStockItems({ page: 1, limit: pageSizeForAlerts });
    const rows: InventoryRecord[] = [...firstPage.docs];

    if (firstPage.totalPages > 1) {
      const pageRequests: Promise<Awaited<ReturnType<typeof inventoryService.getLowStockItems>>>[] = [];
      for (let pageIndex = 2; pageIndex <= firstPage.totalPages; pageIndex += 1) {
        pageRequests.push(inventoryService.getLowStockItems({ page: pageIndex, limit: pageSizeForAlerts }));
      }

      const pageResults = await Promise.all(pageRequests);
      pageResults.forEach((result) => rows.push(...result.docs));
    }

    const nextAlerts = rows.reduce<Record<string, ProductInventoryAlertSummary>>((result, item) => {
      const productId = item.productId?.trim();
      if (!productId) {
        return result;
      }

      const alert = getInventoryAlertInfo(item);
      const current = result[productId];
      result[productId] = {
        count: (current?.count ?? 0) + 1,
        worstAlert: !current || alert.priority > current.worstAlert.priority ? alert : current.worstAlert,
      };
      return result;
    }, {});

    setProductInventoryAlerts(nextAlerts);
    setInventoryAlertTotal(rows.length);
  }, []);

  useEffect(() => {
    setSearchText(keyword);
  }, [keyword]);

  useEffect(() => {
    void Promise.all([
      loadCategoryOptions(),
      loadCollectionOptions(),
      loadProducts({
        page: 1,
        pageSize: 10,
        keyword: "",
        categoryId: undefined,
        collectionId: undefined,
        statusFilter: "all",
      }),
    ]).catch((error) => messageApi.error(getErrorMessage(error)));
  }, [loadCategoryOptions, loadCollectionOptions, loadProducts, messageApi]);

  useEffect(() => {
    void loadProductInventoryAlerts().catch((error) => messageApi.error(getErrorMessage(error)));
  }, [loadProductInventoryAlerts, messageApi]);

  useEffect(() => {
    let refreshTimer: number | null = null;
    const unsubscribe = subscribeAdminRealtime({
      onInventoryUpdated: () => {
        if (refreshTimer) {
          window.clearTimeout(refreshTimer);
        }
        refreshTimer = window.setTimeout(() => {
          void loadProductInventoryAlerts().catch((error) => messageApi.error(getErrorMessage(error)));
        }, 600);
      },
    });

    return () => {
      if (refreshTimer) {
        window.clearTimeout(refreshTimer);
      }
      unsubscribe();
    };
  }, [loadProductInventoryAlerts, messageApi]);

  useEffect(() => {
    if (skipFirstSearch.current) {
      skipFirstSearch.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const q = searchText.trim();
      setKeyword(q);
      const nextCategory = q ? undefined : categoryId;
      const nextCollection = q ? undefined : collectionId;
      if (q && categoryId) setCategoryId(undefined);
      if (q && collectionId) setCollectionId(undefined);
      void loadProducts({
        page: 1,
        pageSize,
        keyword: q,
        categoryId: nextCategory,
        collectionId: nextCollection,
        statusFilter,
      }).catch((error) => messageApi.error(getErrorMessage(error)));
    }, 350);
    return () => clearTimeout(timer);
  }, [
    categoryId,
    collectionId,
    loadProducts,
    messageApi,
    pageSize,
    searchText,
    setCategoryId,
    setCollectionId,
    setKeyword,
    statusFilter,
  ]);

  const categoryFilterOptions = useMemo(
    () => [{ value: "all", label: "Tất cả danh mục" }, ...categoryOptions],
    [categoryOptions],
  );

  const collectionFilterOptions = useMemo(
    () => [{ value: "all", label: "Tất cả bộ sưu tập" }, ...collectionOptions],
    [collectionOptions],
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

  const normalizeSizeChartRows = (rows: SizeChartRowFormValue[] = []) =>
    rows
      .map((row) => ({
        size: row.size?.trim() || "",
        shoulder: row.shoulder ?? null,
        chest: row.chest ?? null,
        waist: row.waist ?? null,
        hip: row.hip ?? null,
        length: row.length ?? null,
      }))
      .filter((row) => {
        const hasSize = row.size.length > 0;
        const hasMeasurement = [row.shoulder, row.chest, row.waist, row.hip, row.length].some(
          (value) => value !== null && value !== undefined && Number(value) > 0,
        );
        return hasSize && hasMeasurement;
      });

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
    return uploadProductImage(file);
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
        collectionId,
        statusFilter,
      });
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleCollectionChange = async (value: string) => {
    const nextCollectionId = value === "all" ? undefined : value;
    setCollectionId(nextCollectionId);

    try {
      await loadProducts({
        page: 1,
        pageSize,
        keyword,
        categoryId,
        collectionId: nextCollectionId,
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
        collectionId,
        statusFilter: value,
      });
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleExportXlsx = async () => {
    try {
      setExportingXlsx(true);
      const blob = await exportProductsXlsx({
        q: keyword.trim() || undefined,
        category: categoryId,
        collection: collectionId,
        status: statusFilter,
        sort: { createdAt: -1 },
      });

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `products-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      messageApi.success("Đã xuất file Excel sản phẩm.");
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    } finally {
      setExportingXlsx(false);
    }
  };

  const handleDownloadImportTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      const blob = await downloadProductsImportTemplateXlsx();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "products-import-template.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      messageApi.success("Đã tải file mẫu import sản phẩm.");
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const beforeImportXlsx: UploadProps["beforeUpload"] = (file) => {
    const isXlsxFile =
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.name.toLowerCase().endsWith(".xlsx");
    if (!isXlsxFile) {
      messageApi.error("Chỉ chấp nhận file Excel (.xlsx)");
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const handleImportXlsx: UploadProps["customRequest"] = async ({ file, onSuccess, onError }) => {
    try {
      setImportingXlsx(true);
      const result = await importProductsXlsx(file as File);
      onSuccess?.("ok");

      if (result.failed > 0) {
        messageApi.warning(
          `Import xong: tạo ${result.created}, cập nhật ${result.updated}, lỗi ${result.failed}.`,
        );
      } else {
        messageApi.success(
          `Import thành công: tạo ${result.created}, cập nhật ${result.updated}.`,
        );
      }

      if (result.errors.length > 0) {
        setImportErrors(result.errors);
        setImportErrorTotal(result.totalErrors ?? result.errors.length);
        setImportErrorOpen(true);
      }

      await loadProducts({
        page: 1,
        pageSize,
        keyword,
        categoryId,
        collectionId,
        statusFilter,
      });
    } catch (error) {
      onError?.(error as Error);
      messageApi.error(getErrorMessage(error));
    } finally {
      setImportingXlsx(false);
    }
  };

  const importErrorColumns: ColumnsType<ProductImportXlsxError> = [
    { title: "Dòng", dataIndex: "row", key: "row", width: 80, render: (v?: number) => v ?? "—" },
    { title: "SKU", dataIndex: "sku", key: "sku", width: 200, render: (v?: string) => v || "—" },
    { title: "Lỗi", dataIndex: "message", key: "message" },
  ];

  const handleCopyImportErrors = async () => {
    if (importErrors.length === 0) return;
    const header = "row\tsku\tmessage";
    const lines = importErrors.map((e) =>
      [e.row ?? "", e.sku ?? "", (e.message ?? "").replace(/[\t\r\n]+/g, " ")].join("\t"),
    );
    const text = [header, ...lines].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      messageApi.success(`Đã sao chép ${importErrors.length} dòng lỗi.`);
    } catch {
      messageApi.error("Không sao chép được. Hãy chọn và copy thủ công.");
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    resetPendingFiles();
    productSkuManuallyEditedRef.current = false;
    form.resetFields();
    form.setFieldsValue({
      // Tạo mới luôn là draft — chưa có PO nhập hàng nên Đang bán sẽ tự
      // flip về out_of_stock, gây nhầm. Chuyển sang Đang bán sau khi edit.
      status: "draft",
      sku: "",
      collectionIds: [],
      variantGroups: [defaultVariantGroup()],
      gender: "unisex",
      ageGroup: "adult",
      sizeChartRows: [],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    resetPendingFiles();
    productSkuManuallyEditedRef.current = true;
    form.setFieldsValue({
      sku: product.sku,
      name: product.name,
      brand: product.brand,
      categoryId: product.category?._id,
      collectionIds: (product.collections ?? []).map((item) => item._id),
      regularPrice: product.pricing.regularPrice ?? product.pricing.salePrice ?? 0,
      compareAtPrice: product.pricing.compareAtPrice ?? product.pricing.basePrice ?? 0,
      costPrice: product.pricing.costPrice ?? 0,
      // out_of_stock là tình trạng kho tự động — map về "active" để admin
      // chỉnh đúng ý đồ bán. Khi save, hook pre("save") sẽ lại tự flip nếu thực sự hết hàng.
      status: product.status === "out_of_stock" ? "active" : product.status,
      description: product.description,
      shortDescription: product.shortDescription,
      gender: product.gender,
      ageGroup: product.ageGroup,
      materialText: (product.material ?? []).join(", "),
      careText: (product.care ?? []).join(", "),
      sizeChartRows: product.sizeChart?.rows ?? [],
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
      const selectedCollections = (values.collectionIds ?? [])
        .map((collectionItemId) => collectionLookup[collectionItemId])
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

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
          const url = await uploadProductImage(pendingFile);
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
        collections: selectedCollections.map((item) => ({
          _id: item._id,
          name: item.name,
          slug: item.slug,
          image: item.image,
        })),
        pricing: {
          regularPrice: values.regularPrice,
          compareAtPrice: values.compareAtPrice ?? 0,
          currency: "VND",
        },
        status: values.status,
        gender: values.gender,
        ageGroup: values.ageGroup,
        material: toList(values.materialText),
        care: toList(values.careText),
        sizeChart: {
          unit: "cm",
          rows: normalizeSizeChartRows(values.sizeChartRows),
        },
        seoMeta: {
          title: values.seoTitle?.trim() || "",
          description: values.seoDescription?.trim() || "",
          keywords: toList(values.seoKeywordsText),
        },
        variants,
      };

      const nextThumbnail = resolvedVariantGroups[0]?.imageItems?.[0]?.url?.trim() || "";
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
    {
      title: "Bộ sưu tập",
      key: "collections",
      width: 220,
      render: (_, record) =>
        (record.collections ?? []).length > 0
          ? (record.collections ?? []).map((item) => item.name).join(", ")
          : "-",
    },
    {
      title: "Giá bán thường ngày",
      key: "price",
      width: 170,
      render: (_, r) => `${formatCurrency.format(r.pricing.regularPrice ?? r.pricing.salePrice ?? 0)} VND`,
    },
    { title: "Tồn kho", key: "stock", width: 90, render: (_, r) => getStock(r) },
    {
      title: "Cảnh báo tồn kho",
      key: "inventoryAlert",
      width: 150,
      render: (_, record) => {
        const alert = productInventoryAlerts[record._id];
        if (!alert) {
          return <Tag color="green">Bình thường</Tag>;
        }

        return (
          <Tag color={alert.worstAlert.color}>
            {alert.count} SKU {alert.worstAlert.label}
          </Tag>
        );
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 160,
      render: (status: ProductStatus, record) => {
        // Cảnh báo: sp đang Nháp nhưng đã có hàng tồn → admin nên publish
        const available = record.inventorySummary?.available ?? 0;
        const isDraftReady = status === "draft" && available > 0;
        return (
          <Space direction="vertical" size={2}>
            <Tag color={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Tag>
            {isDraftReady ? (
              <Tag color="orange" className="m-0!" title="Đã có hàng, đổi sang Đang bán để hiển thị ở storefront">
                Sẵn sàng publish
              </Tag>
            ) : null}
          </Space>
        );
      },
    },
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
        <Space wrap>
          <Upload
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            showUploadList={false}
            beforeUpload={beforeImportXlsx}
            customRequest={handleImportXlsx}
            disabled={importingXlsx || exportingXlsx || downloadingTemplate || saving}
          >
            <Button icon={<UploadOutlined />} loading={importingXlsx}>
              Nhập Excel
            </Button>
          </Upload>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => void handleDownloadImportTemplate()}
            loading={downloadingTemplate}
            disabled={importingXlsx || exportingXlsx || saving}
          >
            Tải file mẫu
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => void handleExportXlsx()}
            loading={exportingXlsx}
            disabled={importingXlsx || downloadingTemplate || saving}
          >
            Xuất Excel
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>Thêm sản phẩm</Button>
        </Space>
      </div>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}><Card><Text type="secondary">Tổng sản phẩm</Text><Title level={3}>{total}</Title></Card></Col>
        <Col xs={24} md={8}><Card><Text type="secondary">Đang bán</Text><Title level={3}>{products.filter((p) => p.status === "active").length}</Title></Card></Col>
        <Col xs={24} md={8}><Card><Text type="secondary">SKU cần nhập hàng</Text><Title level={3} className="text-amber-600!">{inventoryAlertTotal}</Title></Card></Col>
      </Row>

      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px_220px_180px]">
          <Input value={searchText} onChange={(e) => setSearchText(e.target.value)} allowClear placeholder="Tìm theo tên, SKU, thương hiệu hoặc SKU biến thể" />
          <Select value={categoryId ?? "all"} options={categoryFilterOptions} onChange={(value) => void handleCategoryChange(value)} loading={categoryLoading} disabled={keyword.trim().length > 0} />
          <Select value={collectionId ?? "all"} options={collectionFilterOptions} onChange={(value) => void handleCollectionChange(value)} loading={collectionLoading} disabled={keyword.trim().length > 0} />
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
            void loadProducts({ page: pagination.current ?? 1, pageSize: pagination.pageSize ?? pageSize, keyword, categoryId, collectionId, statusFilter }).catch((e) => messageApi.error(getErrorMessage(e)))
          }
        />
      </Card>

        <Modal
          title={null}
          open={isModalOpen}
          onCancel={() => {
            productSkuManuallyEditedRef.current = false;
            resetPendingFiles();
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
                  <Select options={PRODUCT_STATUS_OPTIONS} disabled={!editingProduct} />
                </Form.Item>
                <div className="mt-2 flex items-center gap-2">
                  <Text type="secondary" className="text-xs">Tình trạng kho:</Text>
                  {editingProduct ? (
                    (editingProduct.inventorySummary?.available ?? 0) > 0 ? (
                      <Tag color="green">Còn hàng ({editingProduct.inventorySummary?.available ?? 0} sp)</Tag>
                    ) : (
                      <Tag color="red">Hết hàng</Tag>
                    )
                  ) : (
                    <Tag color="default">Chưa nhập hàng</Tag>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <Text strong className="text-base">Chính sách giá</Text>
                <Form.Item
                  label="Giá bán thường ngày"
                  name="regularPrice"
                  rules={REQUIRED_RULE}
                  className="mb-3! mt-3!"
                >
                  <InputNumber<number>
                    min={0}
                    precision={0}
                    className="w-full!"
                    placeholder="0"
                    addonAfter="VND"
                    formatter={(value) =>
                      value === undefined || value === null
                        ? ""
                        : `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(value) => {
                      const digits = (value || "").toString().replace(/\D/g, "");
                      return digits ? Number(digits) : 0;
                    }}
                  />
                </Form.Item>
                <Form.Item
                  label="Giá tham chiếu / niêm yết (tùy chọn)"
                  name="compareAtPrice"
                  className="mb-3!"
                  rules={[
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (value === undefined || value === null || value === "") return Promise.resolve();
                        const compareAt = Number(value);
                        const regular = Number(getFieldValue("regularPrice"));
                        if (Number.isFinite(compareAt) && compareAt > 0 && Number.isFinite(regular) && compareAt < regular) {
                          return Promise.reject(new Error("Giá tham chiếu phải lớn hơn hoặc bằng giá bán thường ngày"));
                        }
                        return Promise.resolve();
                      },
                    }),
                  ]}
                >
                  <InputNumber<number>
                    min={0}
                    precision={0}
                    className="w-full!"
                    placeholder="0"
                    addonAfter="VND"
                    formatter={(value) =>
                      value === undefined || value === null
                        ? ""
                        : `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(value) => {
                      const digits = (value || "").toString().replace(/\D/g, "");
                      return digits ? Number(digits) : 0;
                    }}
                  />
                </Form.Item>
                <Form.Item label="Giá vốn (tự cập nhật từ PO)" name="costPrice" className="mb-0!">
                  <InputNumber
                    min={0}
                    precision={0}
                    className="w-full!"
                    placeholder="0"
                    addonAfter="VND"
                    disabled
                    formatter={(value) =>
                      value === undefined || value === null
                        ? ""
                        : `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                  />
                </Form.Item>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <Text strong className="text-base">Chi tiết nhanh</Text>
                <Form.Item label="Danh mục" name="categoryId" rules={REQUIRED_RULE} className="mb-3! mt-3!">
                  <Select options={categoryOptions} optionFilterProp="label" showSearch placeholder="Chọn danh mục" />
                </Form.Item>
                <Form.Item label="Bộ sưu tập" name="collectionIds" className="mb-3!">
                  <Select
                    mode="multiple"
                    options={collectionOptions}
                    optionFilterProp="label"
                    showSearch
                    allowClear
                    placeholder="Chọn bộ sưu tập"
                  />
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
                <Title level={5} className="mb-3! mt-0!">Thuộc tính thêm</Title>
                <Form.Item label="Chất liệu (phân tách bằng dấu phẩy)" name="materialText" className="mb-3!">
                  <Input placeholder="Cotton, Spandex, Polyester" />
                </Form.Item>
                <Form.Item label="Hướng dẫn bảo quản (phân tách bằng dấu phẩy)" name="careText" className="mb-0!">
                  <Input placeholder="Giặt lạnh, Không sấy, Ủi nhẹ" />
                </Form.Item>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <Form.List name="sizeChartRows">
                  {(fields, { add, remove }) => (
                    <div className="space-y-2">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <Title level={5} className="m-0!">Hướng dẫn chọn size</Title>
                        <Button
                          size="small"
                          onClick={() =>
                            add({
                              size: "",
                              shoulder: null,
                              chest: null,
                              waist: null,
                              hip: null,
                              length: null,
                            })
                          }
                        >
                          Thêm dòng
                        </Button>
                      </div>
                      {fields.length === 0 ? (
                        <Text type="secondary" className="text-xs!">
                          Chưa có bảng size cho sản phẩm này.
                        </Text>
                      ) : null}
                      {fields.map((field) => (
                        <div key={field.key} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <div className="grid grid-cols-2 gap-3">
                            <Form.Item label="Size" name={[field.name, "size"]} className="mb-0!">
                              <Input placeholder="M, L, XL" />
                            </Form.Item>
                            <Form.Item label="Vai (cm)" name={[field.name, "shoulder"]} className="mb-0!">
                              <InputNumber min={0} precision={1} placeholder="42" className="w-full!" />
                            </Form.Item>
                            <Form.Item label="Ngực (cm)" name={[field.name, "chest"]} className="mb-0!">
                              <InputNumber min={0} precision={1} placeholder="96" className="w-full!" />
                            </Form.Item>
                            <Form.Item label="Eo (cm)" name={[field.name, "waist"]} className="mb-0!">
                              <InputNumber min={0} precision={1} placeholder="76" className="w-full!" />
                            </Form.Item>
                            <Form.Item label="Hông (cm)" name={[field.name, "hip"]} className="mb-0!">
                              <InputNumber min={0} precision={1} placeholder="98" className="w-full!" />
                            </Form.Item>
                            <Form.Item label="Dài (cm)" name={[field.name, "length"]} className="mb-0!">
                              <InputNumber min={0} precision={1} placeholder="68" className="w-full!" />
                            </Form.Item>
                          </div>
                          <div className="mt-3 flex justify-end">
                            <Button danger size="small" onClick={() => remove(field.name)}>
                              Xóa dòng
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Text type="secondary" className="block text-xs!">
                        Đơn vị cm. Có thể chỉ nhập các cột phù hợp với loại sản phẩm.
                      </Text>
                    </div>
                  )}
                </Form.List>
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

      <Modal
        title={`Chi tiết lỗi import (${importErrors.length}${
          importErrorTotal > importErrors.length ? ` / ${importErrorTotal}` : ""
        })`}
        open={importErrorOpen}
        onCancel={() => setImportErrorOpen(false)}
        width={760}
        footer={[
          <Button key="copy" onClick={() => void handleCopyImportErrors()}>
            Sao chép danh sách
          </Button>,
          <Button key="close" type="primary" onClick={() => setImportErrorOpen(false)}>
            Đóng
          </Button>,
        ]}
      >
        {importErrorTotal > importErrors.length ? (
          <Paragraph type="warning" className="mb-3!">
            Hiển thị {importErrors.length} lỗi đầu trên tổng số {importErrorTotal}. Sửa các lỗi
            trên rồi import lại để xem phần còn lại.
          </Paragraph>
        ) : null}
        <Table<ProductImportXlsxError>
          rowKey={(record, index) => `${record.row ?? index}-${record.sku ?? ""}`}
          columns={importErrorColumns}
          dataSource={importErrors}
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: false }}
          scroll={{ y: 360 }}
        />
      </Modal>
    </div>
  );
}





