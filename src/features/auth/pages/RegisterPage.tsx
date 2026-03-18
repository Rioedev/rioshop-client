import { Alert, Button, Form, Input, Typography } from "antd";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../../stores/authStore";
import { AuthShell } from "../components/AuthShell";

type RegisterFormValues = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const { Paragraph } = Typography;

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (values: RegisterFormValues) => {
    setErrorMessage(null);

    try {
      await register(values);
      navigate(searchParams.get("redirect") ?? "/", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Đăng ký thất bại");
    }
  };

  return (
    <AuthShell
      mode="register"
      title="Đăng ký"
      subtitle="Tạo tài khoản để đặt hàng nhanh hơn và nhận ưu đãi thành viên."
    >
      {errorMessage ? <Alert type="error" message={errorMessage} className="mb-4" /> : null}

      <Form<RegisterFormValues> layout="vertical" onFinish={handleSubmit} autoComplete="off">
        <Form.Item
          label="Họ và tên"
          name="fullName"
          rules={[
            { required: true, message: "Vui lòng nhập họ và tên" },
            { min: 2, message: "Họ và tên phải có ít nhất 2 ký tự" },
          ]}
        >
          <Input size="large" placeholder="Nguyễn Văn A" />
        </Form.Item>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Form.Item
            label="Số điện thoại"
            name="phone"
            rules={[
              { required: true, message: "Vui lòng nhập số điện thoại" },
              { pattern: /^[0-9]{10,11}$/, message: "Số điện thoại phải gồm 10-11 chữ số" },
            ]}
          >
            <Input size="large" placeholder="0987654321" />
          </Form.Item>

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
        </div>

        <Form.Item
          label="Mật khẩu"
          name="password"
          rules={[
            { required: true, message: "Vui lòng nhập mật khẩu" },
            { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
          ]}
        >
          <Input.Password size="large" placeholder="Nhập mật khẩu" />
        </Form.Item>

        <Form.Item
          label="Xác nhận mật khẩu"
          name="confirmPassword"
          dependencies={["password"]}
          rules={[
            { required: true, message: "Vui lòng xác nhận mật khẩu" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("Mật khẩu xác nhận không khớp"));
              },
            }),
          ]}
        >
          <Input.Password size="large" placeholder="Nhập lại mật khẩu" />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          loading={isLoading}
          block
          size="large"
          className="h-11! rounded-xl! border-0! bg-[#0f3d66]! hover:bg-[#155086]!"
        >
          Tạo tài khoản
        </Button>
      </Form>

      <Paragraph className="mb-0! mt-4! text-center text-slate-500!">
        Đã có tài khoản?{" "}
        <Link to="/login" className="font-medium text-cyan-700">
          Đăng nhập ngay
        </Link>
      </Paragraph>
    </AuthShell>
  );
}

