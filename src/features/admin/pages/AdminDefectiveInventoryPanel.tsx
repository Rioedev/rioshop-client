import { Button, Card, Input, Modal, Select, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  defectiveInventoryService,
  type DefectiveInventoryRecord,
  type DefectiveInventoryStatus,
} from "../../../services/defectiveInventoryService";
import { getErrorMessage } from "../../../utils/errorMessage";

const { Text, Title } = Typography;

const STATUS_LABEL: Record<DefectiveInventoryStatus, string> = {
  pending_inspection: "Chờ kiểm tra",
  under_repair: "Đang sửa chữa",
  restocked: "Đã nhập lại kho",
  returned_supplier: "Đã trả nhà cung cấp",
  destroyed: "Đã tiêu hủy",
};

const STATUS_COLOR: Record<DefectiveInventoryStatus, string> = {
  pending_inspection: "gold",
  under_repair: "blue",
  restocked: "green",
  returned_supplier: "purple",
  destroyed: "red",
};

const NEXT_STATUS: Record<DefectiveInventoryStatus, DefectiveInventoryStatus[]> = {
  pending_inspection: ["under_repair", "restocked", "returned_supplier", "destroyed"],
  under_repair: ["restocked", "returned_supplier", "destroyed"],
  restocked: [],
  returned_supplier: [],
  destroyed: [],
};

const formatDateTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))
    : "-";

export function AdminDefectiveInventoryPanel() {
  const [messageApi, contextHolder] = message.useMessage();
  const [items, setItems] = useState<DefectiveInventoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<DefectiveInventoryStatus | undefined>();
  const [query, setQuery] = useState("");
  const [activeRecord, setActiveRecord] = useState<DefectiveInventoryRecord | null>(null);
  const [nextStatus, setNextStatus] = useState<DefectiveInventoryStatus | undefined>();
  const [note, setNote] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const result = await defectiveInventoryService.list({
        page,
        limit: 20,
        status,
        q: query.trim() || undefined,
      });
      setItems(result.docs);
      setTotal(result.totalDocs);
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không tải được danh sách hàng lỗi."));
    } finally {
      setLoading(false);
    }
  }, [messageApi, page, query, status]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const openResolution = (record: DefectiveInventoryRecord) => {
    setActiveRecord(record);
    setNextStatus(undefined);
    setNote("");
  };

  const submitResolution = async () => {
    if (!activeRecord || !nextStatus) {
      messageApi.warning("Hãy chọn hướng xử lý.");
      return;
    }
    if (["returned_supplier", "destroyed"].includes(nextStatus) && !note.trim()) {
      messageApi.warning("Hãy ghi chú lý do hoặc biên bản xử lý.");
      return;
    }

    setSaving(true);
    try {
      await defectiveInventoryService.updateStatus(activeRecord._id, {
        status: nextStatus,
        note: note.trim() || undefined,
      });
      messageApi.success(
        nextStatus === "restocked"
          ? "Đã kiểm tra và cộng sản phẩm trở lại tồn kho."
          : "Đã cập nhật hướng xử lý hàng lỗi.",
      );
      setActiveRecord(null);
      await loadItems();
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không cập nhật được hàng lỗi."));
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<DefectiveInventoryRecord> = useMemo(
    () => [
      {
        title: "Sản phẩm lỗi",
        key: "product",
        render: (_, record) => (
          <div className="flex min-w-[280px] items-center gap-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
              {record.image ? (
                <img src={record.image} alt={record.productNameSnapshot} className="h-full w-full object-cover object-top" />
              ) : null}
            </div>
            <div>
              <div className="font-semibold text-slate-900">{record.productNameSnapshot}</div>
              <div className="text-xs text-slate-500">{record.variantLabelSnapshot}</div>
              <div className="text-xs text-slate-500">SKU: {record.variantSku}</div>
            </div>
          </div>
        ),
      },
      {
        title: "Nguồn tiếp nhận",
        key: "source",
        width: 190,
        render: (_, record) => (
          <div>
            <div className="font-medium">Đơn {record.sourceOrderNumber || "-"}</div>
            <div className="text-xs text-slate-500">{formatDateTime(record.createdAt)}</div>
            {record.reason ? <div className="mt-1 text-xs text-slate-600">{record.reason}</div> : null}
          </div>
        ),
      },
      {
        title: "SL",
        dataIndex: "quantity",
        width: 70,
        align: "center",
      },
      {
        title: "Vị trí",
        key: "location",
        width: 190,
        render: (_, record) => (
          <div>
            <div>{record.locationLabel}</div>
            <div className="text-xs text-slate-500">{record.warehouseName}</div>
          </div>
        ),
      },
      {
        title: "Trạng thái",
        dataIndex: "status",
        width: 160,
        render: (value: DefectiveInventoryStatus) => (
          <Tag color={STATUS_COLOR[value]}>{STATUS_LABEL[value]}</Tag>
        ),
      },
      {
        title: "Xử lý",
        key: "action",
        width: 110,
        render: (_, record) =>
          NEXT_STATUS[record.status].length > 0 ? (
            <Button size="small" onClick={() => openResolution(record)}>
              Xử lý
            </Button>
          ) : (
            <Text type="secondary">Đã đóng</Text>
          ),
      },
    ],
    [],
  );

  return (
    <>
      {contextHolder}
      <Card>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Title level={5} className="mb-1! mt-0!">Hàng lỗi</Title>
            <Text type="secondary">Hàng tại đây không nằm trong tồn có thể bán cho đến khi được nhập lại kho.</Text>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input.Search
              allowClear
              placeholder="Mã đơn, tên sản phẩm, SKU..."
              className="w-[260px]"
              onSearch={(value) => {
                setPage(1);
                setQuery(value);
              }}
            />
            <Select
              allowClear
              placeholder="Tất cả trạng thái"
              className="w-[180px]"
              value={status}
              options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
              onChange={(value) => {
                setPage(1);
                setStatus(value);
              }}
            />
          </div>
        </div>

        <Table
          rowKey="_id"
          loading={loading}
          columns={columns}
          dataSource={items}
          scroll={{ x: 1050 }}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            showSizeChanger: false,
            onChange: setPage,
          }}
        />
      </Card>

      <Modal
        title="Xử lý hàng lỗi"
        open={Boolean(activeRecord)}
        onCancel={() => setActiveRecord(null)}
        onOk={() => void submitResolution()}
        okText="Xác nhận xử lý"
        cancelText="Đóng"
        confirmLoading={saving}
      >
        {activeRecord ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="font-semibold text-slate-900">{activeRecord.productNameSnapshot}</div>
              <div className="text-sm text-slate-600">
                {activeRecord.variantLabelSnapshot} · SL {activeRecord.quantity}
              </div>
            </div>
            <div>
              <Text type="secondary">Hướng xử lý</Text>
              <Select
                className="mt-1 w-full"
                placeholder="Chọn hướng xử lý"
                value={nextStatus}
                options={NEXT_STATUS[activeRecord.status].map((value) => ({
                  value,
                  label: STATUS_LABEL[value],
                }))}
                onChange={setNextStatus}
              />
            </div>
            <div>
              <Text type="secondary">Ghi chú / biên bản</Text>
              <Input.TextArea
                className="mt-1"
                rows={4}
                maxLength={1000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Tình trạng thực tế, nguyên nhân và cách xử lý..."
              />
            </div>
            {nextStatus === "restocked" ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                Xác nhận này sẽ cộng {activeRecord.quantity} sản phẩm trở lại tồn khả dụng của SKU {activeRecord.variantSku}.
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
