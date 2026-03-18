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
        kicker="Tai khoan Rio"
        title="Ban chua dang nhap"
        description="Dang nhap de quan ly thong tin tai khoan, dia chi giao hang va lich su mua sam."
        action={
          <Link to="/login">
            <Button type="primary" className={storeButtonClassNames.primary}>
              Dang nhap
            </Button>
          </Link>
        }
      />
    );
  }

  const profileCards = [
    {
      label: "Ho ten",
      value: user.fullName,
      description: "Ten hien thi duoc su dung cho hoa don va thong bao.",
    },
    {
      label: "Email",
      value: user.email,
      description: "Kenh nhan cap nhat don hang va thong tin uu dai.",
    },
    {
      label: "So dien thoai",
      value: user.phone || "Dang cap nhat",
      description: "Su dung cho xac nhan giao hang va ho tro nhanh.",
    },
    {
      label: "Loai tai khoan",
      value: user.accountType,
      description: "Trang thai hien tai cua tai khoan tren he thong RioShop.",
    },
  ];

  return (
    <StorePageShell>
      <StoreHeroSection
        kicker="Tai khoan Rio"
        title={`Xin chao, ${user.fullName}`}
        description="Theo doi don hang, cap nhat thong tin ca nhan va quay lai nhanh voi cac san pham ban da luu."
      >
        <div className="store-page-actions">
          <Link to="/orders">
            <Button type="primary" className={storeButtonClassNames.primary}>
              Don hang cua toi
            </Button>
          </Link>
          <Link to="/wishlist">
            <Button className={storeButtonClassNames.secondary}>San pham yeu thich</Button>
          </Link>
          <Button className={storeButtonClassNames.danger} onClick={() => void logout()}>
            Dang xuat
          </Button>
        </div>
      </StoreHeroSection>

      <StorePanelSection
        kicker="Thong tin ca nhan"
        title="Ho so tai khoan"
        action={
          <StoreInlineNote
            title="Tai khoan dang hoat dong"
            description="Thong tin nay duoc su dung de dong bo dia chi giao hang, lich su mua va cac thong bao uu dai."
          />
        }
      >
        <StoreInfoGrid items={profileCards} />
      </StorePanelSection>
    </StorePageShell>
  );
}
