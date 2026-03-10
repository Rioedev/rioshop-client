import { Button, Layout, Typography } from "antd";
import { Link, Outlet } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

const { Header, Content } = Layout;
const { Text, Title } = Typography;

export function StoreLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <Layout className="min-h-screen bg-slate-50">
      <Header className="!bg-white !px-6 shadow-sm">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between">
          <Title level={4} className="!m-0">
            RioShop
          </Title>
          <div className="flex items-center gap-4">
            <Text type="secondary">Giao dien nguoi dung</Text>
            {isAuthenticated ? (
              <>
                <Text>{user?.fullName}</Text>
                <Link to="/admin/dashboard">
                  <Button type="primary">Admin</Button>
                </Link>
                <Button onClick={() => void logout()}>Logout</Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button>Login</Button>
                </Link>
                <Link to="/register">
                  <Button type="primary">Register</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </Header>
      <Content className="mx-auto w-full max-w-6xl p-6">
        <div className="min-h-[calc(100vh-112px)]">
          <Outlet />
        </div>
      </Content>
    </Layout>
  );
}
