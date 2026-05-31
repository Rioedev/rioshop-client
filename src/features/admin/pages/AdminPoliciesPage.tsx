import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
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
import {
  ClockCircleOutlined,
  CrownOutlined,
  CustomerServiceOutlined,
  GiftOutlined,
  HeartOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  RetweetOutlined,
  SafetyCertificateOutlined,
  TruckOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RichTextEditor } from "../../../components/editor/RichTextEditor";
import {
  type Policy,
  type PolicyKind,
  type PolicyPayload,
  policyService,
} from "../../../services/policyService";
import { getErrorMessage } from "../../../utils/errorMessage";

const { Title, Text } = Typography;

const ICON_OPTIONS: Array<{ key: string; node: ReactNode; label: string }> = [
  { key: "RetweetOutlined", node: <RetweetOutlined />, label: "Đổi trả" },
  { key: "TruckOutlined", node: <TruckOutlined />, label: "Vận chuyển" },
  { key: "SafetyCertificateOutlined", node: <SafetyCertificateOutlined />, label: "Bảo hành" },
  { key: "GiftOutlined", node: <GiftOutlined />, label: "Quà tặng" },
  { key: "HeartOutlined", node: <HeartOutlined />, label: "Yêu thích" },
  { key: "CrownOutlined", node: <CrownOutlined />, label: "VIP" },
  { key: "ClockCircleOutlined", node: <ClockCircleOutlined />, label: "Thời gian" },
  { key: "PhoneOutlined", node: <PhoneOutlined />, label: "Hotline" },
  { key: "MailOutlined", node: <MailOutlined />, label: "Email" },
  { key: "CustomerServiceOutlined", node: <CustomerServiceOutlined />, label: "CSKH" },
];

export const renderPolicyIcon = (iconKey?: string): ReactNode => {
  if (!iconKey) return null;
  const found = ICON_OPTIONS.find((item) => item.key === iconKey);
  return found?.node ?? null;
};

type PolicyFormValues = {
  title: string;
  slug?: string;
  iconKey?: string;
  summary?: string;
  content?: string;
  position?: number;
  isActive: boolean;
};

