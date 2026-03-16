import {
  HeartOutlined,
  IdcardOutlined,
  LogoutOutlined,
  ProfileOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Input } from "antd";
import { useEffect, useRef, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { useCartStore } from "../stores/cartStore";

const menuItems = [
  "Áo thun",
  "Quần lót",
  "Quần short",
  "Đồ thể thao",
  "Đồ mặc nhà",
  "Combo tiết kiệm",
];

const policyItems = ["Đổi trả 60 ngày", "Miễn phí ship từ 299K", "Hỗ trợ 24/7"];

export function StoreLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const accountType = useAuthStore((state) => state.accountType);
  const logout = useAuthStore((state) => state.logout);
  const cartItems = useCartStore((state) => state.items);
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const fullName = user?.fullName ?? "";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const avatarUrl = fullName
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0f172a&color=ffffff&bold=true`
    : undefined;

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!accountMenuRef.current) {
        return;
      }

      if (!accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
    };
  }, []);

  return (
    <div className="storefront-shell min-h-screen">
      <div className="store-promo-bar">
        Freeship toàn quốc cho đơn từ 299K | Đổi trả miễn phí trong 60 ngày
      </div>

      <header className="store-header">
        <div className="mx-auto w-full max-w-[1520px] px-4 py-4 sm:px-6 xl:px-10">
          <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap">
            <Link to="/" className="store-logo">
              Rio<span>Shop</span>
            </Link>

            <div className="order-3 w-full lg:order-none lg:flex-1">
              <Input
                allowClear
                className="store-search"
                placeholder="Tìm áo thun, quần lót, combo..."
              />
            </div>

            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="store-top-icon"
                title="Yêu thích"
                aria-label="Yêu thích"
              >
                <HeartOutlined />
              </button>
              <Link to="/cart" className="store-icon-link">
                <span
                  className="store-top-icon"
                  title="Giỏ hàng"
                  aria-label="Giỏ hàng"
                >
                  <ShoppingCartOutlined />
                  {cartCount > 0 ? (
                    <span className="store-cart-count">{cartCount}</span>
                  ) : null}
                </span>
              </Link>

              {isAuthenticated ? (
                <div
                  className={`store-account-menu ${isAccountMenuOpen ? "is-open" : ""}`}
                  ref={accountMenuRef}
                >
                  <button
                    type="button"
                    className="store-account-trigger"
                    title="Tài khoản"
                    aria-label="Tài khoản"
                    onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                  >
                    <span className="store-avatar-wrap">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={fullName}
                          className="store-avatar-image"
                        />
                      ) : (
                        <span className="store-avatar-fallback">
                          {initials || "U"}
                        </span>
                      )}
                    </span>
                  </button>
                  <div className="store-user-dropdown">
                    <div className="store-user-dropdown-head">
                      <p className="store-user-dropdown-name">{fullName}</p>
                      <p className="store-user-dropdown-role">
                        {accountType === "admin"
                          ? "Quản trị viên"
                          : "Khách hàng"}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="store-user-dropdown-item"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      <IdcardOutlined />
                      Quản lý hồ sơ
                    </button>
                    <button
                      type="button"
                      className="store-user-dropdown-item"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      <ProfileOutlined />
                      Đơn hàng của tôi
                    </button>
                    {accountType === "admin" ? (
                      <Link
                        to="/admin/dashboard"
                        className="store-user-dropdown-item"
                        onClick={() => setIsAccountMenuOpen(false)}
                      >
                        <UserOutlined />
                        Trang quản trị
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      className="store-user-dropdown-item"
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        void logout();
                      }}
                    >
                      <LogoutOutlined />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`store-user-menu ${isAccountMenuOpen ? "is-open" : ""}`}
                  ref={accountMenuRef}
                >
                  <button
                    type="button"
                    className="store-top-icon"
                    title="Tài khoản"
                    aria-label="Tài khoản"
                    onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                  >
                    <UserOutlined />
                  </button>
                  <div className="store-user-dropdown">
                    <Link
                      to="/login"
                      className="store-user-dropdown-item"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      Đăng nhập
                    </Link>
                    <Link
                      to="/register"
                      className="store-user-dropdown-item"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      Đăng ký
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {menuItems.map((item) => (
              <button key={item} type="button" className="store-nav-pill">
                {item}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="store-policy-strip">
        <div className="mx-auto w-full max-w-[1520px] px-4 sm:px-6 xl:px-10">
          <div className="flex flex-wrap items-center gap-3 py-3">
            {policyItems.map((item) => (
              <div key={item} className="store-policy-item">
                <span className="store-policy-dot" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1520px] px-4 py-6 sm:px-6 md:py-8 xl:px-10">
        <Outlet />
      </main>

      <footer className="store-footer">
        <div className="mx-auto grid w-full max-w-[1520px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-4 xl:px-10">
          <div>
            <h4 className="store-footer-title">RioShop</h4>
            <p className="store-footer-text">
              Thời trang tối giản, dễ mặc, dễ sống mỗi ngày.
            </p>
          </div>
          <div>
            <h4 className="store-footer-title">Sản phẩm</h4>
            <p className="store-footer-text">Áo thun</p>
            <p className="store-footer-text">Quần short</p>
            <p className="store-footer-text">Đồ tập</p>
          </div>
          <div>
            <h4 className="store-footer-title">Hỗ trợ</h4>
            <p className="store-footer-text">Đổi trả 60 ngày</p>
            <p className="store-footer-text">Chính sách vận chuyển</p>
            <p className="store-footer-text">CSKH 24/7</p>
          </div>
          <div>
            <h4 className="store-footer-title">Kết nối</h4>
            <p className="store-footer-text">Facebook</p>
            <p className="store-footer-text">Instagram</p>
            <p className="store-footer-text">TikTok</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
