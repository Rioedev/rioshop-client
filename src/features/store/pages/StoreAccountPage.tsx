import { Button } from "antd";
import { Link } from "react-router-dom";
import {
  StoreEmptyState,
  StoreHeroSection,
  StoreInfoGrid,
  StoreInlineNote,
  StorePageShell,
  StorePanelSection,
  storeButtonClassNames,
} from "../components/StorePageChrome";
import { useAuthStore } from "../../../stores/authStore";

export function StoreAccountPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  if (!isAuthenticated || !user) {
    return (
      <StoreEmptyState
        kicker="Tài khoản Rio"
        title="Bạn chưa đăng nhập"
        description="Đăng nhập để quản lý thông tin tài khoản, địa chỉ giao hàng và lịch sử mua sắm."
        action={
          <Link to="/login">
            <Button type="primary" className={storeButtonClassNames.primary}>
              Đăng nhập
            </Button>
          </Link>
        }
      />
    );
  }

  const profileCards = [
    {
      label: "Họ tên",
      value: user.fullName,
      description: "Tên hiển thị được sử dụng cho hóa đơn và thông báo.",
    },
    {
      label: "Email",
      value: user.email,
      description: "Kênh nhận cập nhật đơn hàng và thông tin ưu đãi.",
    },
    {
      label: "Số điện thoại",
      value: user.phone || "Đang cập nhật",
      description: "Sử dụng cho xác nhận giao hàng và hỗ trợ nhanh.",
    },
    {
      label: "Loại tài khoản",
      value: user.accountType,
      description: "Trạng thái hiện tại của tài khoản trên hệ thống RioShop.",
    },
  ];

  return (
    <StorePageShell>
      <StoreHeroSection
        kicker="Tài khoản Rio"
        title={`Xin chào, ${user.fullName}`}
        description="Theo dõi đơn hàng, cập nhật thông tin cá nhân và quay lại nhanh với các sản phẩm bạn đã lưu."
      >
        <div className="store-page-actions">
          <Link to="/orders">
            <Button type="primary" className={storeButtonClassNames.primary}>
              Đơn hàng của tôi
            </Button>
          </Link>
          <Link to="/wishlist">
            <Button className={storeButtonClassNames.secondary}>Sản phẩm yêu thích</Button>
          </Link>
          <Button className={storeButtonClassNames.danger} onClick={() => void logout()}>
            Đăng xuất
          </Button>
        </div>
      </StoreHeroSection>

      <StorePanelSection
        kicker="Thông tin cá nhân"
        title="Hồ sơ tài khoản"
        action={
          <StoreInlineNote
            title="Tài khoản đang hoạt động"
            description="Thông tin này được sử dụng để đồng bộ địa chỉ giao hàng, lịch sử mua và các thông báo ưu đãi."
          />
        }
      >
        <StoreInfoGrid items={profileCards} />
      </StorePanelSection>
    </StorePageShell>
  );
}

