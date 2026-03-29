import {
  BellOutlined,
  HeartOutlined,
  LogoutOutlined,
  ProfileOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { RefObject } from "react";
import { Link } from "react-router-dom";

type StoreHeaderActionsProps = {
  isAuthenticated: boolean;
  accountType?: string | null;
  fullName: string;
  initials: string;
  avatarUrl?: string;
  unreadNotificationCount: number;
  wishlistCount: number;
  cartCount: number;
  isAccountMenuOpen: boolean;
  accountMenuRef: RefObject<HTMLDivElement | null>;
  onToggleAccountMenu: () => void;
  onCloseAccountMenu: () => void;
  onOpenNotificationModal: () => void;
  onLogout: () => void;
};

export function StoreHeaderActions({
  isAuthenticated,
  accountType,
  fullName,
  initials,
  avatarUrl,
  unreadNotificationCount,
  wishlistCount,
  cartCount,
  isAccountMenuOpen,
  accountMenuRef,
  onToggleAccountMenu,
  onCloseAccountMenu,
  onOpenNotificationModal,
  onLogout,
}: StoreHeaderActionsProps) {
  return (
    <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        className="store-icon-link border-none bg-transparent p-0"
        onClick={onOpenNotificationModal}
      >
        <span
          className="store-top-icon"
          title="Thông báo"
          aria-label="Thông báo"
        >
          <BellOutlined />
          {unreadNotificationCount > 0 ? (
            <span className="store-cart-count">{unreadNotificationCount}</span>
          ) : null}
        </span>
      </button>

      <Link to="/wishlist" className="store-icon-link">
        <span className="store-top-icon" title="Yêu thích" aria-label="Yêu thích">
          <HeartOutlined />
          {wishlistCount > 0 ? (
            <span className="store-cart-count">{wishlistCount}</span>
          ) : null}
        </span>
      </Link>

      <Link to="/cart" className="store-icon-link">
        <span className="store-top-icon" title="Giỏ hàng" aria-label="Giỏ hàng">
          <ShoppingCartOutlined />
          {cartCount > 0 ? <span className="store-cart-count">{cartCount}</span> : null}
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
            onClick={onToggleAccountMenu}
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
              <p className="store-user-dropdown-role">
                {accountType === "admin" ? "Quản trị viên" : "Khách hàng"}
              </p>
            </div>
            <Link
              to="/account"
              className="store-user-dropdown-item"
              onClick={onCloseAccountMenu}
            >
              <UserOutlined />
              Tài khoản của tôi
            </Link>
            <button
              type="button"
              className="store-user-dropdown-item"
              onClick={() => {
                onCloseAccountMenu();
                onOpenNotificationModal();
              }}
            >
              <BellOutlined />
              Thông báo của tôi
            </button>
            <Link
              to="/orders"
              className="store-user-dropdown-item"
              onClick={onCloseAccountMenu}
            >
              <ProfileOutlined />
              Đơn hàng của tôi
            </Link>
            {accountType === "admin" ? (
              <Link
                to="/admin/dashboard"
                className="store-user-dropdown-item"
                onClick={onCloseAccountMenu}
              >
                <UserOutlined />
                Trang quản trị
              </Link>
            ) : null}
            <button
              type="button"
              className="store-user-dropdown-item"
              onClick={() => {
                onCloseAccountMenu();
                onLogout();
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
            onClick={onToggleAccountMenu}
          >
            <UserOutlined />
          </button>
          <div className="store-user-dropdown">
            <Link
              to="/login"
              className="store-user-dropdown-item"
              onClick={onCloseAccountMenu}
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="store-user-dropdown-item"
              onClick={onCloseAccountMenu}
            >
              Đăng ký
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
