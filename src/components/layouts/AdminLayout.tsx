import { Layout, Menu } from "antd";
import { Outlet, useNavigate } from "react-router-dom";
import {
  DashboardOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";

const { Header, Sider, Content } = Layout;

const AdminLayout = () => {
  const navigate = useNavigate();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider>
        <div style={{ color: "#fff", padding: 16, fontSize: 18 }}>
          Rioshop Admin
        </div>

        <Menu
          theme="dark"
          mode="inline"
          onClick={(item) => navigate(item.key)}
          items={[
            {
              key: "/admin",
              icon: <DashboardOutlined />,
              label: "Dashboard",
            },
            {
              key: "/admin/products",
              icon: <ShoppingOutlined />,
              label: "Products",
            },
          ]}
        />
      </Sider>

      <Layout>
        <Header style={{ background: "#fff" }}>
          Admin Panel
        </Header>
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;