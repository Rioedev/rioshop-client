import { Button, Layout, Menu, Typography } from "antd";
import type { ItemType } from "antd/es/menu/interface";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

const { Header, Content, Sider } = Layout;
const { Text, Title } = Typography;

const adminMenuItems: ItemType[] = [
  { key: "/admin/dashboard", label: "Dashboard" },
  { key: "/admin/orders", label: "Orders" },
  { key: "/admin/products", label: "Products" },
];

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const activeKey =
    adminMenuItems.find((item) => location.pathname.startsWith(String(item?.key)))
      ?.key ?? "/admin/dashboard";

  return (
    <Layout className="min-h-screen">
      <Sider breakpoint="lg" width={240} className="!bg-slate-950">
        <div className="px-6 py-5">
          <Text className="!text-xs !uppercase !tracking-[0.2em] !text-slate-400">
            RioShop
          </Text>
          <Title level={4} className="!mb-0 !mt-2 !text-white">
            Admin Panel
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
      <Layout>
        <Header className="!bg-white !px-6 shadow-sm">
          <div className="flex h-full items-center justify-between">
            <Title level={4} className="!m-0">
              Quan tri he thong
            </Title>
            <div className="flex items-center gap-3">
              <Text type="secondary">{user?.fullName ?? "Guest"}</Text>
              <Button
                onClick={async () => {
                  await logout();
                  navigate("/login", { replace: true });
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        </Header>
        <Content className="bg-slate-100 p-6">
          <div className="min-h-[calc(100vh-112px)] rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
