import { Layout, Menu, Input, Badge } from "antd";
import {
  ShoppingCartOutlined,
  UserOutlined,
  SearchOutlined,
} from "@ant-design/icons";

const { Header } = Layout;

const ClientHeader = () => {
  return (
    <Header
      style={{
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 50px",
        borderBottom: "1px solid #eee",
      }}
    >
      {/* Logo */}
      <div style={{ fontWeight: 700, fontSize: 22 }}>
        RIOSHOP
      </div>

      {/* Menu */}
      <Menu
        mode="horizontal"
        items={[
          { key: "1", label: "Nam" },
          { key: "2", label: "Nữ" },
          { key: "3", label: "Thể thao" },
          { key: "4", label: "Phụ kiện" },
        ]}
      />

      {/* Search + Icon */}
      <div style={{ display: "flex", gap: 20, justifyContent: "center", alignItems: "center" }}>
        <Input
          placeholder="Tìm sản phẩm..."
          prefix={<SearchOutlined />}
          style={{ width: 250 }}
        />

        <UserOutlined style={{ fontSize: 20 }} />

        <Badge count={2}>
          <ShoppingCartOutlined style={{ fontSize: 20 }} />
        </Badge>
      </div>
    </Header>
  );
};

export default ClientHeader;