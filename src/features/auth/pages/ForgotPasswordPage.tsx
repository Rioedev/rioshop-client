import { Alert, Button, Form, Input, Typography } from "antd";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authService } from "../../../services/authService";
import { AuthShell } from "../components/AuthShell";

type ForgotFormValues = {
  email: string;
};

type ResetFormValues = {
  newPassword: string;
  confirmPassword: string;
};

const { Paragraph } = Typography;

export function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [requestLoading, setRequestLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetUserId = useMemo(
    () => searchParams.get("userId") ?? searchParams.get("resetUserId") ?? "",
    [searchParams],
  );
  const resetToken = useMemo(
    () => searchParams.get("token") ?? searchParams.get("resetToken") ?? "",
    [searchParams],
  );
  const isResetMode = Boolean(resetUserId && resetToken);

  const handleRequestReset = async (values: ForgotFormValues) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setRequestLoading(true);
    try {
      await authService.forgotPassword({ email: values.email.trim() });
      setSuccessMessage("Nếu email tồn tại, hệ thống đã gửi hướng dẫn đặt lại mật khẩu.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không gửi được yêu cầu quên mật khẩu");
    } finally {
      setRequestLoading(false);
    }
  };

  const handleResetPassword = async (values: ResetFormValues) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setResetLoading(true);
    try {
      await authService.resetPassword({
        userId: resetUserId,
        resetToken,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      setSuccessMessage("Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay.");
      navigate("/login", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Đặt lại mật khẩu thất bại");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <AuthShell
      mode="login"
      showAuthTabs={false}
      title={isResetMode ? "Đặt lại mật khẩu" : "Quên mật khẩu"}
      subtitle={
        isResetMode
          ? "Nhập mật khẩu mới để kích hoạt lại tài khoản của bạn."
          : "Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu."
      }
    >
      {errorMessage ? <Alert type="error" message={errorMessage} className="mb-4" /> : null}
      {successMessage ? <Alert type="success" message={successMessage} className="mb-4" /> : null}

      {isResetMode ? (
        <Form<ResetFormValues> layout="vertical" onFinish={handleResetPassword} autoComplete="off">
          <Form.Item
            label="Mật khẩu mới"
            name="newPassword"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu mới" },
              { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
            ]}
          >
            <Input.Password size="large" placeholder="Nhập mật khẩu mới" />
          </Form.Item>

          <Form.Item
            label="Xác nhận mật khẩu"
            name="confirmPassword"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Vui lòng nhập lại mật khẩu" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Mật khẩu xác nhận không khớp"));
                },
              }),
            ]}
          >
            <Input.Password size="large" placeholder="Nhập lại mật khẩu mới" />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            loading={resetLoading}
            block
            size="large"
            className="h-11! rounded-xl! border-0! bg-[#0f3d66]! hover:bg-[#155086]!"
          >
            Đặt lại mật khẩu
          </Button>
        </Form>
      ) : (
        <Form<ForgotFormValues> layout="vertical" onFinish={handleRequestReset} autoComplete="off">
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

          <Button
            type="primary"
            htmlType="submit"
            loading={requestLoading}
            block
            size="large"
            className="h-11! rounded-xl! border-0! bg-[#0f3d66]! hover:bg-[#155086]!"
          >
            Gửi hướng dẫn đặt lại
          </Button>
        </Form>
      )}

      <Paragraph className="mb-0! mt-4! text-center text-slate-500!">
        Nhớ mật khẩu rồi?{" "}
        <Link to="/login" className="font-medium text-cyan-700">
          Quay lại đăng nhập
        </Link>
      </Paragraph>
    </AuthShell>
  );
}
