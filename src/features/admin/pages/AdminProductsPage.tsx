import {
  AutoComplete,
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
import { CopyOutlined, DeleteOutlined, InboxOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import type { UploadProps } from "antd/es/upload";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  productService,
  type Product,
  type ProductPayload,
  type ProductGender,
  type ProductStatus,
  type ProductStatusFilter,
  type ProductVariant,
  type ProductVariantSize,
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
  buildVariantSku,
  makeUniqueSku,
  normalizeSkuInput,
} from "../utils/productSku";

const { Paragraph, Title, Text } = Typography;
const REQUIRED_RULE = [{ required: true, message: "Trường bắt buộc" }];

type VariantImageFormValue = {
  url: string;
  pendingFileId?: string;
};

type VariantFormValue = {
  variantId: string;
  sku: string;
  size: ProductVariantSize;
  sizeLabel?: string;
  stock?: number;
  additionalPrice?: number;
  isActive?: boolean;
  colorName?: string;
  colorHex?: string;
  imageItems?: VariantImageFormValue[];
};

type VariantSizeFormValue = {
  variantId?: string;
  sku?: string;
  size: ProductVariantSize;
  sizeLabel?: string;
  stock?: number;
  additionalPrice?: number;
  isActive?: boolean;
};

type VariantGroupFormValue = {
  colorName?: string;
  colorHex?: string;
  imageItems?: VariantImageFormValue[];
  sizes: VariantSizeFormValue[];
  bulkSizesText?: string;
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
  status: ProductStatus;
  description?: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  materialText?: string;
  careText?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywordsText?: string;
  variantGroups: VariantGroupFormValue[];
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
  { value: "38", label: "38" },
  { value: "39", label: "39" },
  { value: "40", label: "40" },
  { value: "41", label: "41" },
  { value: "42", label: "42" },
  { value: "43", label: "43" },
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

const defaultVariantSize = (size: ProductVariantSize = "M"): VariantSizeFormValue => ({
  variantId: "",
  sku: "",
  size,
  sizeLabel: size,
  stock: 0,
  additionalPrice: 0,
  isActive: true,
});

const defaultVariantGroup = (): VariantGroupFormValue => ({
  colorName: "",
  colorHex: "",
  imageItems: [],
  sizes: [defaultVariantSize("M")],
  bulkSizesText: "",
});

const buildVariantGroupKey = (colorName?: string, colorHex?: string) =>
  `${(colorName ?? "").trim().toLowerCase()}|${(colorHex ?? "").trim().toLowerCase()}`;

const getUniqueVariantId = (baseVariantId: string, reservedVariantIds: Set<string>) => {
  let candidate = baseVariantId;
  let counter = 2;

  while (reservedVariantIds.has(candidate)) {
    candidate = `${baseVariantId}-${counter}`;
    counter += 1;
  }

  reservedVariantIds.add(candidate);
  return candidate;
};

const normalizeVariants = (variantValues: VariantFormValue[]): ProductVariant[] => {
  const reservedVariantIds = new Set<string>();

  return variantValues.reduce<ProductVariant[]>((acc, item, index) => {
    const size = item.size?.trim();
    if (!size) {
      return acc;
    }

    const rawVariantId = item.variantId?.trim();
    const variantId = rawVariantId
      ? getUniqueVariantId(rawVariantId, reservedVariantIds)
      : getUniqueVariantId(`variant-${index + 1}`, reservedVariantIds);

    acc.push({
      variantId,
      sku: item.sku?.trim() || "",
      size,
      sizeLabel: item.sizeLabel?.trim() || size,
      stock: Math.max(0, Number(item.stock ?? 0)),
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

type ParsedSizeEntry = {
  size: string;
  stock?: number;
};

const normalizeVariantComboKey = (colorName?: string, colorHex?: string, size?: string) =>
  `${(colorName ?? "").trim().toLowerCase()}|${(colorHex ?? "").trim().toLowerCase()}|${(size ?? "")
    .trim()
    .toLowerCase()}`;

const parseBulkSizeEntries = (raw: string): ParsedSizeEntry[] => {
  const seen = new Set<string>();

  return raw
    .split(/[\n,;]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .reduce<ParsedSizeEntry[]>((acc, token) => {
      const match = token.match(/^(.+?)(?:\s*[:=]\s*(\d+))?$/);
      if (!match) {
        return acc;
      }

      const nextSize = (match[1] ?? "").trim();
      if (!nextSize) {
        return acc;
      }

      const dedupeKey = nextSize.toLowerCase();
      if (seen.has(dedupeKey)) {
        return acc;
      }
      seen.add(dedupeKey);

      const nextStock = match[2] === undefined ? undefined : Number(match[2]);
      acc.push({
        size: nextSize,
        stock: Number.isFinite(nextStock) ? nextStock : undefined,
      });
      return acc;
    }, []);
};

const mapVariantsToGroups = (variants: ProductVariant[] = []): VariantGroupFormValue[] => {
  const groupMap = new Map<string, VariantGroupFormValue>();

  variants.forEach((variant) => {
    const colorName = variant.color?.name?.trim() || "";
    const colorHex = variant.color?.hex?.trim() || "";
    const key = buildVariantGroupKey(colorName, colorHex);

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        colorName,
        colorHex,
        imageItems: (variant.images ?? []).map((url) => ({ url })),
        sizes: [],
        bulkSizesText: "",
      });
    }

    const group = groupMap.get(key);
    if (!group) {
      return;
    }

    if ((group.imageItems?.length ?? 0) === 0 && (variant.images?.length ?? 0) > 0) {
      group.imageItems = (variant.images ?? []).map((url) => ({ url }));
    }

    group.sizes.push({
      variantId: variant.variantId,
      sku: variant.sku,
      size: variant.size,
      sizeLabel: variant.sizeLabel || variant.size,
      stock: variant.stock ?? 0,
      additionalPrice: variant.additionalPrice ?? 0,
      isActive: variant.isActive ?? true,
    });
  });

  const groups = Array.from(groupMap.values()).map((group) => ({
    ...group,
    sizes: group.sizes.length > 0 ? group.sizes : [defaultVariantSize("M")],
  }));

  return groups.length > 0 ? groups : [defaultVariantGroup()];
};

const flattenVariantGroups = (variantGroups: VariantGroupFormValue[]): VariantFormValue[] =>
  variantGroups.flatMap((group, groupIndex) => {
    const imageItems = (group.imageItems ?? []).map((item) => ({ ...item }));

    return (group.sizes ?? []).map((sizeItem, sizeIndex) => ({
      variantId: sizeItem.variantId?.trim() || `variant-${groupIndex + 1}-${sizeIndex + 1}`,
      sku: sizeItem.sku?.trim() || "",
      size: sizeItem.size,
      sizeLabel: sizeItem.sizeLabel?.trim() || sizeItem.size,
      stock: sizeItem.stock ?? 0,
      additionalPrice: sizeItem.additionalPrice ?? 0,
      isActive: sizeItem.isActive ?? true,
      colorName: group.colorName?.trim() || "",
      colorHex: group.colorHex?.trim() || "",
      imageItems,
    }));
  });

const buildVariantSkuPreviewMatrix = (
  variantGroups: VariantGroupFormValue[] = [],
  productSku = "",
) => {
  const matrix: string[][] = [];
  const reservedSkus = new Set<string>();
  const normalizedProductSku = normalizeSkuInput(productSku);

  if (normalizedProductSku) {
    reservedSkus.add(normalizedProductSku);
  }

  let globalIndex = 0;
  variantGroups.forEach((group, groupIndex) => {
    matrix[groupIndex] = [];
    (group.sizes ?? []).forEach((sizeItem, sizeIndex) => {
      const explicitSku = normalizeSkuInput(sizeItem.sku ?? "");
      const requestedSku =
        explicitSku ||
        buildVariantSku({
          productSku,
          colorName: group.colorName ?? "",
          size: sizeItem.size ?? "",
          index: globalIndex,
        });

      matrix[groupIndex][sizeIndex] = makeUniqueSku(requestedSku, reservedSkus);
      globalIndex += 1;
    });
  });

  return matrix;
};

const getPrimaryImage = (product: Product) =>
  product.media?.find((item) => item.isPrimary)?.url ??
  product.media?.[0]?.url ??
  product.variants?.find((variant) => (variant.images?.length ?? 0) > 0)?.images?.[0];

const getStock = (product: Product) =>
  product.inventorySummary?.available ?? product.inventorySummary?.total ?? 0;

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

  const getSuggestedProductSku = (name = watchedName, currentCategoryId = watchedCategoryId) =>
    buildProductSku({
      name,
      categoryName: currentCategoryId ? categoryLookup[currentCategoryId]?.name : "",
    });

  const variantSkuPreviewMatrix = useMemo(() => {
    const productSkuForPreview = normalizeSkuInput(watchedSku || "") || getSuggestedProductSku();
    return buildVariantSkuPreviewMatrix(watchedVariantGroups ?? [], productSkuForPreview);
  }, [categoryLookup, watchedCategoryId, watchedName, watchedSku, watchedVariantGroups]);

  const syncProductSku = () => {
    const nextSku = getSuggestedProductSku();
    if (nextSku !== (form.getFieldValue("sku") as string | undefined)) {
      form.setFieldValue("sku", nextSku);
    }
    return nextSku;
  };

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
  }, [categoryLookup, form, isModalOpen, watchedCategoryId, watchedName]);

  const registerPendingFile = (file: File) => {
    // eslint-disable-next-line react-hooks/purity
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

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Title level={5} className="mb-0! mt-0!">Màu sắc & size</Title>
                  <Button
                    type="dashed"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      const currentGroups = ((form.getFieldValue("variantGroups") ?? []) as VariantGroupFormValue[]);
                      form.setFieldValue("variantGroups", [...currentGroups, defaultVariantGroup()]);
                    }}
                  >
                    Thêm màu
                  </Button>
                </div>

                <Form.List name="variantGroups">
                  {(groupFields, { remove: removeGroup }) => (
                    <div className="space-y-3">
                      {groupFields.map((groupField, groupIndex) => (
                        <Card
                          key={groupField.key}
                          size="small"
                          title={`Màu #${groupIndex + 1}`}
                          extra={
                            <Button
                              size="small"
                              danger
                              onClick={() => {
                                const groupImages = (form.getFieldValue(["variantGroups", groupField.name, "imageItems"]) ?? []) as VariantImageFormValue[];
                                groupImages.forEach((imageItem) => unregisterPendingFile(imageItem.pendingFileId));
                                removeGroup(groupField.name);
                              }}
                            >
                              Xóa
                            </Button>
                          }
                        >
                          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-start">
                            <div className="space-y-3">
                              <div className="grid gap-3 md:grid-cols-2">
                                <Form.Item label="Tên màu" name={[groupField.name, "colorName"]} rules={REQUIRED_RULE}>
                                  <Input placeholder="VD: Đen" />
                                </Form.Item>
                                <Form.Item label="Mã màu HEX" name={[groupField.name, "colorHex"]}>
                                  <Input placeholder="#000000" />
                                </Form.Item>
                              </div>

                              <div className="rounded-lg border border-slate-200 p-3">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <Text strong>Danh sách size</Text>
                                  <Button
                                    size="small"
                                    type="dashed"
                                    icon={<PlusOutlined />}
                                    onClick={() => {
                                      const currentSizes = ((form.getFieldValue(["variantGroups", groupField.name, "sizes"]) ?? []) as VariantSizeFormValue[]);
                                      form.setFieldValue(["variantGroups", groupField.name, "sizes"], [...currentSizes, defaultVariantSize("M")]);
                                    }}
                                  >
                                    Thêm size
                                  </Button>
                                </div>

                                <Form.List name={[groupField.name, "sizes"]}>
                                  {(sizeFields, { remove: removeSize }) => (
                                    <div className="space-y-2">
                                      <div className="hidden gap-2 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_72px_40px]">
                                        <span>Kích thước</span>
                                        <span>Nhãn size</span>
                                        <span>Tồn kho</span>
                                        <span>Giá cộng</span>
                                        <span>Hoạt động</span>
                                        <span>Xóa</span>
                                      </div>
                                      {sizeFields.map((sizeField) => (
                                        <div key={sizeField.key} className="grid gap-2 rounded-md border border-slate-200 p-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_72px_40px]">
                                          <Form.Item name={[sizeField.name, "size"]} rules={REQUIRED_RULE} className="mb-0!">
                                            <AutoComplete
                                              options={VARIANT_SIZE_OPTIONS}
                                              placeholder="Ví dụ: M"
                                              filterOption={(inputValue, option) =>
                                                String(option?.value ?? "")
                                                  .toLowerCase()
                                                  .includes(inputValue.toLowerCase())
                                              }
                                            />
                                          </Form.Item>
                                          <Form.Item name={[sizeField.name, "sizeLabel"]} className="mb-0!">
                                            <Input placeholder="Ví dụ: M" />
                                          </Form.Item>
                                          <Form.Item name={[sizeField.name, "stock"]} rules={REQUIRED_RULE} className="mb-0!">
                                            <InputNumber min={0} className="w-full!" placeholder="0" />
                                          </Form.Item>
                                          <Form.Item name={[sizeField.name, "additionalPrice"]} className="mb-0!">
                                            <InputNumber min={0} className="w-full!" placeholder="0" />
                                          </Form.Item>
                                          <Form.Item name={[sizeField.name, "isActive"]} valuePropName="checked" className="mb-0!">
                                            <Switch />
                                          </Form.Item>
                                          <Button
                                            danger
                                            icon={<DeleteOutlined />}
                                            className="h-8 w-10 min-w-0 sm:justify-self-start lg:justify-self-end"
                                            onClick={() => removeSize(sizeField.name)}
                                          />
                                          <div className="sm:col-span-2 lg:col-span-6">
                                            <Text className="text-xs text-slate-500">SKU biến thể</Text>
                                            <Space.Compact className="mt-1 w-full">
                                              <Input
                                                readOnly
                                                value={variantSkuPreviewMatrix[groupField.name]?.[sizeField.name] ?? ""}
                                                placeholder="SKU sẽ tự sinh"
                                              />
                                              <Button
                                                icon={<CopyOutlined />}
                                                onClick={() =>
                                                  void handleCopy(
                                                    variantSkuPreviewMatrix[groupField.name]?.[sizeField.name] ?? "",
                                                    "SKU biến thể",
                                                  )
                                                }
                                              >
                                                Copy
                                              </Button>
                                            </Space.Compact>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </Form.List>

                                <div className="mt-2">
                                  <Text className="mb-1 block">Tạo nhanh size</Text>
                                  <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-start">
                                    <Form.Item
                                      name={[groupField.name, "bulkSizesText"]}
                                      extra="VD: S:5, M:8, L:3"
                                      className="mb-0!"
                                    >
                                      <Input placeholder="Nhập size nhanh" />
                                    </Form.Item>
                                    <Button className="self-start" onClick={() => appendSizesForGroup(groupField.name)}>
                                      Áp dụng
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                              <Text className="text-sm" strong>Ảnh theo màu</Text>
                              <div className="mt-2">
                                <Upload
                                  accept="image/*"
                                  multiple
                                  showUploadList={false}
                                  customRequest={handleVariantGroupUpload(groupField.name)}
                                  beforeUpload={beforeUpload}
                                >
                                  <Button size="small" icon={<PlusOutlined />} block>Thêm ảnh </Button>
                                </Upload>
                              </div>
                              <Form.List name={[groupField.name, "imageItems"]}>
                                {(imageFields, { remove: removeImage }) => (
                                  <div className="mt-2 space-y-2">
                                    {imageFields.map((imageField) => (
                                      <div key={imageField.key} className="grid gap-2 grid-cols-[1fr_32px]">
                                        <Form.Item name={[imageField.name, "url"]} rules={REQUIRED_RULE} className="mb-0!">
                                          <Input size="small" placeholder="URL ảnh màu" />
                                        </Form.Item>
                                        <Button
                                          size="small"
                                          danger
                                          className="w-8"
                                          icon={<DeleteOutlined />}
                                          onClick={() => {
                                            const imageItem = form.getFieldValue([
                                              "variantGroups",
                                              groupField.name,
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




