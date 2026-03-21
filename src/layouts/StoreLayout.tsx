import {
  HeartOutlined,
  LogoutOutlined,
  PhoneOutlined,
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
  { label: "Ao Polo", category: "ao-polo" },
  { label: "Ao so mi", category: "ao-so-mi" },
  { label: "Quan jeans", category: "quan-jeans" },
  { label: "Do the thao", category: "do-the-thao" },
];

const policyItems = ["Mien phi doi tra 60 ngay", "Mien phi ship tu 499K", "Kiem tra hang truoc khi nhan", "Hotline 1900 8888"];

const utilityLinks = [
  { label: "He thong cua hang", href: "/products" },
  { label: "Tra cuu don hang", href: "/orders" },
  { label: "Rio Member", href: "/account" },
];

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
      <div className="store-promo-bar">FLASH SALE 10H - 14H | Giam den 50% + Freeship toan quoc</div>

      <div className="store-utility-strip">
        <div className="mx-auto flex w-full max-w-[1620px] items-center justify-between gap-3 px-3 py-2 sm:px-4 xl:px-6">
          <div className="store-utility-links">
            {utilityLinks.map((item) => (
              <Link key={item.label} to={item.href}>
                {item.label}
              </Link>
            ))}
          </div>
          <div className="store-utility-hotline">
            <PhoneOutlined />
            <span>CSKH 1900 8888</span>
          </div>
        </div>
      </div>

      <header className="store-header">
        <div className="mx-auto w-full max-w-[1620px] px-3 py-4 sm:px-4 xl:px-6">
          <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap">
            <Link to="/" className="store-logo">
              RIO<span>SHOP</span>
            </Link>

            <div className="order-3 w-full lg:order-0 lg:flex-1">
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

          <nav className="store-main-nav mt-3 flex gap-2 overflow-x-auto pb-1">
            <Link to="/" className="store-nav-pill">
              Trang chu
            </Link>
            <Link to="/products?sort=best_selling" className="store-nav-pill">
              Ban chay
            </Link>
            <Link to="/products?sort=newest" className="store-nav-pill">
              Moi ve
            </Link>
            <Link to="/products?sort=price_desc" className="store-nav-pill">
              Flash sale
            </Link>
            <Link to="/products" className="store-nav-pill">
              Tat ca san pham
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
        <div className="mx-auto w-full max-w-[1620px] px-3 sm:px-4 xl:px-6">
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

      <main className={`mx-auto w-full max-w-[1620px] px-3 sm:px-4 xl:px-6 ${isHomePage ? "pt-0 pb-6 md:pb-8" : "py-6 md:py-8"}`}>
        <Outlet />
      </main>

      <footer className="store-footer">
        <div className="mx-auto grid w-full max-w-[1620px] gap-8 px-3 py-10 sm:px-4 lg:grid-cols-4 xl:px-6">
          <div>
            <h4 className="store-footer-title">RIO SHOP</h4>
            <p className="store-footer-text">Thoi trang hang ngay cho gia dinh Viet.</p>
            <p className="store-footer-text">Hotline: 1900 8888</p>
            <p className="store-footer-text">Email: cskh@rioshop.vn</p>
          </div>
          <div>
            <h4 className="store-footer-title">Ve chung toi</h4>
            <p className="store-footer-text">Gioi thieu</p>
            <p className="store-footer-text">He thong cua hang</p>
            <p className="store-footer-text">Tuyen dung</p>
          </div>
          <div>
            <h4 className="store-footer-title">Chinh sach</h4>
            <p className="store-footer-text">Đổi trả 60 ngày</p>
            <p className="store-footer-text">Chính sách vận chuyển</p>
            <p className="store-footer-text">Bao mat thong tin</p>
          </div>
          <div>
            <h4 className="store-footer-title">Ho tro khach hang</h4>
            <p className="store-footer-text">Huong dan mua hang</p>
            <p className="store-footer-text">Tra cuu don hang</p>
            <p className="store-footer-text">Cau hoi thuong gap</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
