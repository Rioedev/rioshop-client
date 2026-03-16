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
  customerUserService,
  type CreateCustomerPayload,
  type CustomerStatus,
  type CustomerStatusFilter,
  type CustomerUser,
  type UpdateCustomerPayload,
} from "../../../services/customerUserService";

const { Paragraph, Title, Text } = Typography;

type CustomerFormValues = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  status: CustomerStatus;
};

type DeletedFilter = "active_only" | "deleted_only";

const STATUS_OPTIONS: { value: CustomerStatusFilter; label: string }[] = [
  { value: "all", label: "All status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "banned", label: "Banned" },
];

const DELETED_FILTER_OPTIONS: { value: DeletedFilter; label: string }[] = [
  { value: "active_only", label: "Not deleted" },
  { value: "deleted_only", label: "Soft deleted" },
];

const STATUS_COLOR_MAP: Record<CustomerStatus, string> = {
  active: "green",
  inactive: "default",
  banned: "red",
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof AxiosError) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Request failed";
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

  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomerStatusFilter>("all");
  const [deletedFilter, setDeletedFilter] = useState<DeletedFilter>("active_only");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerUser | null>(null);

  const loadCustomers = async (params?: { nextPage?: number; nextPageSize?: number }) => {
    const nextPage = params?.nextPage ?? page;
    const nextPageSize = params?.nextPageSize ?? pageSize;

    setLoading(true);
    try {
      const result = await customerUserService.getCustomers({
        page: nextPage,
        limit: nextPageSize,
        search: keyword,
        status: statusFilter,
        isDeleted: deletedFilter === "deleted_only" ? true : undefined,
      });

      setCustomers(result.docs);
      setTotal(result.totalDocs);
      setPage(result.page);
      setPageSize(result.limit);
      setIsForbidden(false);
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 403) {
        setCustomers([]);
        setTotal(0);
        setIsForbidden(true);
      } else {
        messageApi.error(getErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCustomers();
  }, [page, pageSize, keyword, statusFilter, deletedFilter]);

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
      setSaving(true);

      if (editingCustomer) {
        const payload: UpdateCustomerPayload = {
          fullName: values.fullName.trim(),
          email: values.email.trim().toLowerCase(),
          phone: values.phone.trim(),
          status: values.status,
        };
        await customerUserService.updateCustomer(editingCustomer.id, payload);
        messageApi.success("Customer updated successfully");
      } else {
        const payload: CreateCustomerPayload = {
          fullName: values.fullName.trim(),
          email: values.email.trim().toLowerCase(),
          phone: values.phone.trim(),
          password: values.password,
          status: values.status,
        };
        await customerUserService.createCustomer(payload);
        messageApi.success("Customer created successfully");
      }

      closeModal();
      await loadCustomers();
    } catch (error) {
      if (error instanceof Error && "errorFields" in error) {
        return;
      }
      messageApi.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (customer: CustomerUser, nextStatus: CustomerStatus) => {
    if (customer.status === nextStatus) return;

    try {
      setSaving(true);
      await customerUserService.updateCustomerStatus(customer.id, nextStatus);
      messageApi.success("Status updated successfully");
      await loadCustomers();
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleSoftDelete = async (id: string) => {
    try {
      setSaving(true);
      await customerUserService.softDeleteCustomer(id);
      messageApi.success("Customer soft deleted successfully");
      await loadCustomers();
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    setKeyword(searchText.trim());
  };

  const handleStatusFilterChange = (value: CustomerStatusFilter) => {
    setPage(1);
    setStatusFilter(value);
  };

  const handleDeletedFilterChange = (value: DeletedFilter) => {
    setPage(1);
    setDeletedFilter(value);
  };

  const columns: ColumnsType<CustomerUser> = [
    {
      title: "Full Name",
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
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      width: 140,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 160,
      render: (status: CustomerStatus, record) =>
        record.isDeleted ? (
          <Tag color="default">Soft Deleted</Tag>
        ) : (
          <Select<CustomerStatus>
            size="small"
            value={status}
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "banned", label: "Banned" },
            ]}
            onChange={(nextStatus) => void handleUpdateStatus(record, nextStatus)}
            disabled={isForbidden || saving}
          />
        ),
    },
    {
      title: "Current Status",
      key: "statusTag",
      width: 130,
      render: (_, record) => (
        <Tag color={STATUS_COLOR_MAP[record.status]}>{record.status}</Tag>
      ),
    },
    {
      title: "Orders",
      dataIndex: "totalOrders",
      key: "totalOrders",
      width: 90,
    },
    {
      title: "Spend (VND)",
      dataIndex: "totalSpend",
      key: "totalSpend",
      width: 140,
      render: (value: number) => formatCurrency.format(value),
    },
    {
      title: "Last Login",
      dataIndex: "lastLoginAt",
      key: "lastLoginAt",
      width: 150,
      render: (lastLoginAt?: string) => formatDateTime(lastLoginAt),
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            onClick={() => openEditModal(record)}
            disabled={isForbidden || record.isDeleted}
          >
            Edit
          </Button>
          <Popconfirm
            title="Soft delete customer"
            description="This action only marks the account as deleted."
            okText="Delete"
            cancelText="Cancel"
            disabled={isForbidden || record.isDeleted}
            onConfirm={() => void handleSoftDelete(record.id)}
          >
            <Button size="small" danger disabled={isForbidden || record.isDeleted}>
              Delete
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
            Customer Users
          </Title>
          <Paragraph className="mb-0!" type="secondary">
            Manage customer accounts with status updates and soft delete.
          </Paragraph>
        </div>
        <Button type="primary" onClick={openCreateModal} disabled={isForbidden}>
          Add Customer
        </Button>
      </div>

      {isForbidden ? (
        <Alert
          type="warning"
          showIcon
          message="Your account does not have permission to manage customer users."
          description="Only roles with customer management permission can access this screen."
        />
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <Text type="secondary">Total Records</Text>
          <Title level={3} className="mb-0! mt-1!">
            {total}
          </Title>
        </Card>
        <Card>
          <Text type="secondary">Active (current page)</Text>
          <Title level={3} className="mb-0! mt-1! text-emerald-600!">
            {stats.active}
          </Title>
        </Card>
        <Card>
          <Text type="secondary">Inactive (current page)</Text>
          <Title level={3} className="mb-0! mt-1!">
            {stats.inactive}
          </Title>
        </Card>
        <Card>
          <Text type="secondary">Banned (current page)</Text>
          <Title level={3} className="mb-0! mt-1! text-red-600!">
            {stats.banned}
          </Title>
        </Card>
      </div>

      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px_180px_110px]">
          <Input
            value={searchText}
            allowClear
            placeholder="Search by name, email, phone"
            onChange={(event) => setSearchText(event.target.value)}
            onPressEnter={handleSearch}
          />
          <Select
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={handleStatusFilterChange}
          />
          <Select
            value={deletedFilter}
            options={DELETED_FILTER_OPTIONS}
            onChange={handleDeletedFilterChange}
          />
          <Button onClick={handleSearch}>Search</Button>
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
            showTotal: (value) => `Total ${value} customers`,
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
        title={editingCustomer ? "Edit Customer" : "Create Customer"}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={() => void handleSaveCustomer()}
        okText={editingCustomer ? "Update" : "Create"}
        cancelText="Cancel"
        okButtonProps={{ loading: saving }}
        destroyOnHidden
      >
        <Form<CustomerFormValues> form={form} layout="vertical">
          <Form.Item
            label="Full Name"
            name="fullName"
            rules={[
              { required: true, message: "Please enter full name" },
              { min: 2, message: "Full name must be at least 2 characters" },
            ]}
          >
            <Input placeholder="Enter full name" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Please enter email" },
              { type: "email", message: "Email is invalid" },
            ]}
          >
            <Input placeholder="customer@rioshop.com" />
          </Form.Item>

          <Form.Item
            label="Phone"
            name="phone"
            rules={[
              { required: true, message: "Please enter phone" },
              { pattern: /^[0-9]{10,11}$/, message: "Phone must be 10-11 digits" },
            ]}
          >
            <Input placeholder="0987654321" />
          </Form.Item>

          {editingCustomer ? null : (
            <Form.Item
              label="Password"
              name="password"
              rules={[
                { required: true, message: "Please enter password" },
                { min: 6, message: "Password must be at least 6 characters" },
              ]}
            >
              <Input.Password placeholder="Enter password" />
            </Form.Item>
          )}

          <Form.Item
            label="Status"
            name="status"
            rules={[{ required: true, message: "Please select status" }]}
          >
            <Select
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "banned", label: "Banned" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
