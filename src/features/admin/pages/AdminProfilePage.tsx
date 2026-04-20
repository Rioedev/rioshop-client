import { Alert, Button, Card, Descriptions, Form, Input, Typography, message } from "antd";
import { useState } from "react";
import { authService } from "../../../services/authService";
import { useAuthStore } from "../../../stores/authStore";
import { getErrorMessage } from "../../../utils/errorMessage";

const { Paragraph, Text, Title } = Typography;

type ChangePasswordFormValues = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const ROLE_LABEL_MAP: Record<string, string> = {
  superadmin: "Quản trị tối cao",
  manager: "Quản lý",
  warehouse: "Nhân viên kho",
  sales: "Nhân viên bán hàng",
};

const getRoleLabel = (role?: string) => {
  if (!role) {
    return "Admin";
  }

  return ROLE_LABEL_MAP[role] ?? role;
};

export function AdminProfilePage() {
  const [form] = Form.useForm<ChangePasswordFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const user = useAuthStore((state) => state.user);
  const accountType = useAuthStore((state) => state.accountType);

  const handleChangePassword = async (values: ChangePasswordFormValues) => {
    setIsChangingPassword(true);
    try {
      await authService.changeAdminPassword(values);
      form.resetFields();
      messageApi.success("Đổi mật khẩu thành công.");
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không thể đổi mật khẩu."));
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user || accountType !== "admin") {
    return (
      <div className="space-y-6">
        {contextHolder}
        <Alert
          type="warning"
          showIcon
          message="Không tìm thấy thông tin admin"
          description="Vui lòng đăng nhập lại để truy cập hồ sơ cá nhân."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {contextHolder}

      <div>
        <Title level={3} className="mb-1! mt-0!">
          Hồ sơ cá nhân
        </Title>
        <Paragraph className="mb-0!" type="secondary">
          Quản lý thông tin tài khoản và cập nhật mật khẩu đăng nhập admin.
        </Paragraph>
      </div>

      <div className="grid gap-6">
        <Card title="Thông tin tài khoản">
          <Descriptions
            column={1}
            size="middle"
            labelStyle={{ minWidth: 140 }}
            className="admin-profile-descriptions"
          >
            <Descriptions.Item label="Họ tên">{user.fullName}</Descriptions.Item>
            <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
            <Descriptions.Item label="Vai trò">{getRoleLabel(user.role)}</Descriptions.Item>
            <Descriptions.Item label="Loại tài khoản">
              <Text className="uppercase">{accountType}</Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Đổi mật khẩu">
          <Form<ChangePasswordFormValues>
            form={form}
            layout="vertical"
            autoComplete="off"
            onFinish={handleChangePassword}
          >
            <Form.Item
              label="Mật khẩu hiện tại"
              name="oldPassword"
              rules={[{ required: true, message: "Vui lòng nhập mật khẩu hiện tại." }]}
            >
              <Input.Password placeholder="Nhập mật khẩu hiện tại" />
            </Form.Item>

            <div className="grid gap-4 md:grid-cols-2">
              <Form.Item
                label="Mật khẩu mới"
                name="newPassword"
                rules={[
                  { required: true, message: "Vui lòng nhập mật khẩu mới." },
                  { min: 6, message: "Mật khẩu mới phải có ít nhất 6 ký tự." },
                ]}
              >
                <Input.Password placeholder="Nhập mật khẩu mới" />
              </Form.Item>

              <Form.Item
                label="Xác nhận mật khẩu mới"
                name="confirmPassword"
                dependencies={["newPassword"]}
                rules={[
                  { required: true, message: "Vui lòng xác nhận mật khẩu mới." },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("newPassword") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error("Mật khẩu xác nhận không khớp."));
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="Nhập lại mật khẩu mới" />
              </Form.Item>
            </div>

            <Button type="primary" htmlType="submit" loading={isChangingPassword}>
              Cập nhật mật khẩu
            </Button>
          </Form>
        </Card>
      </div>
    </div>
  );
}
