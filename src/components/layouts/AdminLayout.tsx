import { Layout, Menu, Avatar, Input, Dropdown } from "antd";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  DashboardOutlined,
  ShoppingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  ProductOutlined,
  LogoutOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useState } from "react";

const { Header, Sider, Content } = Layout;

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const userMenuItems = [
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: "Cài đặt",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Đăng xuất",
    },
  ];

  return (
    <Layout className="h-screen">
      {/* Sidebar */}
      <Sider
        collapsible
        collapsed={collapsed}
        trigger={null}
        className="!bg-gradient-to-b !from-slate-900 !to-slate-800 shadow-lg"
        width={260}
      >
        <div className="text-white text-lg font-bold px-6 py-6 border-b border-slate-700 flex items-center justify-center">
          {collapsed ? (
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
              RS
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                RS
              </div>
              <span>Rioshop Admin</span>
            </div>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={(item) => navigate(item.key)}
          className="!bg-transparent !border-none"
          style={{
            background: "transparent",
            borderColor: "transparent",
          }}
          items={[
            {
              key: "/admin",
              icon: <DashboardOutlined className="text-lg" />,
              label: <span className="font-medium">Dashboard</span>,
            },
            {
              key: "/admin/categories",
              icon: <ProductOutlined className="text-lg" />,
              label: <span className="font-medium">Danh mục</span>,
            },
            {
              key: "/admin/products",
              icon: <ShoppingOutlined className="text-lg" />,
              label: <span className="font-medium">Sản phẩm</span>,
            },
          ]}
        />
      </Sider>

      {/* Main Layout */}
      <Layout>
        {/* Header */}
        <Header className="!bg-white flex items-center justify-between px-8 shadow-md border-b border-gray-200">
          <div
            className="text-2xl cursor-pointer hover:text-indigo-600 transition-colors"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>

          <div className="flex items-center gap-6">
            <Input
              placeholder="Tìm kiếm..."
              className="!w-80 !h-10 !rounded-lg !border-gray-300"
              allowClear
              prefix={<span className="text-gray-400 mr-2">🔍</span>}
            />
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar
                icon={<UserOutlined />}
                className="!bg-indigo-600 cursor-pointer hover:shadow-lg transition-all"
                size="large"
              />
            </Dropdown>
          </div>
        </Header>

        {/* Content */}
        <Content className="p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-auto">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;