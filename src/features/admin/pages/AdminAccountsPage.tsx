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
  type AdminAccount,
  type CreateAdminAccountPayload,
  type UpdateAdminAccountPayload,
} from "../../../services/adminAccountService";
import { useAdminAccountStore } from "../../../stores/adminAccountStore";
import { useAuthStore } from "../../../stores/authStore";
import { getErrorMessage } from "../../../utils/errorMessage";

const { Paragraph, Title, Text } = Typography;

type AdminAccountFormValues = {
  email: string;
  password: string;
  fullName: string;
  role: AdminRole;
  isActive: boolean;
};
type AccountStatusFilter = "all" | "active" | "inactive";

const STAFF_ROLES: AdminRole[] = ["warehouse", "cs", "marketer", "sales"];
const ALL_ROLES: AdminRole[] = ["superadmin", "manager", ...STAFF_ROLES];
const ACCOUNT_STATUS_OPTIONS: { value: AccountStatusFilter; label: string }[] = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "active", label: "Đang hoạt động" },
  { value: "inactive", label: "Ngừng hoạt động" },
];

const ROLE_LABEL_MAP: Record<AdminRole, string> = {
  superadmin: "Quản trị tối cao",
  manager: "Quản lý",
  warehouse: "Nhân viên kho",
  cs: "Nhân viên chăm sóc khách hàng",
  marketer: "Nhân viên marketing",
  sales: "Nhân viên bán hàng",
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

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<AccountStatusFilter>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AdminAccount | null>(null);
  const accounts = useAdminAccountStore((state) => state.accounts);
  const loading = useAdminAccountStore((state) => state.loading);
  const saving = useAdminAccountStore((state) => state.saving);
  const isForbidden = useAdminAccountStore((state) => state.isForbidden);
  const loadAdminAccounts = useAdminAccountStore((state) => state.loadAdminAccounts);
  const createAdminAccount = useAdminAccountStore((state) => state.createAdminAccount);
  const updateAdminAccount = useAdminAccountStore((state) => state.updateAdminAccount);
  const deleteAdminAccount = useAdminAccountStore((state) => state.deleteAdminAccount);

  const canManageAdminAccounts = currentUser?.role === "superadmin" || currentUser?.role === "manager";
  const roleOptions = useMemo(() => getAllowedRoleOptions(currentUser?.role), [currentUser?.role]);

  useEffect(() => {
    void loadAdminAccounts().catch((error) => {
      messageApi.error(getErrorMessage(error));
    });
  }, [loadAdminAccounts, messageApi]);

  const filteredAccounts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return accounts.filter((item) => {
      const matchedKeyword =
        keyword.length === 0 ||
        item.fullName.toLowerCase().includes(keyword) ||
        item.email.toLowerCase().includes(keyword) ||
        ROLE_LABEL_MAP[item.role].toLowerCase().includes(keyword);

      const matchedStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.isActive) ||
        (statusFilter === "inactive" && !item.isActive);

      return matchedKeyword && matchedStatus;
    });
  }, [accounts, searchText, statusFilter]);

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

      if (editingAccount) {
        const payload: UpdateAdminAccountPayload = {
          fullName: values.fullName.trim(),
          role: values.role,
          isActive: values.isActive,
        };
        await updateAdminAccount(editingAccount.id, payload);
        messageApi.success("Cập nhật tài khoản admin thành công");
      } else {
        const payload: CreateAdminAccountPayload = {
          email: values.email.trim().toLowerCase(),
          password: values.password,
          fullName: values.fullName.trim(),
          role: values.role,
        };
        await createAdminAccount(payload);
        messageApi.success("Tạo tài khoản admin thành công");
      }

      closeModal();
    } catch (error) {
      if (error instanceof Error && "errorFields" in error) {
        return;
      }
      messageApi.error(getErrorMessage(error));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAdminAccount(id);
      messageApi.success("Xóa tài khoản admin thành công");
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  };

  const columns: ColumnsType<AdminAccount> = [
    {
      title: "Họ tên",
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
      title: "Vai trò",
      dataIndex: "role",
      key: "role",
      width: 170,
      render: (role: AdminRole) => <Tag color="blue">{ROLE_LABEL_MAP[role]}</Tag>,
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 130,
      render: (isActive: boolean) => (
        <Tag color={isActive ? "green" : "default"}>{isActive ? "Đang hoạt động" : "Ngừng hoạt động"}</Tag>
      ),
    },
    {
      title: "Lần đăng nhập cuối",
      dataIndex: "lastLoginAt",
      key: "lastLoginAt",
      width: 160,
      render: (lastLoginAt?: string) => formatDateTime(lastLoginAt),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 180,
      render: (_, record) => {
        const canManageRecord = canManageRole(currentUser?.role, record.role);
        const isOwnAccount = currentUser?.id === record.id;
        const disabled = !canManageRecord || isOwnAccount || isForbidden;

        return (
          <Space>
            <Button size="small" onClick={() => openEditModal(record)} disabled={disabled}>
              Sửa
            </Button>
            <Popconfirm
              title="Xóa tài khoản admin"
              description="Hành động này sẽ vô hiệu hóa tài khoản admin"
              okText="Xóa"
              cancelText="Hủy"
              disabled={disabled}
              onConfirm={() => void handleDelete(record.id)}
            >
              <Button size="small" danger disabled={disabled}>
                Xóa
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
            Tài khoản admin
          </Title>
          <Paragraph className="mb-0!" type="secondary">
            Superadmin quản lý tất cả vai trò. Manager chỉ quản lý các vai trò nhân viên.
          </Paragraph>
        </div>
        <Button type="primary" onClick={openCreateModal} disabled={!canManageAdminAccounts || isForbidden}>
          Thêm admin
        </Button>
      </div>

      {!canManageAdminAccounts || isForbidden ? (
        <Alert
          type="warning"
          showIcon
          message="Bạn không có quyền quản lý tài khoản admin."
          description="Chỉ superadmin và manager mới được sử dụng màn hình này."
        />
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <Text type="secondary">Tổng tài khoản</Text>
          <Title level={3} className="mb-0! mt-1!">
            {accounts.length}
          </Title>
        </Card>
        <Card>
          <Text type="secondary">Đang hoạt động</Text>
          <Title level={3} className="mb-0! mt-1! text-emerald-600!">
            {stats.active}
          </Title>
        </Card>
        <Card>
          <Text type="secondary">Quản trị tối cao / Quản lý</Text>
          <Title level={3} className="mb-0! mt-1!">
            {stats.superadmin + stats.manager}
          </Title>
        </Card>
        <Card>
          <Text type="secondary">Tài khoản nhân viên</Text>
          <Title level={3} className="mb-0! mt-1!">
            {stats.staff}
          </Title>
        </Card>
      </div>

      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
          <Input
            allowClear
            value={searchText}
            placeholder="Tìm theo họ tên, email, vai trò..."
            onChange={(event) => setSearchText(event.target.value)}
          />
          <Select
            value={statusFilter}
            options={ACCOUNT_STATUS_OPTIONS}
            onChange={(value) => setStatusFilter(value)}
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
            showTotal: (value) => `Tổng ${value} tài khoản admin`,
          }}
        />
      </Card>

      <Modal
        title={editingAccount ? "Sửa tài khoản admin" : "Tạo tài khoản admin"}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={() => void handleSave()}
        okText={editingAccount ? "Cập nhật" : "Tạo mới"}
        cancelText="Hủy"
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
                  { required: true, message: "Vui lòng nhập email" },
                  { type: "email", message: "Email không hợp lệ" },
                ]}
              >
                <Input placeholder="admin@rioshop.com" />
              </Form.Item>

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
            </>
          )}

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
            label="Vai trò"
            name="role"
            rules={[{ required: true, message: "Vui lòng chọn vai trò" }]}
          >
            <Select options={roleOptions} />
          </Form.Item>

          {editingAccount ? (
            <Form.Item label="Trạng thái" name="isActive" valuePropName="checked">
              <Switch checkedChildren="Đang hoạt động" unCheckedChildren="Ngừng hoạt động" />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>
    </div>
  );
}


