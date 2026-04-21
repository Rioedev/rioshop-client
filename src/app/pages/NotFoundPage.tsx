import { Button, Result, Space, Typography } from "antd";
import { useNavigate } from "react-router-dom";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <Result
        status="404"
        title="404"
        subTitle="Trang bạn tìm không tồn tại hoặc đã được di chuyển."
        extra={
          <Space size="middle">
            <Button type="primary" onClick={() => navigate("/")}>
              Về trang chủ
            </Button>
            <Button onClick={() => navigate(-1)}>Quay lại</Button>
          </Space>
        }
      >
        <Typography.Text type="secondary">
          Nếu bạn nghi ngờ đây là lỗi hệ thống, vui lòng liên hệ bộ phận hỗ trợ.
        </Typography.Text>
      </Result>
    </div>
  );
}
