import { Alert, Button, Form, Input, Typography } from "antd";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../../stores/authStore";
import { AuthShell } from "../components/AuthShell";

type AdminLoginFormValues = {
  email: string;
  password: string;
};

const { Paragraph } = Typography;

export function AdminLoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const loginAdmin = useAuthStore((state) => state.loginAdmin);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (values: AdminLoginFormValues) => {
    setErrorMessage(null);

    try {
      await loginAdmin(values);
      navigate(searchParams.get("redirect") ?? "/admin/dashboard", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Đăng nhập quản trị thất bại");
    }
  };

  return (
    <AuthShell
      mode="login"
      title="Đăng nhập quản trị"
      subtitle="Khu vực dành cho quản trị viên RioShop."
      showAuthTabs={false}
    >
      {errorMessage ? <Alert type="error" message={errorMessage} className="mb-4" /> : null}

      <Form<AdminLoginFormValues> layout="vertical" onFinish={handleSubmit} autoComplete="off">
        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: "Vui lòng nhập email" },
            { type: "email", message: "Email không đúng định dạng" },
          ]}
        >
          <Input size="large" placeholder="admin@rioshop.com" />
        </Form.Item>

        <Form.Item
          label="Mật khẩu"
          name="password"
          rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
        >
          <Input.Password size="large" placeholder="Nhập mật khẩu" />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          loading={isLoading}
          block
          size="large"
          className="h-11! rounded-xl! border-0! bg-[#0f3d66]! hover:bg-[#155086]!"
        >
          Vào trang quản trị
        </Button>
      </Form>

      <Paragraph className="mb-0! mt-4! text-center text-slate-500!">
        Bạn là khách mua sắm?{" "}
        <Link to="/login" className="font-medium text-cyan-700">
          Đăng nhập tài khoản người dùng
        </Link>
      </Paragraph>
    </AuthShell>
  );
}
