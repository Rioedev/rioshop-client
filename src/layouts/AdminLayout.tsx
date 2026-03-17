import { Button, Layout, Menu, Typography } from "antd";
import type { ItemType } from "antd/es/menu/interface";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

const { Header, Content, Sider } = Layout;
const { Text, Title } = Typography;

const baseAdminMenuItems: ItemType[] = [
  { key: "/admin/dashboard", label: "Tổng quan" },
  { key: "/admin/orders", label: "Đơn hàng" },
  { key: "/admin/products", label: "Sản phẩm" },
  { key: "/admin/coupons", label: "Mã giảm giá" },
  { key: "/admin/notifications", label: "Thông báo" },
  { key: "/admin/inventories", label: "Tồn kho" },
  { key: "/admin/categories", label: "Danh mục" },
  { key: "/admin/users", label: "Khách hàng" },
  { key: "/admin/brand-config", label: "Cấu hình thương hiệu" },
];

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const canManageAdminAccounts = user?.role === "superadmin" || user?.role === "manager";
  const adminMenuItems: ItemType[] = canManageAdminAccounts
    ? [...baseAdminMenuItems, { key: "/admin/admin-accounts", label: "Tài khoản admin" }]
    : baseAdminMenuItems;

  const activeKey =
    adminMenuItems.find((item) =>
      location.pathname.startsWith(String(item?.key)),
    )?.key ?? "/admin/dashboard";

  return (
    <Layout className="h-screen overflow-hidden">
      <Sider
        breakpoint="lg"
        width={240}
        className="bg-slate-950! h-screen! sticky! left-0 top-0 overflow-y-auto"
      >
        <div className="px-6 py-5">
          <Title level={4} className="mb-0! mt-2! text-white!">
            RioShop
          </Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[String(activeKey)]}
          items={adminMenuItems}
          theme="dark"
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout className="h-screen overflow-hidden">
        <Header className="bg-white! px-6! shadow-sm shrink-0">
          <div className="flex h-full items-center justify-between">
            <Title level={4} className="m-0!">
              Quản lý hệ thống cửa hàng RioShop
            </Title>
            <div className="flex items-center gap-3">
              <Text type="secondary">{user?.fullName ?? "Khách"}</Text>
              <Button
                onClick={async () => {
                  await logout();
                  navigate("/admin/login", { replace: true });
                }}
              >
                Đăng xuất
              </Button>
            </div>
          </div>
        </Header>
        <Content className="bg-slate-100 p-6 overflow-y-auto">
          <div className="min-h-full rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
