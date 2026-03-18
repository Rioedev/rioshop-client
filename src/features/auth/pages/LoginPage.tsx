import { Alert, Button, Checkbox, Form, Input, Typography } from "antd";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../../stores/authStore";
import { AuthShell } from "../components/AuthShell";

type LoginFormValues = {
  email: string;
  password: string;
  remember: boolean;
};

const { Paragraph } = Typography;

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (values: LoginFormValues) => {
    setErrorMessage(null);

    try {
      await login(values);
      navigate(searchParams.get("redirect") ?? "/", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Đăng nhập thất bại");
    }
  };

  return (
    <AuthShell
      mode="login"
      title="Đăng nhập"
      subtitle="Chào mừng bạn quay lại RioShop. Tiếp tục mua sắm ngay."
    >
      {errorMessage ? <Alert type="error" message={errorMessage} className="mb-4" /> : null}

      <Form<LoginFormValues> layout="vertical" onFinish={handleSubmit} autoComplete="off">
        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: "Vui lòng nhập email" },
            { type: "email", message: "Email không đúng định dạng" },
          ]}
        >
          <Input size="large" placeholder="you@example.com" />
        </Form.Item>

        <Form.Item
          label="Mật khẩu"
          name="password"
          rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
        >
          <Input.Password size="large" placeholder="Nhập mật khẩu" />
        </Form.Item>

        <div className="mb-4 flex items-center justify-between">
          <Form.Item name="remember" valuePropName="checked" className="mb-0!">
            <Checkbox>Ghi nhớ đăng nhập</Checkbox>
          </Form.Item>
          <Link to="#" className="text-sm text-cyan-700">
            Quên mật khẩu?
          </Link>
        </div>

        <Button
          type="primary"
          htmlType="submit"
          loading={isLoading}
          block
          size="large"
          className="h-11! rounded-xl! border-0! bg-[#0f3d66]! hover:bg-[#155086]!"
        >
          Đăng nhập
        </Button>
      </Form>

      <Paragraph className="mb-0! mt-4! text-center text-slate-500!">
        Chưa có tài khoản?{" "}
        <Link to="/register" className="font-medium text-cyan-700">
          Tạo tài khoản
        </Link>
      </Paragraph>
    </AuthShell>
  );
}

