import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SUPPLIER_TYPE_LABEL,
  type Supplier,
  type SupplierPayload,
  type SupplierType,
  supplierService,
} from "../../../services/supplierService";
import { getErrorMessage } from "../../../utils/errorMessage";

const { Title, Text } = Typography;

type TypeFilter = "all" | SupplierType;

export function AdminSuppliersPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<SupplierPayload>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await supplierService.list({
        limit: 100,
        search,
        type: typeFilter === "all" ? undefined : typeFilter,
      });
      setItems(result.docs);
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không tải được danh sách"));
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, messageApi]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingId(supplier._id);
    setModalOpen(true);
  };

  useEffect(() => {
    if (!modalOpen) return;
    if (editingId) {
      const editing = items.find((item) => item._id === editingId);
      if (editing) {
        form.setFieldsValue({
          name: editing.name,
          type: editing.type,
          phone: editing.phone,
          email: editing.email,
          address: editing.address,
          note: editing.note,
          isActive: editing.isActive,
        });
      }
    } else {
      form.resetFields();
      form.setFieldsValue({ isActive: true, type: "external" });
    }
  }, [modalOpen, editingId, items, form]);

  const onSubmit = async () => {
    let values: SupplierPayload;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await supplierService.update(editingId, values);
        messageApi.success("Đã cập nhật nhà cung cấp");
      } else {
        await supplierService.create(values);
        messageApi.success("Đã tạo nhà cung cấp");
      }
      setModalOpen(false);
      void load();
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không lưu được"));
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (supplier: Supplier) => {
    try {
      await supplierService.remove(supplier._id);
      messageApi.success("Đã xóa");
      setItems((prev) => prev.filter((item) => item._id !== supplier._id));
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không xóa được"));
    }
  };

  const columns: ColumnsType<Supplier> = useMemo(
    () => [
      {
        title: "Tên",
        dataIndex: "name",
        render: (value: string, row) => (
          <div>
            <Text strong>{value}</Text>
            {row.isActive ? null : <Tag color="default" className="ml-2">Ngưng</Tag>}
          </div>
        ),
      },
      {
        title: "Loại",
        dataIndex: "type",
        width: 160,
        render: (value: SupplierType) =>
          value === "internal" ? (
            <Tag color="purple">Sản xuất nội bộ</Tag>
          ) : (
            <Tag color="blue">Mua ngoài</Tag>
          ),
      },
      { title: "SĐT", dataIndex: "phone", width: 140 },
      { title: "Email", dataIndex: "email", width: 220 },
      { title: "Địa chỉ", dataIndex: "address", ellipsis: true },
      {
        title: "",
        key: "actions",
        width: 160,
        render: (_, record) => (
          <Space>
            <Button size="small" onClick={() => openEdit(record)}>Sửa</Button>
            <Popconfirm title="Xóa nhà cung cấp này?" okText="Xóa" cancelText="Hủy" onConfirm={() => void onDelete(record)}>
              <Button size="small" danger>Xóa</Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      {contextHolder}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Title level={3} className="m-0!">Nhà cung cấp</Title>
          <Text type="secondary">Danh sách nhà cung cấp dùng khi nhập kho.</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm nhà cung cấp
        </Button>
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Segmented
            value={typeFilter}
            onChange={(value) => setTypeFilter(value as TypeFilter)}
            options={[
              { label: "Tất cả", value: "all" },
              { label: "Sản xuất nội bộ", value: "internal" },
              { label: "Mua ngoài", value: "external" },
            ]}
          />
          <Input.Search
            placeholder="Tìm theo tên / SĐT / email..."
            allowClear
            onSearch={(value) => setSearch(value)}
            className="max-w-md"
          />
        </div>
        <Table<Supplier>
          rowKey="_id"
          columns={columns}
          dataSource={items}
          loading={loading}
          pagination={false}
          size="middle"
          locale={{ emptyText: "Chưa có nhà cung cấp nào" }}
        />
      </Card>

      <Modal
        open={modalOpen}
        title={editingId ? "Cập nhật nhà cung cấp" : "Thêm nhà cung cấp"}
        onCancel={() => setModalOpen(false)}
        onOk={() => void onSubmit()}
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={submitting}
        forceRender
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Tên nhà cung cấp" rules={[{ required: true, message: "Bắt buộc" }]}>
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item
            name="type"
            label="Loại nguồn nhập"
            rules={[{ required: true, message: "Chọn loại" }]}
            initialValue="external"
          >
            <Select
              options={[
                { value: "internal", label: SUPPLIER_TYPE_LABEL.internal },
                { value: "external", label: SUPPLIER_TYPE_LABEL.external },
              ]}
            />
          </Form.Item>
          <Form.Item name="phone" label="SĐT">
            <Input maxLength={30} />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ">
            <Input.TextArea rows={2} maxLength={240} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} maxLength={240} />
          </Form.Item>
          <Form.Item name="isActive" label="Hoạt động" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
