import {
  Button,
  Card,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
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
  PO_STATUS_COLOR,
  PO_STATUS_LABEL,
  type POCreatePayload,
  type POStatus,
  type PurchaseOrder,
  purchaseOrderService,
} from "../../../services/purchaseOrderService";
import {
  type Supplier,
  supplierService,
} from "../../../services/supplierService";
import {
  type Product,
  productService,
} from "../../../services/productService";
import { getPrimaryImage, getStock } from "../shared/products";
import { getErrorMessage } from "../../../utils/errorMessage";

const { Title, Text } = Typography;

const formatNumber = new Intl.NumberFormat("vi-VN");
const formatCurrency = (value: number) =>
  `${formatNumber.format(Math.max(0, Math.round(Number(value || 0))))} đ`;

const currencyFormatter = (value: number | string | undefined) =>
  value === undefined || value === null || value === ""
    ? ""
    : `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const currencyParser = (value: string | undefined) => {
  const digits = (value || "").toString().replace(/\D/g, "");
  return digits ? Number(digits) : 0;
};

type StatusFilter = "all" | POStatus;

type CreateLineDraft = {
  productId: string;
  productName: string;
  variantSku: string;
  variantLabel: string;
  orderedQty: number;
  unitCost: number;
};

export function AdminPurchaseOrdersPage() {
  const [messageApi, contextHolder] = message.useMessage();

  // List state
  const [items, setItems] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [supplierFilter, setSupplierFilter] = useState<string | undefined>(undefined);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Create / edit drawer state — dùng chung cho cả tạo nháp và sửa nháp
  // editingPoId = null → tạo mới; có id → đang sửa PO draft
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPoId, setEditingPoId] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createSupplierId, setCreateSupplierId] = useState<string | null>(null);
  const [createExpectedDate, setCreateExpectedDate] = useState<Dayjs | null>(null);
  const [createNote, setCreateNote] = useState("");
  const [createLines, setCreateLines] = useState<CreateLineDraft[]>([]);
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);

  // Detail drawer state
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);

  // Receive modal state
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveLines, setReceiveLines] = useState<Array<{ variantSku: string; label: string; qty: number; max: number; unitCost: number }>>([]);
  const [receiveNote, setReceiveNote] = useState("");
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await purchaseOrderService.list({
        page,
        limit: 20,
        status: statusFilter === "all" ? undefined : statusFilter,
        supplierId: supplierFilter,
      });
      setItems(result.docs);
      setTotal(result.totalDocs);
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không tải được danh sách"));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, supplierFilter, messageApi]);

  const loadSuppliers = useCallback(async () => {
    try {
      const result = await supplierService.list({ limit: 200, isActive: true });
      setSuppliers(result.docs);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  // Create flow
  const loadDefaultProducts = async () => {
    setProductSearchLoading(true);
    try {
      const result = await productService.getProducts({ page: 1, limit: 20, status: "all" });
      setProductOptions(result.docs);
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không tải được sản phẩm"));
    } finally {
      setProductSearchLoading(false);
    }
  };

  const openCreate = () => {
    setEditingPoId(null);
    setCreateSupplierId(null);
    setCreateExpectedDate(null);
    setCreateNote("");
    setCreateLines([]);
    setCreateOpen(true);
    void loadDefaultProducts();
  };

  // Mở drawer ở chế độ sửa — prefill từ PO draft đang xem
  const openEditDraft = (po: PurchaseOrder) => {
    if (po.status !== "draft") {
      messageApi.warning("Chỉ sửa được khi PO đang ở trạng thái Nháp");
      return;
    }
    setEditingPoId(po._id);
    setCreateSupplierId(
      typeof po.supplierId === "string" ? po.supplierId : po.supplierId._id,
    );
    setCreateExpectedDate(po.expectedDeliveryDate ? dayjs(po.expectedDeliveryDate) : null);
    setCreateNote(po.note || "");
    setCreateLines(
      po.lines.map((line) => ({
        productId: line.productId,
        productName: line.productNameSnapshot,
        variantSku: line.variantSku,
        variantLabel: line.variantLabelSnapshot || line.variantSku,
        orderedQty: line.orderedQty,
        unitCost: line.unitCost,
      })),
    );
    setDetailOpen(false);
    setCreateOpen(true);
    void loadDefaultProducts();
  };

  const onProductSearch = async (q: string) => {
    if (!q.trim()) {
      void loadDefaultProducts();
      return;
    }
    setProductSearchLoading(true);
    try {
      const result = await productService.searchProducts(q, 1, 15, "all");
      setProductOptions(result.docs);
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không tìm được sản phẩm"));
    } finally {
      setProductSearchLoading(false);
    }
  };

  const onAddVariantsForProduct = (productId: string) => {
    const product = productOptions.find((p) => p._id === productId);
    if (!product) return;
    const newLines = (product.variants || [])
      .filter((variant) => variant.isActive !== false)
      .filter((variant) => !createLines.some(
        (line) => line.productId === product._id && line.variantSku === variant.sku,
      ))
      .map((variant) => ({
        productId: product._id,
        productName: product.name,
        variantSku: variant.sku,
        variantLabel: [variant.color?.name, variant.sizeLabel || variant.size].filter(Boolean).join(" / ") || variant.sku,
        orderedQty: 0,
        // Gợi ý giá vốn theo product (mọi variant cùng giá vốn)
        unitCost: Math.max(0, Number(product.pricing?.costPrice || 0)),
      }));
    if (newLines.length === 0) {
      messageApi.info("Tất cả variants của sp này đã có trong PO");
      return;
    }
    setCreateLines((prev) => [...prev, ...newLines]);
  };

  const onSubmitCreate = async () => {
    if (!createSupplierId) {
      messageApi.warning("Chọn nhà cung cấp");
      return;
    }
    const validLines = createLines.filter((line) => line.orderedQty > 0);
    if (validLines.length === 0) {
      messageApi.warning("Cần ít nhất 1 dòng có SL > 0");
      return;
    }

    setCreateSubmitting(true);
    try {
      const payload: POCreatePayload = {
        supplierId: createSupplierId,
        expectedDeliveryDate: createExpectedDate?.toISOString() || null,
        note: createNote,
        lines: validLines.map((line) => ({
          productId: line.productId,
          variantSku: line.variantSku,
          orderedQty: line.orderedQty,
          unitCost: line.unitCost,
        })),
      };
      if (editingPoId) {
        await purchaseOrderService.update(editingPoId, payload);
        messageApi.success("Đã cập nhật đơn nhập");
      } else {
        await purchaseOrderService.create(payload);
        messageApi.success("Đã tạo đơn nhập nháp");
      }
      setCreateOpen(false);
      setEditingPoId(null);
      void loadList();
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không lưu được PO"));
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Detail flow
  const openDetail = async (poId: string) => {
    try {
      const po = await purchaseOrderService.getById(poId);
      setSelectedPo(po);
      setDetailOpen(true);
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không tải được PO"));
    }
  };

  const reloadDetail = async () => {
    if (!selectedPo) return;
    try {
      const po = await purchaseOrderService.getById(selectedPo._id);
      setSelectedPo(po);
    } catch {
      // silent
    }
  };

  const onConfirm = async () => {
    if (!selectedPo) return;
    try {
      await purchaseOrderService.confirm(selectedPo._id);
      messageApi.success("Đã chuyển sang Đã đặt");
      await reloadDetail();
      void loadList();
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không chuyển trạng thái được"));
    }
  };

  const onCancel = async () => {
    if (!selectedPo) return;
    try {
      await purchaseOrderService.cancel(selectedPo._id, "Hủy bởi admin");
      messageApi.success("Đã hủy");
      await reloadDetail();
      void loadList();
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không hủy được"));
    }
  };

  const openReceiveModal = () => {
    if (!selectedPo) return;
    const lines = selectedPo.lines
      .filter((line) => Number(line.receivedQty) < Number(line.orderedQty))
      .map((line) => ({
        variantSku: line.variantSku,
        label: `${line.productNameSnapshot} · ${line.variantLabelSnapshot} (${line.variantSku})`,
        qty: Number(line.orderedQty) - Number(line.receivedQty),
        max: Number(line.orderedQty) - Number(line.receivedQty),
        unitCost: Number(line.unitCost),
      }));
    setReceiveLines(lines);
    setReceiveNote("");
    setReceiveOpen(true);
  };

  const onSubmitReceive = async () => {
    if (!selectedPo) return;
    const validLines = receiveLines.filter((line) => line.qty > 0);
    if (validLines.length === 0) {
      messageApi.warning("Cần ít nhất 1 dòng có SL > 0");
      return;
    }
    setReceiveSubmitting(true);
    try {
      await purchaseOrderService.receive(selectedPo._id, {
        note: receiveNote,
        lines: validLines.map((line) => ({
          variantSku: line.variantSku,
          qty: line.qty,
          unitCost: line.unitCost,
        })),
      });
      messageApi.success("Đã ghi nhận nhập hàng");
      setReceiveOpen(false);
      await reloadDetail();
      void loadList();
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không ghi nhận được"));
    } finally {
      setReceiveSubmitting(false);
    }
  };

  // Columns
  const columns: ColumnsType<PurchaseOrder> = useMemo(
    () => [
      {
        title: "Mã PO",
        dataIndex: "poNumber",
        width: 160,
        render: (value: string, row) => (
          <Button type="link" onClick={() => void openDetail(row._id)} className="p-0!">
            {value}
          </Button>
        ),
      },
      {
        title: "Nhà cung cấp",
        dataIndex: "supplierNameSnapshot",
        render: (value: string, row) => (
          <div className="flex items-center gap-2">
            <Text>{value}</Text>
            {row.supplierType === "internal" ? (
              <Tag color="purple">Nội bộ</Tag>
            ) : (
              <Tag color="blue">Mua ngoài</Tag>
            )}
          </div>
        ),
      },
      {
        title: "Trạng thái",
        dataIndex: "status",
        width: 160,
        render: (status: POStatus) => (
          <Tag color={PO_STATUS_COLOR[status]}>{PO_STATUS_LABEL[status]}</Tag>
        ),
      },
      {
        title: "Tổng tiền",
        dataIndex: "total",
        width: 160,
        align: "right",
        render: (value: number) => <Text strong>{formatCurrency(value)}</Text>,
      },
      {
        title: "Tiến độ nhận",
        key: "progress",
        width: 140,
        render: (_, row) => {
          const ordered = row.lines.reduce((sum, line) => sum + line.orderedQty, 0);
          const received = row.lines.reduce((sum, line) => sum + line.receivedQty, 0);
          return (
            <Text className="text-xs!">
              {formatNumber.format(received)} / {formatNumber.format(ordered)}
            </Text>
          );
        },
      },
      {
        title: "Tạo lúc",
        dataIndex: "createdAt",
        width: 140,
        render: (value: string) => dayjs(value).format("DD/MM/YYYY HH:mm"),
      },
    ],
    [],
  );

  const createTotal = useMemo(
    () => createLines.reduce((sum, line) => sum + line.orderedQty * line.unitCost, 0),
    [createLines],
  );

  const lineColumns: ColumnsType<CreateLineDraft> = useMemo(
    () => [
      {
        title: "Sản phẩm / variant",
        key: "label",
        render: (_, row) => (
          <div className="flex flex-col">
            <Text strong>{row.productName}</Text>
            <Text type="secondary" className="text-xs!">{row.variantLabel} · {row.variantSku}</Text>
          </div>
        ),
      },
      {
        title: "SL đặt",
        width: 120,
        render: (_: unknown, _row: CreateLineDraft, index: number) => (
          <InputNumber
            min={0}
            value={createLines[index].orderedQty}
            onChange={(value) => {
              const next = [...createLines];
              next[index] = { ...next[index], orderedQty: Number(value || 0) };
              setCreateLines(next);
            }}
            className="w-full!"
          />
        ),
      },
      {
        title: "Giá vốn / cái",
        width: 180,
        render: (_: unknown, _row: CreateLineDraft, index: number) => (
          <InputNumber
            min={0}
            precision={0}
            value={createLines[index].unitCost}
            onChange={(value) => {
              const next = [...createLines];
              next[index] = { ...next[index], unitCost: Number(value || 0) };
              setCreateLines(next);
            }}
            formatter={currencyFormatter}
            parser={currencyParser}
            addonAfter="VND"
            className="w-full!"
          />
        ),
      },
      {
        title: "Thành tiền",
        width: 160,
        align: "right",
        render: (_: unknown, _row: CreateLineDraft, index: number) => (
          <Text strong>{formatCurrency(createLines[index].orderedQty * createLines[index].unitCost)}</Text>
        ),
      },
      {
        title: "",
        width: 60,
        render: (_: unknown, _row: CreateLineDraft, index: number) => (
          <Button
            size="small"
            danger
            onClick={() => setCreateLines((prev) => prev.filter((_, idx) => idx !== index))}
          >
            Xóa
          </Button>
        ),
      },
    ],
    [createLines],
  );

  const isDraftPo = selectedPo?.status === "draft";
  const canReceive =
    selectedPo?.status === "ordered" || selectedPo?.status === "partially_received";
  // canCancel: được dừng đơn ở mọi state trừ kết quả cuối cùng (received/cancelled/closed)
  const canCancel = selectedPo &&
    selectedPo.status !== "received" &&
    selectedPo.status !== "cancelled" &&
    selectedPo.status !== "closed";
  // Đã nhận một phần → đóng đơn (closed) thay vì hủy hoàn toàn
  const isPartialClose = selectedPo?.status === "partially_received";

  return (
    <div className="flex flex-col gap-4">
      {contextHolder}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Title level={3} className="m-0!">Đơn nhập hàng (PO)</Title>
          <Text type="secondary">
            Tạo phiếu đặt hàng với nhà cung cấp / xưởng, theo dõi tiến độ và ghi nhận nhập kho.
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Tạo đơn nhập
        </Button>
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Segmented
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value as StatusFilter);
              setPage(1);
            }}
            options={[
              { label: "Tất cả", value: "all" },
              { label: "Nháp", value: "draft" },
              { label: "Đã đặt", value: "ordered" },
              { label: "Nhận một phần", value: "partially_received" },
              { label: "Đã nhận đủ", value: "received" },
              { label: "Đã hủy", value: "cancelled" },
              { label: "Đã đóng", value: "closed" },
            ]}
          />
          <Select
            allowClear
            placeholder="Lọc theo nhà cung cấp"
            options={suppliers.map((s) => ({ value: s._id, label: s.name }))}
            value={supplierFilter}
            onChange={(value) => {
              setSupplierFilter(value || undefined);
              setPage(1);
            }}
            style={{ minWidth: 240 }}
          />
        </div>

        <Table<PurchaseOrder>
          rowKey="_id"
          columns={columns}
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
          locale={{ emptyText: "Chưa có đơn nhập nào" }}
        />
      </Card>

      {/* Create / edit draft drawer (dùng chung) */}
      <Drawer
        title={editingPoId ? "Sửa đơn nhập nháp" : "Tạo đơn nhập hàng"}
        open={createOpen}
        onClose={() => { setCreateOpen(false); setEditingPoId(null); }}
        width={900}
        extra={
          <Space>
            <Button onClick={() => { setCreateOpen(false); setEditingPoId(null); }}>Hủy</Button>
            <Button type="primary" loading={createSubmitting} onClick={() => void onSubmitCreate()}>
              {editingPoId ? "Lưu thay đổi" : "Lưu nháp"}
            </Button>
          </Space>
        }
      >
        <Form layout="vertical">
          <Form.Item label="Nhà cung cấp" required>
            <Select
              placeholder="Chọn nhà cung cấp / xưởng"
              showSearch
              options={suppliers.map((s) => ({
                value: s._id,
                label: s.name,
                optionLabel: (
                  <Space>
                    <span>{s.name}</span>
                    {s.type === "internal" ? (
                      <Tag color="purple">Nội bộ</Tag>
                    ) : (
                      <Tag color="blue">Mua ngoài</Tag>
                    )}
                  </Space>
                ),
              }))}
              optionRender={(option) =>
                ((option.data as { optionLabel?: ReactNode }).optionLabel ?? option.label) as ReactNode
              }
              value={createSupplierId}
              onChange={(value) => setCreateSupplierId(value || null)}
              filterOption={(input, option) =>
                (option?.label?.toString() || "").toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item label="Ngày dự kiến nhận">
            <DatePicker
              value={createExpectedDate ?? undefined}
              onChange={(value) => setCreateExpectedDate(value || null)}
              format="DD/MM/YYYY"
              className="w-full!"
            />
          </Form.Item>

          <Form.Item label="Ghi chú">
            <Input.TextArea
              rows={2}
              value={createNote}
              onChange={(event) => setCreateNote(event.target.value)}
              maxLength={240}
            />
          </Form.Item>

          <Form.Item label="Thêm sản phẩm vào đơn">
            <Select
              showSearch
              placeholder="Tìm sản phẩm theo tên / SKU..."
              filterOption={false}
              onSearch={onProductSearch}
              onChange={onAddVariantsForProduct}
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
              value={undefined}
            />
          </Form.Item>
        </Form>

        <Card size="small" className="bg-slate-50!">
          <Text strong>Danh sách dòng nhập</Text>
          <Table<CreateLineDraft>
            rowKey={(row) => `${row.productId}-${row.variantSku}`}
            columns={lineColumns}
            dataSource={createLines}
            pagination={false}
            size="small"
            className="mt-2"
            locale={{ emptyText: "Chưa thêm dòng nào — chọn sản phẩm ở trên" }}
          />
          <div className="mt-3 flex items-center justify-end gap-3">
            <Text type="secondary">Tổng giá trị đặt hàng:</Text>
            <Title level={4} className="m-0!">{formatCurrency(createTotal)}</Title>
          </div>
        </Card>
      </Drawer>

      {/* Detail drawer */}
      <Drawer
        title={selectedPo ? `Đơn nhập ${selectedPo.poNumber}` : "Đơn nhập"}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={920}
        extra={
          selectedPo ? (
            <Space>
              {isDraftPo ? (
                <Button onClick={() => openEditDraft(selectedPo)}>Sửa nháp</Button>
              ) : null}
              {isDraftPo ? (
                <Popconfirm title="Chuyển sang Đã đặt? Sẽ tăng số lượng hàng đang về kho." okText="Đặt hàng" cancelText="Hủy" onConfirm={() => void onConfirm()}>
                  <Button type="primary">Đặt hàng</Button>
                </Popconfirm>
              ) : null}
              {canReceive ? (
                <Button type="primary" onClick={openReceiveModal}>Nhập hàng</Button>
              ) : null}
              {canCancel ? (
                <Popconfirm
                  title={isPartialClose
                    ? "Đóng đơn nhập này? Phần hàng đã nhận sẽ giữ lại, phần chưa nhận sẽ bị hủy."
                    : "Hủy đơn nhập này?"}
                  okText={isPartialClose ? "Đóng đơn" : "Hủy đơn"}
                  cancelText="Đóng"
                  onConfirm={() => void onCancel()}
                >
                  <Button danger>{isPartialClose ? "Đóng đơn" : "Hủy đơn"}</Button>
                </Popconfirm>
              ) : null}
            </Space>
          ) : null
        }
      >
        {selectedPo ? (
          <div className="flex flex-col gap-3">
            <Card size="small">
              <Space size="large" wrap>
                <div>
                  <Text type="secondary" className="text-xs!">Nhà cung cấp</Text>
                  <div>
                    <Text strong>{selectedPo.supplierNameSnapshot}</Text>
                    {selectedPo.supplierType === "internal" ? (
                      <Tag color="purple" className="ml-2">Nội bộ</Tag>
                    ) : (
                      <Tag color="blue" className="ml-2">Mua ngoài</Tag>
                    )}
                  </div>
                </div>
                <div>
                  <Text type="secondary" className="text-xs!">Trạng thái</Text>
                  <div><Tag color={PO_STATUS_COLOR[selectedPo.status]}>{PO_STATUS_LABEL[selectedPo.status]}</Tag></div>
                </div>
                <div>
                  <Text type="secondary" className="text-xs!">Dự kiến nhận</Text>
                  <div>{selectedPo.expectedDeliveryDate ? dayjs(selectedPo.expectedDeliveryDate).format("DD/MM/YYYY") : "—"}</div>
                </div>
                <div>
                  <Text type="secondary" className="text-xs!">Tổng tiền</Text>
                  <div><Text strong>{formatCurrency(selectedPo.total)}</Text></div>
                </div>
              </Space>
              {selectedPo.note ? (
                <div className="mt-2">
                  <Text type="secondary">Ghi chú: {selectedPo.note}</Text>
                </div>
              ) : null}
            </Card>

            <Card size="small" title="Dòng đặt hàng">
              <Table
                rowKey={(row) => row.variantSku}
                size="small"
                pagination={false}
                dataSource={selectedPo.lines}
                columns={[
                  {
                    title: "Sản phẩm",
                    render: (_, row) => (
                      <div>
                        <Text strong>{row.productNameSnapshot}</Text>
                        <div className="text-xs text-slate-500">{row.variantLabelSnapshot} · {row.variantSku}</div>
                      </div>
                    ),
                  },
                  {
                    title: "SL đặt / đã nhận",
                    width: 160,
                    render: (_, row) => (
                      <Text>
                        {formatNumber.format(row.receivedQty)} / {formatNumber.format(row.orderedQty)}
                      </Text>
                    ),
                  },
                  {
                    title: "Giá vốn",
                    width: 140,
                    align: "right",
                    render: (_, row) => formatCurrency(row.unitCost),
                  },
                  {
                    title: "Thành tiền",
                    width: 160,
                    align: "right",
                    render: (_, row) => <Text strong>{formatCurrency(row.lineTotal)}</Text>,
                  },
                ]}
              />
            </Card>

            {selectedPo.receipts.length > 0 ? (
              <Card size="small" title={`Lần nhận hàng (${selectedPo.receipts.length})`}>
                {selectedPo.receipts.map((receipt, idx) => (
                  <div key={idx} className="mb-3 rounded border border-slate-200 p-2">
                    <div className="flex items-center justify-between">
                      <Text strong>Lần {idx + 1}</Text>
                      <Text type="secondary" className="text-xs!">
                        {dayjs(receipt.receivedAt).format("DD/MM/YYYY HH:mm")} · {receipt.receivedByName || "—"}
                      </Text>
                    </div>
                    {receipt.lines.map((line, lineIdx) => (
                      <div key={lineIdx} className="text-sm">
                        {line.variantSku}: +{formatNumber.format(line.qty)} @ {formatCurrency(line.unitCost)}
                      </div>
                    ))}
                    {receipt.note ? <Text type="secondary" className="text-xs!">Ghi chú: {receipt.note}</Text> : null}
                  </div>
                ))}
              </Card>
            ) : null}

            <Card size="small" title="Timeline">
              {selectedPo.timeline.map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-slate-100 py-1">
                  <div>
                    <Tag color={PO_STATUS_COLOR[entry.status as POStatus] || "default"}>{PO_STATUS_LABEL[entry.status as POStatus] || entry.status}</Tag>
                    <Text>{entry.note}</Text>
                  </div>
                  <Text type="secondary" className="text-xs!">
                    {dayjs(entry.at).format("DD/MM HH:mm")} · {entry.byName || "—"}
                  </Text>
                </div>
              ))}
            </Card>
          </div>
        ) : null}
      </Drawer>

      {/* Receive modal */}
      <Modal
        open={receiveOpen}
        title="Ghi nhận nhập hàng"
        onCancel={() => setReceiveOpen(false)}
        onOk={() => void onSubmitReceive()}
        confirmLoading={receiveSubmitting}
        okText="Lưu"
        cancelText="Hủy"
        width={760}
      >
        <Text type="secondary">
          Nhập số lượng thực tế nhận cho từng dòng. Có thể nhận một phần — phần còn lại sẽ giữ lại để nhận tiếp.
        </Text>
        <Table
          rowKey="variantSku"
          dataSource={receiveLines}
          pagination={false}
          size="small"
          className="mt-3"
          columns={[
            { title: "Dòng", dataIndex: "label" },
            {
              title: "SL nhận (≤ còn lại)",
              width: 200,
              render: (_, row, index) => (
                <Space>
                  <InputNumber
                    min={0}
                    max={row.max}
                    value={row.qty}
                    onChange={(value) => {
                      const next = [...receiveLines];
                      next[index] = { ...next[index], qty: Number(value || 0) };
                      setReceiveLines(next);
                    }}
                  />
                  <Text type="secondary">/ {row.max}</Text>
                </Space>
              ),
            },
            {
              title: "Giá vốn / cái",
              width: 200,
              render: (_, row, index) => (
                <InputNumber
                  min={0}
                  precision={0}
                  value={row.unitCost}
                  onChange={(value) => {
                    const next = [...receiveLines];
                    next[index] = { ...next[index], unitCost: Number(value || 0) };
                    setReceiveLines(next);
                  }}
                  formatter={currencyFormatter}
                  parser={currencyParser}
                  addonAfter="VND"
                />
              ),
            },
          ]}
        />
        <Form.Item label="Ghi chú" className="mt-3">
          <Input.TextArea
            rows={2}
            value={receiveNote}
            onChange={(event) => setReceiveNote(event.target.value)}
            maxLength={240}
          />
        </Form.Item>
      </Modal>
    </div>
  );
}
