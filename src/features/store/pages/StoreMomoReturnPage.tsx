import { Button, Result, Spin } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { StorePageShell, StorePanelFrame, storeButtonClassNames } from "../components/StorePageChrome";
import { paymentService } from "../../../services/paymentService";

type ReturnState = {
  status: "loading" | "success" | "failed";
  title: string;
  subtitle: string;
  orderId?: string;
};

const resolveOrderId = (value: unknown) => {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object" && value !== null && "_id" in value) {
    const maybeId = (value as { _id?: string })._id;
    return maybeId || "";
  }
  return "";
};

export function StoreMomoReturnPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<ReturnState>({
    status: "loading",
    title: "Đang xử lý kết quả MoMo test",
    subtitle: "Vui lòng đợi trong giây lát...",
  });

  const payload = useMemo(
    () => Object.fromEntries(searchParams.entries()),
    [searchParams],
  );

  useEffect(() => {
    let active = true;

    const processReturn = async () => {
      if (Object.keys(payload).length === 0) {
        if (active) {
          setState({
            status: "failed",
            title: "Không nhận được dữ liệu trả về từ MoMo",
            subtitle: "Bạn có thể quay lại danh sách đơn hàng để kiểm tra trạng thái thanh toán.",
          });
        }
        return;
      }

      try {
        const payment = await paymentService.processWebhook("momo", payload);
        if (!active) {
          return;
        }

        const status = (payment.status || "pending").toLowerCase();
        const orderId = resolveOrderId(payment.orderId);

        if (status === "success") {
          setState({
            status: "success",
            title: "Thanh toán MoMo test thành công",
            subtitle: "Đơn hàng đã được cập nhật trạng thái thanh toán.",
            orderId,
          });
          return;
        }

        if (status === "pending") {
          setState({
            status: "failed",
            title: "Giao dịch đang chờ xác nhận",
            subtitle: "Hệ thống đã ghi nhận giao dịch, vui lòng kiểm tra lại trong danh sách đơn hàng.",
            orderId,
          });
          return;
        }

        setState({
          status: "failed",
          title: "Thanh toán MoMo test chưa thành công",
          subtitle: "Bạn có thể thử thanh toán lại trong phần đơn hàng.",
          orderId,
        });
      } catch (error) {
        if (!active) {
          return;
        }

        const messageText = error instanceof Error ? error.message : "Không thể xử lý kết quả thanh toán";
        setState({
          status: "failed",
          title: "Không xử lý được kết quả MoMo",
          subtitle: messageText,
        });
      }
    };

    void processReturn();

    return () => {
      active = false;
    };
  }, [payload]);

  const orderLink = state.orderId ? `/orders` : "/orders";

  return (
    <StorePageShell>
      <StorePanelFrame>
        {state.status === "loading" ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <Spin size="large" />
            <p className="m-0 text-sm text-slate-500">Đang đồng bộ kết quả thanh toán...</p>
          </div>
        ) : (
          <Result
            status={state.status === "success" ? "success" : "warning"}
            title={state.title}
            subTitle={state.subtitle}
            extra={[
              <Link key="orders" to={orderLink} state={state.orderId ? { orderId: state.orderId } : undefined}>
                <Button type="primary" className={storeButtonClassNames.primary}>
                  Xem đơn hàng
                </Button>
              </Link>,
              <Button key="home" className={storeButtonClassNames.secondary} onClick={() => navigate("/")}>
                Về trang chủ
              </Button>,
            ]}
          />
        )}
      </StorePanelFrame>
    </StorePageShell>
  );
}
