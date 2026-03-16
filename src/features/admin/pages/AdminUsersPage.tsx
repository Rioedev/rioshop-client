import { AxiosError } from "axios";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import {
  type CreateCustomerPayload,
  type CustomerStatus,
  type CustomerStatusFilter,
  type CustomerUser,
  type UpdateCustomerPayload,
} from "../../../services/customerUserService";
import {
  useCustomerUserStore,
} from "../../../stores/customerUserStore";

const { Paragraph, Title, Text } = Typography;

type CustomerFormValues = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  status: CustomerStatus;
};

const STATUS_OPTIONS: { value: CustomerStatusFilter; label: string }[] = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "active", label: "Đang hoạt động" },
  { value: "inactive", label: "Ngừng hoạt động" },
  { value: "banned", label: "Đã khóa" },
];

const STATUS_COLOR_MAP: Record<CustomerStatus, string> = {
  active: "green",
  inactive: "default",
  banned: "red",
};
const STATUS_LABEL_MAP: Record<CustomerStatus, string> = {
  active: "Đang hoạt động",
  inactive: "Ngừng hoạt động",
  banned: "Đã khóa",
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof AxiosError) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Yêu cầu thất bại";
};

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const formatCurrency = new Intl.NumberFormat("vi-VN");

export function AdminUsersPage() {
  const [form] = Form.useForm<CustomerFormValues>();
  const [messageApi, contextHolder] = message.useMessage();

  const [searchText, setSearchText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerUser | null>(null);
  const customers = useCustomerUserStore((state) => state.customers);
  const loading = useCustomerUserStore((state) => state.loading);
  const saving = useCustomerUserStore((state) => state.saving);
  const isForbidden = useCustomerUserStore((state) => state.isForbidden);
  const page = useCustomerUserStore((state) => state.page);
  const pageSize = useCustomerUserStore((state) => state.pageSize);
  const total = useCustomerUserStore((state) => state.total);
  const keyword = useCustomerUserStore((state) => state.keyword);
  const statusFilter = useCustomerUserStore((state) => state.statusFilter);
  const loadCustomers = useCustomerUserStore((state) => state.loadCustomers);
  const setKeyword = useCustomerUserStore((state) => state.setKeyword);
  const setStatusFilter = useCustomerUserStore((state) => state.setStatusFilter);
  const setPage = useCustomerUserStore((state) => state.setPage);
  const setPageSize = useCustomerUserStore((state) => state.setPageSize);
  const createCustomer = useCustomerUserStore((state) => state.createCustomer);
  const updateCustomer = useCustomerUserStore((state) => state.updateCustomer);
  const updateCustomerStatus = useCustomerUserStore((state) => state.updateCustomerStatus);
  const softDeleteCustomer = useCustomerUserStore((state) => state.softDeleteCustomer);

  useEffect(() => {
    setSearchText(keyword);
  }, [keyword]);

  useEffect(() => {
    const nextKeyword = searchText.trim();
    if (nextKeyword === keyword) return;

    const timeoutId = window.setTimeout(() => {
      setPage(1);
      setKeyword(nextKeyword);
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [keyword, searchText, setKeyword, setPage]);

  useEffect(() => {
    void loadCustomers({
      page,
      pageSize,
      keyword,
      statusFilter,
      deletedFilter: "active_only",
    }).catch((error) => {
      messageApi.error(getErrorMessage(error));
    });
  }, [keyword, loadCustomers, messageApi, page, pageSize, statusFilter]);

  const stats = useMemo(() => {
    const active = customers.filter((item) => item.status === "active").length;
    const banned = customers.filter((item) => item.status === "banned").length;
    const inactive = customers.filter((item) => item.status === "inactive").length;

    return {
      active,
      banned,
      inactive,
    };
  }, [customers]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    form.resetFields();
  };

  const openCreateModal = () => {
    setEditingCustomer(null);
    form.resetFields();
    form.setFieldsValue({
      status: "active",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (customer: CustomerUser) => {
    setEditingCustomer(customer);
    form.setFieldsValue({
      fullName: customer.fullName,
      email: customer.email,
      phone: customer.phone,
      status: customer.status,
      password: "",
    });
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async () => {
    try {
      const values = await form.validateFields();

      if (editingCustomer) {
        const payload: UpdateCustomerPayload = {
          fullName: values.fullName.trim(),
          email: values.email.trim().toLowerCase(),
          phone: values.phone.trim(),
          status: values.status,
        };
        await updateCustomer(editingCustomer.id, payload);
        messageApi.success("Cập nhật khách hàng thành công");
      } else {
        const payload: CreateCustomerPayload = {
          fullName: values.fullName.trim(),
          email: values.email.trim().toLowerCase(),
          phone: values.phone.trim(),
          password: values.password,
          status: values.status,
        };
        await createCustomer(payload);
        messageApi.success("Tạo khách hàng thành công");
      }

      closeModal();
    } catch (error) {
      if (error instanceof Error && "errorFields" in error) {
        return;
      }
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleUpdateStatus = async (customer: CustomerUser, nextStatus: CustomerStatus) => {
    if (customer.status === nextStatus) return;

    try {
      await updateCustomerStatus(customer.id, nextStatus);
      messageApi.success("Cập nhật trạng thái thành công");
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleSoftDelete = async (id: string) => {
    try {
      await softDeleteCustomer(id);
      messageApi.success("Xóa mềm khách hàng thành công");
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleStatusFilterChange = (value: CustomerStatusFilter) => {
    setPage(1);
    setStatusFilter(value);
  };

  const columns: ColumnsType<CustomerUser> = [
    {
      title: "Họ tên",
      dataIndex: "fullName",
      key: "fullName",
      width: 200,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 240,
    },
    {
      title: "Số điện thoại",
      dataIndex: "phone",
      key: "phone",
      width: 140,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 160,
      render: (status: CustomerStatus, record) =>
        record.isDeleted ? (
          <Tag color="default">Đã xóa mềm</Tag>
        ) : (
          <Select<CustomerStatus>
            size="small"
            value={status}
            options={[
              { value: "active", label: "Đang hoạt động" },
              { value: "inactive", label: "Ngừng hoạt động" },
              { value: "banned", label: "Đã khóa" },
            ]}
            onChange={(nextStatus) => void handleUpdateStatus(record, nextStatus)}
            disabled={isForbidden || saving}
          />
        ),
    },
    {
      title: "Hiển thị",
      key: "statusTag",
      width: 130,
      render: (_, record) => <Tag color={STATUS_COLOR_MAP[record.status]}>{STATUS_LABEL_MAP[record.status]}</Tag>,
    },
    {
      title: "Số đơn",
      dataIndex: "totalOrders",
      key: "totalOrders",
      width: 90,
    },
    {
      title: "Chi tiêu (VND)",
      dataIndex: "totalSpend",
      key: "totalSpend",
      width: 140,
      render: (value: number) => formatCurrency.format(value),
    },
    {
      title: "Lần đăng nhập cuối",
      dataIndex: "lastLoginAt",
      key: "lastLoginAt",
      width: 150,
      render: (lastLoginAt?: string) => formatDateTime(lastLoginAt),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 180,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            onClick={() => openEditModal(record)}
            disabled={isForbidden || record.isDeleted}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xóa mềm khách hàng"
            description="Tài khoản sẽ được đánh dấu đã xóa mềm."
            okText="Xóa mềm"
            cancelText="Hủy"
            disabled={isForbidden || record.isDeleted}
            onConfirm={() => void handleSoftDelete(record.id)}
          >
            <Button size="small" danger disabled={isForbidden || record.isDeleted}>
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
            Quản lý khách hàng
          </Title>
          <Paragraph className="mb-0!" type="secondary">
            Quản lý tài khoản khách hàng, cập nhật trạng thái và xóa mềm.
          </Paragraph>
        </div>
        <Button type="primary" onClick={openCreateModal} disabled={isForbidden}>
          Thêm khách hàng
        </Button>
      </div>

      {isForbidden ? (
        <Alert
          type="warning"
          showIcon
          message="Tài khoản của bạn không có quyền quản lý khách hàng."
          description="Chỉ các vai trò có quyền quản lý khách hàng mới truy cập được."
        />
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <Text type="secondary">Tổng bản ghi</Text>
          <Title level={3} className="mb-0! mt-1!">
            {total}
          </Title>
        </Card>
        <Card>
          <Text type="secondary">Đang hoạt động (trang hiện tại)</Text>
          <Title level={3} className="mb-0! mt-1! text-emerald-600!">
            {stats.active}
          </Title>
        </Card>
        <Card>
          <Text type="secondary">Ngừng hoạt động (trang hiện tại)</Text>
          <Title level={3} className="mb-0! mt-1!">
            {stats.inactive}
          </Title>
        </Card>
        <Card>
          <Text type="secondary">Đã khóa (trang hiện tại)</Text>
          <Title level={3} className="mb-0! mt-1! text-red-600!">
            {stats.banned}
          </Title>
        </Card>
      </div>

      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px]">
          <Input
            value={searchText}
            allowClear
            placeholder="Tìm theo họ tên, email, số điện thoại"
            onChange={(event) => setSearchText(event.target.value)}
          />
          <Select
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={handleStatusFilterChange}
          />
        </div>

        <Table<CustomerUser>
          rowKey="id"
          columns={columns}
          dataSource={customers}
          loading={loading || saving}
          scroll={{ x: 1450 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (value) => `Tổng ${value} khách hàng`,
          }}
          onChange={(pagination: TablePaginationConfig) => {
            const nextPage = pagination.current ?? page;
            const nextPageSize = pagination.pageSize ?? pageSize;
            setPage(nextPage);
            setPageSize(nextPageSize);
          }}
        />
      </Card>

      <Modal
        title={editingCustomer ? "Sửa khách hàng" : "Tạo khách hàng"}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={() => void handleSaveCustomer()}
        okText={editingCustomer ? "Cập nhật" : "Tạo mới"}
        cancelText="Hủy"
        okButtonProps={{ loading: saving }}
        destroyOnHidden
      >
        <Form<CustomerFormValues> form={form} layout="vertical">
          <Form.Item
            label="Họ tên"
            name="fullName"
            rules={[
              { required: true, message: "Vui lòng nhập họ tên" },
              { min: 2, message: "Họ tên phải có ít nhất 2 ký tự" },
            ]}
          >
            <Input placeholder="Nhập họ tên" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập email" },
              { type: "email", message: "Email không hợp lệ" },
            ]}
          >
            <Input placeholder="customer@rioshop.com" />
          </Form.Item>

          <Form.Item
            label="Số điện thoại"
            name="phone"
            rules={[
              { required: true, message: "Vui lòng nhập số điện thoại" },
              { pattern: /^[0-9]{10,11}$/, message: "Số điện thoại phải có 10-11 chữ số" },
            ]}
          >
            <Input placeholder="0987654321" />
          </Form.Item>

          {editingCustomer ? null : (
            <Form.Item
              label="Mật khẩu"
              name="password"
              rules={[
                { required: true, message: "Vui lòng nhập mật khẩu" },
                { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
              ]}
            >
              <Input.Password placeholder="Nhập mật khẩu" />
            </Form.Item>
          )}

          <Form.Item
            label="Trạng thái"
            name="status"
            rules={[{ required: true, message: "Vui lòng chọn trạng thái" }]}
          >
            <Select
              options={[
                { value: "active", label: "Đang hoạt động" },
                { value: "inactive", label: "Ngừng hoạt động" },
                { value: "banned", label: "Đã khóa" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
