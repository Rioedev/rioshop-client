import { Button, Card, Col, Row, Typography } from "antd";

const { Paragraph, Title } = Typography;

const featuredItems = [
  { id: "1", name: "RioPods X", price: "1,690,000 VND" },
  { id: "2", name: "RioMouse Pro", price: "890,000 VND" },
  { id: "3", name: "RioKey TKL", price: "1,290,000 VND" },
];

export function StoreHomePage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-700 p-8 text-white">
        <Title level={2} className="!mb-2 !mt-0 !text-white">
          Giao dien nguoi dung (Storefront)
        </Title>
        <Paragraph className="!mb-0 !text-slate-100">
          Khu vuc nay duoc tach biet hoan toan voi trang quan tri trong route `/admin/*`.
        </Paragraph>
      </div>

      <Row gutter={[16, 16]}>
        {featuredItems.map((item) => (
          <Col key={item.id} xs={24} md={8}>
            <Card>
              <Title level={5}>{item.name}</Title>
              <Paragraph>{item.price}</Paragraph>
              <Button type="primary" block>
                Them vao gio hang
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