export function AdminPoliciesPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [activeKind, setActiveKind] = useState<PolicyKind>("strip");
  const [items, setItems] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<PolicyFormValues>();

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await policyService.list({ kind: activeKind, limit: 100 });
      setItems(result.docs);
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không tải được danh sách chính sách"));
    } finally {
      setLoading(false);
    }
  }, [activeKind, messageApi]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const openCreate = () => {
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (policy: Policy) => {
    setEditingId(policy._id);
    setModalOpen(true);
  };

  useEffect(() => {
    if (!modalOpen) return;
    if (editingId) {
      const editing = items.find((item) => item._id === editingId);
      if (editing) {
        form.setFieldsValue({
          title: editing.title,
          slug: editing.slug,
          iconKey: editing.iconKey || undefined,
          summary: editing.summary,
          content: editing.content,
          position: editing.position,
          isActive: editing.isActive,
        });
      }
    } else {
      form.resetFields();
      form.setFieldsValue({
        isActive: true,
        position: items.length,
        iconKey: activeKind === "strip" ? "RetweetOutlined" : undefined,
      });
    }
  }, [modalOpen, editingId, items, activeKind, form]);

  const onSubmit = async () => {
    let values: PolicyFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setSubmitting(true);
    try {
      const payload: PolicyPayload = {
        kind: activeKind,
        title: values.title.trim(),
        slug: values.slug?.trim() || undefined,
        iconKey: values.iconKey || "",
        summary: values.summary?.trim() || "",
        content: values.content || "",
        position: Number(values.position) || 0,
        isActive: Boolean(values.isActive),
      };

      if (editingId) {
        await policyService.update(editingId, payload);
        messageApi.success("Đã cập nhật chính sách");
      } else {
        await policyService.create(payload);
        messageApi.success("Đã tạo chính sách");
      }

      setModalOpen(false);
      void loadList();
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không lưu được chính sách"));
    } finally {
      setSubmitting(false);
    }
  };

  const onToggleActive = async (policy: Policy, nextActive: boolean) => {
    try {
      await policyService.update(policy._id, { isActive: nextActive });
      setItems((prev) =>
        prev.map((item) => (item._id === policy._id ? { ...item, isActive: nextActive } : item)),
      );
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không cập nhật được trạng thái"));
    }
  };

  const onDelete = async (policy: Policy) => {
    try {
      await policyService.remove(policy._id);
      messageApi.success("Đã xóa chính sách");
      setItems((prev) => prev.filter((item) => item._id !== policy._id));
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không xóa được chính sách"));
    }
  };

  const columns: ColumnsType<Policy> = useMemo(
    () => [
      {
        title: "Thứ tự",
        dataIndex: "position",
        width: 80,
        sorter: (a, b) => a.position - b.position,
        defaultSortOrder: "ascend",
      },
      {
        title: "Tiêu đề",
        dataIndex: "title",
        render: (_, record) => (
          <Space>
            {record.iconKey ? <span style={{ color: "#0f4fa8" }}>{renderPolicyIcon(record.iconKey)}</span> : null}
            <span style={{ fontWeight: 600 }}>{record.title}</span>
          </Space>
        ),
      },
      ...(activeKind === "page"
        ? [
            {
              title: "Slug",
              dataIndex: "slug",
              render: (slug: string) => <Tag color="blue">/{slug}</Tag>,
            } as const,
          ]
        : []),
      {
        title: "Mô tả ngắn",
        dataIndex: "summary",
        ellipsis: true,
        render: (text: string) => <Text type="secondary">{text || "—"}</Text>,
      },
      {
        title: "Hiển thị",
        dataIndex: "isActive",
        width: 100,
        render: (_, record) => (
          <Switch
            checked={record.isActive}
            onChange={(checked) => void onToggleActive(record, checked)}
          />
        ),
      },
      {
        title: "",
        key: "actions",
        width: 160,
        render: (_, record) => (
          <Space>
            <Button size="small" onClick={() => openEdit(record)}>
              Sửa
            </Button>
            <Popconfirm
              title="Xóa chính sách này?"
              okText="Xóa"
              cancelText="Hủy"
              onConfirm={() => void onDelete(record)}
            >
              <Button size="small" danger>
                Xóa
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [activeKind],
  );

  return (
    <div className="space-y-4">
      {contextHolder}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Title level={3} className="m-0!">Chính sách cửa hàng</Title>
          <Text type="secondary">
            Quản lý dải băng chính sách trên đầu trang và các trang chính sách (đổi trả, vận chuyển, bảo mật...).
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm chính sách
        </Button>
      </div>

      <Card>
        <Space direction="vertical" size="middle" className="w-full">
          <Segmented
            value={activeKind}
            onChange={(value) => setActiveKind(value as PolicyKind)}
            options={[
              { label: "Dải băng (header)", value: "strip" },
              { label: "Trang chính sách", value: "page" },
            ]}
          />
          <Table<Policy>
            rowKey="_id"
            columns={columns}
            dataSource={items}
            loading={loading}
            pagination={false}
            size="middle"
          />
        </Space>
      </Card>

      <Modal
        open={modalOpen}
        title={editingId ? "Cập nhật chính sách" : "Thêm chính sách"}
        onCancel={() => setModalOpen(false)}
        onOk={() => void onSubmit()}
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={submitting}
        width={activeKind === "page" ? 880 : 560}
        forceRender
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label={activeKind === "strip" ? "Nội dung dải băng" : "Tiêu đề trang"}
            rules={[{ required: true, message: "Bắt buộc" }]}
          >
            <Input
              placeholder={
                activeKind === "strip"
                  ? "VD: Miễn phí đổi trả 60 ngày"
                  : "VD: Chính sách đổi trả"
              }
              maxLength={120}
            />
          </Form.Item>

          {activeKind === "strip" ? (
            <>
              <Form.Item
                name="iconKey"
                label="Icon"
                rules={[{ required: true, message: "Chọn icon" }]}
              >
                <Select
                  options={ICON_OPTIONS.map((item) => ({
                    value: item.key,
                    label: (
                      <Space>
                        <span style={{ color: "#0f4fa8" }}>{item.node}</span>
                        <span>{item.label}</span>
                      </Space>
                    ),
                  }))}
                />
              </Form.Item>
              <Form.Item
                name="summary"
                label="Mô tả ngắn (tooltip / dòng phụ)"
                extra="Tùy chọn — hiển thị khi hover hoặc dòng phụ phía dưới."
              >
                <Input.TextArea rows={2} maxLength={160} showCount />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item
                name="slug"
                label="Slug (URL: /chinh-sach/...)"
                extra="Để trống mình tự tạo theo tiêu đề. Chỉ ký tự thường, gạch nối."
              >
                <Input placeholder="vd: doi-tra" maxLength={80} />
              </Form.Item>

              <Form.Item name="summary" label="Mô tả ngắn (hiển thị ở danh sách + footer)">
                <Input.TextArea rows={2} maxLength={240} showCount />
              </Form.Item>

              <Form.Item
                name="content"
                label="Nội dung trang"
                rules={[{ required: true, message: "Bắt buộc nội dung" }]}
                valuePropName="value"
              >
                <RichTextEditor placeholder="Soạn nội dung chính sách..." />
              </Form.Item>
            </>
          )}

          <Space size="large" className="w-full justify-between">
            <Form.Item name="position" label="Thứ tự sắp xếp" initialValue={0} className="mb-0!">
              <InputNumber min={0} max={999} />
            </Form.Item>
            <Form.Item name="isActive" label="Hiển thị công khai" valuePropName="checked" initialValue={true} className="mb-0!">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
