import { Button, Card, Col, Input, Row, Select, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { adminProducts, type ProductAdminItem } from "../mockData";

const { Paragraph, Title, Text } = Typography;

const productColumns: ColumnsType<ProductAdminItem> = [
  { title: "SKU", dataIndex: "sku", key: "sku" },
  { title: "Product", dataIndex: "name", key: "name" },
  { title: "Category", dataIndex: "category", key: "category" },
  { title: "Price", dataIndex: "price", key: "price" },
  {
    title: "Stock",
    dataIndex: "stock",
    key: "stock",
    render: (stock: number) => (
      <Text className={stock <= 5 ? "!text-red-500" : "!text-slate-700"}>{stock}</Text>
    ),
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    render: (status: ProductAdminItem["status"]) => (
      <Tag color={status === "Active" ? "green" : "default"}>{status}</Tag>
    ),
  },
];

export function AdminProductsPage() {
  const totalProducts = adminProducts.length;
  const activeProducts = adminProducts.filter((item) => item.status === "Active").length;
  const lowStockCount = adminProducts.filter((item) => item.stock <= 10).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Title level={3} className="!mb-1 !mt-0">
            Product Management
          </Title>
          <Paragraph className="!mb-0" type="secondary">
            Mock data view for admin products. API can be connected in the next step.
          </Paragraph>
        </div>
        <Button type="primary">Add Product</Button>
      </div>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}>
          <Card className="h-full">
            <Text type="secondary">Total Products</Text>
            <Title level={3} className="!mb-0 !mt-1">
              {totalProducts}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="h-full">
            <Text type="secondary">Active</Text>
            <Title level={3} className="!mb-0 !mt-1">
              {activeProducts}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="h-full">
            <Text type="secondary">{"Low Stock (<=10)"}</Text>
            <Title level={3} className="!mb-0 !mt-1 !text-amber-600">
              {lowStockCount}
            </Title>
          </Card>
        </Col>
      </Row>

      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px_140px]">
          <Input placeholder="Search by product name or SKU" />
          <Select
            defaultValue="all"
            options={[
              { value: "all", label: "All Category" },
              { value: "audio", label: "Audio" },
              { value: "accessories", label: "Accessories" },
              { value: "camera", label: "Camera" },
            ]}
          />
          <Button>Export</Button>
        </div>
        <Table<ProductAdminItem>
          rowKey="key"
          columns={productColumns}
          dataSource={adminProducts}
          pagination={false}
        />
      </Card>
    </div>
  );
}
