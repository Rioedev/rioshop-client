import { Row, Col, Card, Button } from "antd";

const ProductSection = () => {
  const products = Array.from({ length: 8 });

  return (
    <div style={{ padding: "50px" }}>
      <h2>Sản phẩm nổi bật</h2>
      <Row gutter={[16, 16]}>
        {products.map((_, index) => (
          <Col span={6} key={index}>
            <Card
              hoverable
              cover={
                <img
                  src="https://source.unsplash.com/400x400/?clothes"
                  height={250}
                />
              }
            >
              <h3>Áo thun cotton</h3>
              <p>199.000đ</p>
              <Button type="primary" block>
                Thêm vào giỏ
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default ProductSection;