import { Button, Input } from "antd";
import { Link, Outlet } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

const menuItems = [
  "Ao thun",
  "Quan lot",
  "Quan short",
  "Do the thao",
  "Do mac nha",
  "Combo tiet kiem",
];

const policyItems = [
  "Doi tra 60 ngay",
  "Free ship tu 299K",
  "Ho tro 24/7",
];

export function StoreLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const accountType = useAuthStore((state) => state.accountType);
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="storefront-shell min-h-screen">
      <div className="store-promo-bar">
        Freeship toan quoc cho don tu 299K | Doi tra mien phi trong 60 ngay
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
                placeholder="Tim ao thun, quan lot, combo..."
              />
            </div>

            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <button type="button" className="store-icon-button">
                Yeu thich
              </button>
              <button type="button" className="store-icon-button">
                Gio hang
              </button>

              {isAuthenticated ? (
                <>
                  <span className="hidden text-sm font-medium text-slate-700 sm:inline">
                    {user?.fullName}
                  </span>
                  {accountType === "admin" ? (
                    <Link to="/admin/dashboard">
                      <Button type="primary" className="!rounded-full !bg-slate-900 !px-4">
                        Admin
                      </Button>
                    </Link>
                  ) : null}
                  <Button className="!rounded-full" onClick={() => void logout()}>
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button className="!rounded-full">Login</Button>
                  </Link>
                  <Link to="/register">
                    <Button type="primary" className="!rounded-full !bg-slate-900 !px-4">
                      Register
                    </Button>
                  </Link>
                  <Link to="/admin/login">
                    <Button className="!rounded-full">Admin Login</Button>
                  </Link>
                </>
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
    </div>
  );
}
