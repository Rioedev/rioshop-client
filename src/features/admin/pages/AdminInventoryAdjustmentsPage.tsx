import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import {
  ADJUST_REASON_COLOR,
  ADJUST_REASON_LABEL,
  type AdjustReason,
  type AdjustmentRow,
  inventoryAdjustmentService,
} from "../../../services/inventoryAdjustmentService";
import {
  type Product,
  productService,
} from "../../../services/productService";
import { getPrimaryImage, getStock } from "../shared/products";
import { getErrorMessage } from "../../../utils/errorMessage";

const { Text } = Typography;
const { RangePicker } = DatePicker;

const formatNumber = new Intl.NumberFormat("vi-VN");

const ADJUSTABLE_REASONS: Array<Exclude<AdjustReason, "purchase_receipt">> = [
  "stocktake_diff",
  "damaged",
  "lost",
  "other",
];

type LineDraft = {
  variantSku: string;
  variantLabel: string;
  currentStock: number;
  qtyDelta: number;
};

/**
 * Panel điều chỉnh kho — dùng làm tab trong AdminInventoriesPage.
 * Không có title vì page cha quản lý tiêu đề tổng.
 */
export function InventoryAdjustmentsPanel() {
  const [messageApi, contextHolder] = message.useMessage();

  // List
  const [items, setItems] = useState<AdjustmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [reasonFilter, setReasonFilter] = useState<AdjustReason | undefined>(undefined);
  const [rangeFilter, setRangeFilter] = useState<[Dayjs, Dayjs] | null>(null);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [reason, setReason] = useState<Exclude<AdjustReason, "purchase_receipt">>("stocktake_diff");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await inventoryAdjustmentService.list({
        page,
        limit: 20,
        reason: reasonFilter,
        from: rangeFilter?.[0]?.toISOString(),
        to: rangeFilter?.[1]?.toISOString(),
      });
      setItems(result.docs);
      setTotal(result.totalDocs);
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không tải được lịch sử"));
    } finally {
      setLoading(false);
    }
  }, [page, reasonFilter, rangeFilter, messageApi]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const loadDefaultProducts = async () => {
    setProductSearchLoading(true);
    try {
      const result = await productService.getProducts({ page: 1, limit: 20 });
      setProductOptions(result.docs);
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không tải được sản phẩm"));
    } finally {
      setProductSearchLoading(false);
    }
  };

  const openModal = () => {
    setSelectedProduct(null);
    setReason("stocktake_diff");
    setNote("");
    setLines([]);
    setModalOpen(true);
    void loadDefaultProducts();
  };

  const onProductSearch = async (q: string) => {
    if (!q.trim()) {
      void loadDefaultProducts();
      return;
    }
    setProductSearchLoading(true);
    try {
      const result = await productService.searchProducts(q, 1, 15);
      setProductOptions(result.docs);
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không tìm được sản phẩm"));
    } finally {
      setProductSearchLoading(false);
    }
  };

  const onSelectProduct = (productId: string) => {
    const product = productOptions.find((p) => p._id === productId) || null;
    setSelectedProduct(product);
    if (product) {
      const activeVariants = (product.variants || []).filter((variant) => variant.isActive !== false);
      setLines(
        activeVariants.map((variant) => ({
          variantSku: variant.sku,
          variantLabel: [variant.color?.name, variant.sizeLabel || variant.size].filter(Boolean).join(" / ") || variant.sku,
          currentStock: Math.max(0, Number(variant.stock || 0)),
          qtyDelta: 0,
        })),
      );
    } else {
      setLines([]);
    }
  };

  const onSubmit = async () => {
    if (!selectedProduct) {
      messageApi.warning("Chọn sản phẩm");
      return;
    }
    const validLines = lines.filter((line) => line.qtyDelta !== 0);
    if (validLines.length === 0) {
      messageApi.warning("Cần ít nhất 1 dòng có số lượng ≠ 0");
      return;
    }
    setSubmitting(true);
    try {
      await inventoryAdjustmentService.adjust({
        productId: selectedProduct._id,
        reason,
        note,
        lines: validLines.map((line) => ({ variantSku: line.variantSku, qtyDelta: line.qtyDelta })),
      });
      messageApi.success("Đã điều chỉnh tồn kho");
      setModalOpen(false);
      void loadList();
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không điều chỉnh được"));
    } finally {
      setSubmitting(false);
    }
  };

  const reasonHelpText = useMemo(() => {
    switch (reason) {
      case "damaged":
        return "Hư hỏng → chỉ nhập số ÂM (vd −5)";
      case "lost":
        return "Mất hàng → chỉ nhập số ÂM (vd −2)";
      case "stocktake_diff":
        return "Kiểm kê lệch → nhập + (thừa) hoặc − (thiếu)";
      default:
        return "Khác → ghi chú rõ lý do bên dưới";
    }
  }, [reason]);

  const lineColumns: ColumnsType<LineDraft> = useMemo(
    () => [
      {
        title: "Variant",
        dataIndex: "variantLabel",
        render: (label: string, row) => (
          <div>
            <Text strong>{label}</Text>
            <div className="text-xs text-slate-500">SKU: {row.variantSku}</div>
          </div>
        ),
      },
      {
        title: "Tồn hiện tại",
        dataIndex: "currentStock",
        width: 140,
        render: (value: number) => formatNumber.format(value),
      },
      {
        title: "Δ (+/−)",
        width: 140,
        render: (_, _row, index) => (
          <InputNumber
            value={lines[index].qtyDelta}
            onChange={(value) => {
              const next = [...lines];
              next[index] = { ...next[index], qtyDelta: Number(value || 0) };
              setLines(next);
            }}
            className="w-full!"
            placeholder="0"
          />
        ),
      },
      {
        title: "Tồn sau",
        width: 120,
        render: (_, _row, index) => {
          const after = lines[index].currentStock + lines[index].qtyDelta;
          return (
            <Text className={after < 0 ? "text-red-500!" : undefined}>
              {formatNumber.format(after)}
            </Text>
          );
        },
      },
    ],
    [lines],
  );

  const historyColumns: ColumnsType<AdjustmentRow> = useMemo(
    () => [
      {
        title: "Thời gian",
        dataIndex: "createdAt",
        width: 150,
        render: (value: string) => dayjs(value).format("DD/MM/YYYY HH:mm"),
      },
      {
        title: "Lý do",
        dataIndex: "reason",
        width: 160,
        render: (value: AdjustReason) => (
          <Tag color={ADJUST_REASON_COLOR[value]}>{ADJUST_REASON_LABEL[value]}</Tag>
        ),
      },
      {
        title: "Sản phẩm",
        dataIndex: "productNameSnapshot",
        render: (value: string, row) => (
          <div>
            <Text strong>{value}</Text>
            <div className="text-xs text-slate-500">{row.variantLabelSnapshot} · {row.variantSku}</div>
          </div>
        ),
      },
      {
        title: "Δ",
        dataIndex: "qtyDelta",
        width: 100,
        align: "right",
        render: (value: number) =>
          value > 0 ? (
            <Tag color="green">+{formatNumber.format(value)}</Tag>
          ) : (
            <Tag color="red">{formatNumber.format(value)}</Tag>
          ),
      },
      {
        title: "Tồn (trước → sau)",
        width: 160,
        render: (_, row) => `${formatNumber.format(row.stockBefore)} → ${formatNumber.format(row.stockAfter)}`,
      },
      {
        title: "PO liên quan",
        width: 140,
        render: (_, row) => {
          if (!row.purchaseOrderId) return <Text type="secondary">—</Text>;
          if (typeof row.purchaseOrderId === "string") return row.purchaseOrderId;
          return <Text>{row.purchaseOrderId.poNumber}</Text>;
        },
      },
      {
        title: "Người thực hiện",
        dataIndex: "createdByName",
        width: 160,
        render: (value: string, row) => {
          const createdByName =
            value ||
            (typeof row.createdBy === "object"
              ? row.createdBy?.fullName || row.createdBy?.email || ""
              : "");
          return createdByName || <Text type="secondary">—</Text>;
        },
      },
      {
        title: "Ghi chú",
        dataIndex: "note",
        ellipsis: true,
        render: (value: string) => value || <Text type="secondary">—</Text>,
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      {contextHolder}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text type="secondary">
          Ghi nhận lệch kho ngoài luồng nhập hàng từ PO: kiểm kê, hư hỏng, mất hàng.
        </Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={openModal}>
          Tạo điều chỉnh
        </Button>
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Select
            allowClear
            placeholder="Lọc theo lý do"
            options={[
              { value: "purchase_receipt", label: ADJUST_REASON_LABEL.purchase_receipt },
              ...ADJUSTABLE_REASONS.map((r) => ({ value: r, label: ADJUST_REASON_LABEL[r] })),
            ]}
            value={reasonFilter}
            onChange={(value) => {
              setReasonFilter(value || undefined);
              setPage(1);
            }}
            style={{ minWidth: 200 }}
          />
          <RangePicker
            value={rangeFilter ?? undefined}
            onChange={(value) => {
              if (value?.[0] && value?.[1]) {
                setRangeFilter([value[0].startOf("day"), value[1].endOf("day")]);
              } else {
                setRangeFilter(null);
              }
              setPage(1);
            }}
            format="DD/MM/YYYY"
          />
        </div>

        <Table<AdjustmentRow>
          rowKey="_id"
          columns={historyColumns}
          dataSource={items}
          loading={loading}
          size="middle"
          pagination={{
            current: page,
            total,
            pageSize: 20,
            showSizeChanger: false,
            onChange: (next) => setPage(next),
          }}
          locale={{ emptyText: "Chưa có điều chỉnh nào" }}
        />
      </Card>

      <Modal
        open={modalOpen}
        title="Tạo điều chỉnh kho"
        onCancel={() => setModalOpen(false)}
        onOk={() => void onSubmit()}
        confirmLoading={submitting}
        okText="Lưu"
        cancelText="Hủy"
        width={800}
      >
        <Form layout="vertical">
          <Form.Item label="Lý do" required>
            <Select
              value={reason}
              onChange={(value) => setReason(value)}
              options={ADJUSTABLE_REASONS.map((r) => ({ value: r, label: ADJUST_REASON_LABEL[r] }))}
            />
            <Text type="secondary" className="text-xs! mt-1 block">{reasonHelpText}</Text>
          </Form.Item>

          <Form.Item label="Sản phẩm" required>
            <Select
              showSearch
              placeholder="Tìm sản phẩm theo tên / SKU..."
              filterOption={false}
              onSearch={onProductSearch}
              onChange={onSelectProduct}
              loading={productSearchLoading}
              optionLabelProp="label"
              listHeight={420}
              options={productOptions.map((p) => ({
                value: p._id,
                label: `${p.name} (${p.sku})`,
                product: p,
              }))}
              optionRender={(option) => {
                const product = (option.data as { product?: Product }).product;
                if (!product) return option.label as ReactNode;
                const img = getPrimaryImage(product);
                const stock = getStock(product);
                return (
                  <div className="flex items-center gap-3 py-1">
                    {img ? (
                      <img
                        src={img}
                        alt=""
                        className="h-10 w-10 rounded-md object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-slate-100 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="truncate">
                        <Text strong>{product.name}</Text>
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        SKU: {product.sku} · Tồn: {stock}
                      </div>
                    </div>
                  </div>
                );
              }}
              value={selectedProduct?._id}
            />
          </Form.Item>

          <Form.Item label="Ghi chú">
            <Input.TextArea
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={240}
              placeholder="VD: Kiểm kê kho cuối tháng, lệch 3 áo size M"
            />
          </Form.Item>

          {selectedProduct ? (
            <Card size="small" className="bg-slate-50!">
              <Text strong>Variants của: {selectedProduct.name}</Text>
              <Table<LineDraft>
                rowKey="variantSku"
                columns={lineColumns}
                dataSource={lines}
                pagination={false}
                size="small"
                className="mt-2"
              />
            </Card>
          ) : null}
        </Form>
      </Modal>
    </div>
  );
}
