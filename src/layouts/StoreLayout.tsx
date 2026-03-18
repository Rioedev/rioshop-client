import {
  HeartOutlined,
  LogoutOutlined,
  ProfileOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Input } from "antd";
import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { categoryService } from "../services/categoryService";
import { useAuthStore } from "../stores/authStore";
import { useCartStore } from "../stores/cartStore";
import { useWishlistStore } from "../stores/wishlistStore";

const defaultMenuItems = [
  { label: "Ao thun", category: "ao-thun" },
  { label: "Ao polo", category: "ao-polo" },
  { label: "Quan short", category: "quan-short" },
  { label: "Do tap", category: "do-tap" },
];

const policyItems = ["Doi tra 60 ngay", "Mien phi ship tu 299K", "Ho tro 24/7"];

export function StoreLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const accountType = useAuthStore((state) => state.accountType);
  const logout = useAuthStore((state) => state.logout);

  const cartItems = useCartStore((state) => state.items);
  const wishlistItems = useWishlistStore((state) => state.items);
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [menuItems, setMenuItems] = useState(defaultMenuItems);
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

  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      try {
        const result = await categoryService.getCategories({
          page: 1,
          limit: 8,
          isActive: true,
        });

        if (!active) {
          return;
        }

        const mapped = result.docs
          .filter((item) => item.slug)
          .slice(0, 8)
          .map((item) => ({ label: item.name, category: item.slug }));
        setMenuItems(mapped.length > 0 ? mapped : defaultMenuItems);
      } catch {
        if (active) {
          setMenuItems(defaultMenuItems);
        }
      }
    };

    void loadCategories();

    return () => {
      active = false;
    };
  }, []);

  const onSearch = () => {
    const keyword = searchKeyword.trim();
    navigate(keyword ? `/products?q=${encodeURIComponent(keyword)}` : "/products");
  };

  const isHomePage = location.pathname === "/";

  return (
    <div className="storefront-shell min-h-screen">
      <div className="store-promo-bar">Freeship toan quoc cho don tu 299K | Doi tra mien phi trong 60 ngay</div>

      <header className="store-header">
        <div className="mx-auto w-full max-w-[1880px] px-3 py-4 sm:px-4 xl:px-6">
          <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap">
            <Link to="/" className="store-logo">
              Rio<span>Shop</span>
            </Link>

            <div className="order-3 w-full lg:order-none lg:flex-1">
              <Input
                allowClear
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                onPressEnter={onSearch}
                className="store-search"
                placeholder="Tim ao thun, quan short, combo..."
              />
            </div>

            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <Link to="/wishlist" className="store-icon-link">
                <span className="store-top-icon" title="Yeu thich" aria-label="Yeu thich">
                  <HeartOutlined />
                  {wishlistItems.length > 0 ? <span className="store-cart-count">{wishlistItems.length}</span> : null}
                </span>
              </Link>

              <Link to="/cart" className="store-icon-link">
                <span className="store-top-icon" title="Gio hang" aria-label="Gio hang">
                  <ShoppingCartOutlined />
                  {cartCount > 0 ? <span className="store-cart-count">{cartCount}</span> : null}
                </span>
              </Link>

              {isAuthenticated ? (
                <div className={`store-account-menu ${isAccountMenuOpen ? "is-open" : ""}`} ref={accountMenuRef}>
                  <button
                    type="button"
                    className="store-account-trigger"
                    title="Tai khoan"
                    aria-label="Tai khoan"
                    onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                  >
                    <span className="store-avatar-wrap">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={fullName} className="store-avatar-image" />
                      ) : (
                        <span className="store-avatar-fallback">{initials || "U"}</span>
                      )}
                    </span>
                  </button>
                  <div className="store-user-dropdown">
                    <div className="store-user-dropdown-head">
                      <p className="store-user-dropdown-name">{fullName}</p>
                      <p className="store-user-dropdown-role">{accountType === "admin" ? "Quan tri vien" : "Khach hang"}</p>
                    </div>
                    <Link
                      to="/account"
                      className="store-user-dropdown-item"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      <UserOutlined />
                      Tai khoan cua toi
                    </Link>
                    <Link
                      to="/orders"
                      className="store-user-dropdown-item"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      <ProfileOutlined />
                      Don hang cua toi
                    </Link>
                    {accountType === "admin" ? (
                      <Link
                        to="/admin/dashboard"
                        className="store-user-dropdown-item"
                        onClick={() => setIsAccountMenuOpen(false)}
                      >
                        <UserOutlined />
                        Trang quan tri
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
                      Dang xuat
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`store-user-menu ${isAccountMenuOpen ? "is-open" : ""}`} ref={accountMenuRef}>
                  <button
                    type="button"
                    className="store-top-icon"
                    title="Tai khoan"
                    aria-label="Tai khoan"
                    onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                  >
                    <UserOutlined />
                  </button>
                  <div className="store-user-dropdown">
                    <Link to="/login" className="store-user-dropdown-item" onClick={() => setIsAccountMenuOpen(false)}>
                      Dang nhap
                    </Link>
                    <Link to="/register" className="store-user-dropdown-item" onClick={() => setIsAccountMenuOpen(false)}>
                      Dang ky
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <Link to="/products" className="store-nav-pill">
              Tat ca
            </Link>
            {menuItems.map((item) => (
              <Link key={item.category} to={`/products?category=${item.category}`} className="store-nav-pill">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="store-policy-strip">
        <div className="mx-auto w-full max-w-[1880px] px-3 sm:px-4 xl:px-6">
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

      <main className={`mx-auto w-full max-w-[1880px] px-3 sm:px-4 xl:px-6 ${isHomePage ? "pt-0 pb-6 md:pb-8" : "py-6 md:py-8"}`}>
        <Outlet />
      </main>

      <footer className="store-footer">
        <div className="mx-auto grid w-full max-w-[1880px] gap-8 px-3 py-10 sm:px-4 lg:grid-cols-4 xl:px-6">
          <div>
            <h4 className="store-footer-title">RioShop</h4>
            <p className="store-footer-text">Thời trang tối giản, dễ mặc, dễ sống mỗi ngày.</p>
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
