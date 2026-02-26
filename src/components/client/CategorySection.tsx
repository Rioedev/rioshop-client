import { Row, Col, Card } from "antd";

const CategorySection = () => {
  const categories = [
    { name: "Áo thun", img: "https://source.unsplash.com/400x400/?tshirt" },
    { name: "Quần jean", img: "https://source.unsplash.com/400x400/?jeans" },
    { name: "Áo khoác", img: "https://source.unsplash.com/400x400/?jacket" },
    { name: "Phụ kiện", img: "https://source.unsplash.com/400x400/?fashion" },
  ];

  return (
    <div style={{ padding: "50px" }}>
      <h2>Danh mục nổi bật</h2>
      <Row gutter={[16, 16]}>
        {categories.map((item) => (
          <Col span={6} key={item.name}>
            <Card
              hoverable
              cover={<img src={item.img} height={250} />}
            >
              <h3 style={{ textAlign: "center" }}>
                {item.name}
              </h3>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default CategorySection;