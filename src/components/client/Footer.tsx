import { Layout } from "antd";

const { Footer } = Layout;

const ClientFooter = () => {
  return (
    <Footer style={{ background: "#111", color: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h3>Rioshop</h3>
          <p>Thời trang tối giản - Giá tốt</p>
        </div>

        <div>
          <h4>Hỗ trợ</h4>
          <p>Chính sách đổi trả</p>
          <p>Liên hệ</p>
        </div>

        <div>
          <h4>Kết nối</h4>
          <p>Facebook</p>
          <p>Instagram</p>
        </div>
      </div>
    </Footer>
  );
};

export default ClientFooter;