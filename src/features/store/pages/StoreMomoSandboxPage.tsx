import { Alert, Button, Card, Input, Steps, Typography, message } from "antd";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { StorePageShell, StorePanelFrame, storeButtonClassNames } from "../components/StorePageChrome";

const { Title, Text } = Typography;

const buildReturnUrl = (
  returnUrl: string,
  payload: Record<string, string>,
) => {
  const separator = returnUrl.includes("?") ? "&" : "?";
  const query = new URLSearchParams(payload).toString();
  return `${returnUrl}${separator}${query}`;
};

export function StoreMomoSandboxPage() {
  const [searchParams] = useSearchParams();
  const [messageApi, contextHolder] = message.useMessage();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [agreed, setAgreed] = useState(false);

  const orderId = searchParams.get("orderId") || "";
  const requestId = searchParams.get("requestId") || `${Date.now()}`;
  const amount = Number(searchParams.get("amount") || 0);
  const returnUrl =
    searchParams.get("returnUrl") || `${window.location.origin}/payment/momo-return`;

  const formattedAmount = new Intl.NumberFormat("vi-VN").format(
    Number.isFinite(amount) ? amount : 0,
  );

  const stepItems = useMemo(
    () => [
      { title: "Đăng nhập" },
      { title: "Xác nhận thanh toán" },
      { title: "Xác thực OTP" },
      { title: "Hoàn tất" },
    ],
    [],
  );

  const goToReturn = (isSuccess: boolean) => {
    const resultCode = isSuccess ? "0" : "1006";
    const messageText = isSuccess
      ? "MoMo test payment success"
      : "MoMo test payment cancelled";
    const transId = isSuccess ? `MOCK_${Date.now()}` : "";

    const redirectUrl = buildReturnUrl(returnUrl, {
      orderId,
      requestId,
      amount: String(amount),
      resultCode,
      message: messageText,
      transId,
    });

    window.location.href = redirectUrl;
  };

  const handleLoginStep = () => {
    if (!account.trim() || !password.trim()) {
      messageApi.warning("Vui lòng nhập số điện thoại và mật khẩu.");
      return;
    }

    if (!/^0\d{9,10}$/.test(account.trim())) {
      messageApi.warning("Số điện thoại không hợp lệ.");
      return;
    }

    setStep(1);
  };

  const handleConfirmStep = () => {
    if (!agreed) {
      messageApi.warning("Vui lòng đồng ý thanh toán để tiếp tục.");
      return;
    }
    setStep(2);
  };

  const handleOtpStep = (isSuccess: boolean) => {
    if (isSuccess && otpCode.trim().length < 4) {
      messageApi.warning("Vui lòng nhập OTP hợp lệ.");
      return;
    }

    setSubmitting(true);
    setStep(3);
    window.setTimeout(() => {
      goToReturn(isSuccess);
    }, 600);
  };

  if (!orderId) {
    return (
      <StorePageShell>
        <StorePanelFrame>
          <Alert
            type="error"
            message="Thiếu mã giao dịch thanh toán MoMo test"
            description="Không thể tiếp tục thanh toán. Vui lòng quay lại trang checkout và thử lại."
            showIcon
          />
        </StorePanelFrame>
      </StorePageShell>
    );
  }

  return (
    <StorePageShell>
      {contextHolder}
      <StorePanelFrame className="space-y-6">
        <div className="rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-600 to-fuchsia-700 p-5 text-white">
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-rose-100">Ví MoMo test</p>
          <Title level={3} className="mb-2! mt-2! text-white!">
            Xác nhận thanh toán
          </Title>
          <Text className="text-rose-50!">
            Mô phỏng giao diện ví điện tử theo luồng thực tế để kiểm thử thanh toán.
          </Text>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <Card className="rounded-2xl! border-slate-200!">
            <Steps current={step} items={stepItems} className="mb-4" />

            {step === 0 ? (
              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-sm font-semibold text-slate-700">Số điện thoại MoMo</p>
                  <Input
                    value={account}
                    onChange={(event) => setAccount(event.target.value)}
                    placeholder="Nhập số điện thoại"
                  />
                </div>
                <div>
                  <p className="mb-1 text-sm font-semibold text-slate-700">Mật khẩu</p>
                  <Input.Password
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Nhập mật khẩu"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="primary" className={storeButtonClassNames.primary} onClick={handleLoginStep}>
                    Đăng nhập
                  </Button>
                  <Button className={storeButtonClassNames.secondary} onClick={() => goToReturn(false)}>
                    Hủy giao dịch
                  </Button>
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-3">
                <Alert
                  type="info"
                  showIcon
                  message="Kiểm tra thông tin thanh toán"
                  description="Vui lòng xác nhận số tiền và tiếp tục bằng mã OTP."
                />
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(event) => setAgreed(event.target.checked)}
                  />
                  Tôi đồng ý thanh toán giao dịch này.
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button type="primary" className={storeButtonClassNames.primary} onClick={handleConfirmStep}>
                    Tiếp tục
                  </Button>
                  <Button className={storeButtonClassNames.secondary} onClick={() => goToReturn(false)}>
                    Từ chối
                  </Button>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-3">
                <p className="m-0 text-sm text-slate-600">Nhập mã OTP để hoàn tất xác thực giao dịch.</p>
                <Input
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value)}
                  placeholder="Nhập OTP"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="primary"
                    className={storeButtonClassNames.primary}
                    loading={submitting}
                    onClick={() => handleOtpStep(true)}
                  >
                    Xác nhận thanh toán
                  </Button>
                  <Button
                    className={storeButtonClassNames.secondary}
                    disabled={submitting}
                    onClick={() => handleOtpStep(false)}
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="py-4 text-center">
                <p className="m-0 text-sm text-slate-600">Đang xử lý kết quả thanh toán...</p>
              </div>
            ) : null}
          </Card>

          <Card className="rounded-2xl! border-slate-200!">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Chi tiết giao dịch</p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Nhà cung cấp</span>
                <strong className="text-slate-800">MoMo Sandbox</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Mã đơn hàng</span>
                <strong className="max-w-56 truncate text-right text-slate-800">{orderId}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Mã yêu cầu</span>
                <strong className="max-w-56 truncate text-right text-slate-800">{requestId}</strong>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-900 px-4 py-3 text-white">
              <p className="m-0 text-xs uppercase tracking-[0.12em] text-slate-300">Số tiền thanh toán</p>
              <p className="m-0 mt-1 text-2xl font-black">{formattedAmount} đ</p>
            </div>
            <p className="mt-4 mb-0 text-xs text-slate-500">
              Đây là môi trường kiểm thử nội bộ. Bạn nhập tài khoản test đã được cấp để mô phỏng thanh toán.
            </p>
          </Card>
        </div>
      </StorePanelFrame>
    </StorePageShell>
  );
}
