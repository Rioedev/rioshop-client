import { Layout } from "antd";
import ClientHeader from "../client/Header";
import ClientFooter from "../client/Footer";
import { Outlet } from "react-router-dom";

const { Content } = Layout;

const ClientLayout = () => {
  return (
    <Layout>
      <ClientHeader />
      <Content>
        <Outlet />
      </Content>
      <ClientFooter />
    </Layout>
  );
};

export default ClientLayout;