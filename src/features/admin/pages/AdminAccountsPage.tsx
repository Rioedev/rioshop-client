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
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import type { AdminRole } from "../../../services/authService";
import {
  adminAccountService,
  type AdminAccount,
  type CreateAdminAccountPayload,
  type UpdateAdminAccountPayload,
} from "../../../services/adminAccountService";
import { useAuthStore } from "../../../stores/authStore";

const { Paragraph, Title, Text } = Typography;

type AdminAccountFormValues = {
  email: string;
  password: string;
  fullName: string;
  role: AdminRole;
  isActive: boolean;
};

const STAFF_ROLES: AdminRole[] = ["warehouse", "cs", "marketer", "sales"];
const ALL_ROLES: AdminRole[] = ["superadmin", "manager", ...STAFF_ROLES];

const ROLE_LABEL_MAP: Record<AdminRole, string> = {
  superadmin: "Super Admin",
  manager: "Manager",
  warehouse: "Warehouse Staff",
  cs: "Customer Service Staff",
  marketer: "Marketing Staff",
  sales: "Sales Staff",
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

const canManageRole = (actorRole: string | undefined, targetRole: AdminRole) => {
  if (actorRole === "superadmin") return true;
  if (actorRole === "manager") return STAFF_ROLES.includes(targetRole);
  return false;
};

const getAllowedRoleOptions = (actorRole: string | undefined): { value: AdminRole; label: string }[] => {
  const roles = actorRole === "superadmin" ? ALL_ROLES : STAFF_ROLES;
  return roles.map((role) => ({
    value: role,
    label: ROLE_LABEL_MAP[role],
  }));
};

export function AdminAccountsPage() {
  const [form] = Form.useForm<AdminAccountFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const currentUser = useAuthStore((state) => state.user);

  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AdminAccount | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  const canManageAdminAccounts = currentUser?.role === "superadmin" || currentUser?.role === "manager";
  const roleOptions = useMemo(() => getAllowedRoleOptions(currentUser?.role), [currentUser?.role]);

  const loadAdminAccounts = async () => {
    setLoading(true);
    try {
      const result = await adminAccountService.getAdminAccounts();
      setAccounts(result);
      setIsForbidden(false);
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 403) {
        setAccounts([]);
        setIsForbidden(true);
      } else {
        messageApi.error(getErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminAccounts();
  }, []);

  const filteredAccounts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return accounts;

    return accounts.filter((item) => {
      return (
        item.fullName.toLowerCase().includes(keyword) ||
        item.email.toLowerCase().includes(keyword) ||
        ROLE_LABEL_MAP[item.role].toLowerCase().includes(keyword)
      );
    });
  }, [accounts, searchText]);

  const stats = useMemo(() => {
    const active = accounts.filter((item) => item.isActive).length;
    const superadmin = accounts.filter((item) => item.role === "superadmin").length;
    const manager = accounts.filter((item) => item.role === "manager").length;
    const staff = accounts.filter((item) => STAFF_ROLES.includes(item.role)).length;

    return { active, superadmin, manager, staff };
  }, [accounts]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
    form.resetFields();
  };

  const openCreateModal = () => {
    setEditingAccount(null);
    form.resetFields();
    form.setFieldsValue({
      role: currentUser?.role === "superadmin" ? "manager" : "warehouse",
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (account: AdminAccount) => {
    setEditingAccount(account);
    form.setFieldsValue({
      email: account.email,
      fullName: account.fullName,
      role: account.role,
      isActive: account.isActive,
      password: "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      if (editingAccount) {
        const payload: UpdateAdminAccountPayload = {
          fullName: values.fullName.trim(),
          role: values.role,
          isActive: values.isActive,
        };
        await adminAccountService.updateAdminAccount(editingAccount.id, payload);
        messageApi.success("Admin account updated successfully");
      } else {
        const payload: CreateAdminAccountPayload = {
          email: values.email.trim().toLowerCase(),
          password: values.password,
          fullName: values.fullName.trim(),
          role: values.role,
        };
        await adminAccountService.createAdminAccount(payload);
        messageApi.success("Admin account created successfully");
      }

      closeModal();
      await loadAdminAccounts();
    } catch (error) {
      if (error instanceof Error && "errorFields" in error) {
        return;
      }
      messageApi.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setSaving(true);
      await adminAccountService.deleteAdminAccount(id);
      messageApi.success("Admin account deleted successfully");
      await loadAdminAccounts();
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<AdminAccount> = [
    {
      title: "Full Name",
      dataIndex: "fullName",
      key: "fullName",
      width: 220,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 250,
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      width: 170,
      render: (role: AdminRole) => <Tag color="blue">{ROLE_LABEL_MAP[role]}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      width: 130,
      render: (isActive: boolean) => (
        <Tag color={isActive ? "green" : "default"}>{isActive ? "Active" : "Inactive"}</Tag>
      ),
    },
    {
      title: "Last Login",
      dataIndex: "lastLoginAt",
      key: "lastLoginAt",
      width: 160,
      render: (lastLoginAt?: string) => formatDateTime(lastLoginAt),
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      render: (_, record) => {
        const canManageRecord = canManageRole(currentUser?.role, record.role);
        const isOwnAccount = currentUser?.id === record.id;
        const disabled = !canManageRecord || isOwnAccount || isForbidden;

        return (
          <Space>
            <Button size="small" onClick={() => openEditModal(record)} disabled={disabled}>
              Edit
            </Button>
            <Popconfirm
              title="Delete admin account"
              description="Are you sure you want to delete this account?"
              okText="Delete"
              cancelText="Cancel"
              disabled={disabled}
              onConfirm={() => void handleDelete(record.id)}
            >
              <Button size="small" danger disabled={disabled}>
                Delete
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      {contextHolder}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Title level={3} className="mb-1! mt-0!">
            Admin Accounts
          </Title>
          <Paragraph className="mb-0!" type="secondary">
            Superadmin manages all roles. Manager manages staff roles only.
          </Paragraph>
        </div>
        <Button type="primary" onClick={openCreateModal} disabled={!canManageAdminAccounts || isForbidden}>
          Add Admin
        </Button>
      </div>

      {!canManageAdminAccounts || isForbidden ? (
        <Alert
          type="warning"
          showIcon
          message="You do not have permission to manage admin accounts."
          description="Only superadmin and manager can use this screen."
        />
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <Text type="secondary">Total Accounts</Text>
          <Title level={3} className="mb-0! mt-1!">
            {accounts.length}
          </Title>
        </Card>
        <Card>
          <Text type="secondary">Active</Text>
          <Title level={3} className="mb-0! mt-1! text-emerald-600!">
            {stats.active}
          </Title>
        </Card>
        <Card>
          <Text type="secondary">Superadmin / Manager</Text>
          <Title level={3} className="mb-0! mt-1!">
            {stats.superadmin + stats.manager}
          </Title>
        </Card>
        <Card>
          <Text type="secondary">Staff Accounts</Text>
          <Title level={3} className="mb-0! mt-1!">
            {stats.staff}
          </Title>
        </Card>
      </div>

      <Card>
        <div className="mb-4">
          <Input
            allowClear
            value={searchText}
            placeholder="Search by full name, email, role..."
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>

        <Table<AdminAccount>
          rowKey="id"
          columns={columns}
          dataSource={filteredAccounts}
          loading={loading || saving}
          scroll={{ x: 1180 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showTotal: (value) => `Total ${value} admin accounts`,
          }}
        />
      </Card>

      <Modal
        title={editingAccount ? "Edit Admin Account" : "Create Admin Account"}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={() => void handleSave()}
        okText={editingAccount ? "Update" : "Create"}
        cancelText="Cancel"
        okButtonProps={{ loading: saving }}
        destroyOnHidden
      >
        <Form<AdminAccountFormValues> form={form} layout="vertical">
          {editingAccount ? (
            <Form.Item label="Email">
              <Input value={editingAccount.email} disabled />
            </Form.Item>
          ) : (
            <>
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: "Please enter email" },
                  { type: "email", message: "Email is invalid" },
                ]}
              >
                <Input placeholder="admin@rioshop.com" />
              </Form.Item>

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
            </>
          )}

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
            label="Role"
            name="role"
            rules={[{ required: true, message: "Please select role" }]}
          >
            <Select options={roleOptions} />
          </Form.Item>

          {editingAccount ? (
            <Form.Item label="Active" name="isActive" valuePropName="checked">
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>
    </div>
  );
}
