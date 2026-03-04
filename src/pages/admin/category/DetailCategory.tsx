// pages/admin/category/DetailCategory.tsx

import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getCategoryById } from "../../../services/category.service";
import type { ICategory } from "../../../types/category.type";
import {
  Button,
  Spin,
  Tag,
  Divider,
  Empty,
  Row,
  Col,
  Card,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const DetailCategory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState<ICategory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setLoading(true);
      getCategoryById(id)
        .then(setCategory)
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96">
        <Empty
          description="Không tìm thấy danh mục"
          style={{ marginTop: 50, marginBottom: 50 }}
        />
        <Button
          type="primary"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/admin/categories")}
        >
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/admin/categories")}
            className="!text-gray-600 mb-4"
          >
            Quay lại
          </Button>
          <Title level={2} className="!mb-0">
            Chi tiết danh mục
          </Title>
        </div>
        <Link to={`/admin/categories/edit/${category._id}`}>
          <Button
            type="primary"
            size="large"
            icon={<EditOutlined />}
            className="!bg-indigo-600 hover:!bg-indigo-700 !border-none !rounded-lg"
          >
            Chỉnh sửa
          </Button>
        </Link>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left - Image */}
        <div className="lg:col-span-1">
          <Card className="!rounded-2xl !shadow-md !border-gray-200">
            {category.image?.url ? (
              <img
                src={category.image.url}
                alt={category.name}
                className="w-full h-80 object-cover rounded-xl"
              />
            ) : (
              <div className="w-full h-80 bg-gray-200 rounded-xl flex items-center justify-center">
                <Text type="secondary">Không có ảnh</Text>
              </div>
            )}
          </Card>
        </div>

        {/* Right - Information */}
        <div className="lg:col-span-2">
          <Card className="!rounded-2xl !shadow-md !border-gray-200 !p-8">
            {/* Tên */}
            <div className="mb-8">
              <Text type="secondary" className="text-sm font-semibold">
                TÊN DANH MỤC
              </Text>
              <Title level={3} className="!mt-2 !mb-0">
                {category.name}
              </Title>
            </div>

            <Divider />

            {/* Slug */}
            <Row gutter={[32, 32]}>
              <Col xs={24} sm={12}>
                <Text
                  type="secondary"
                  className="text-sm font-semibold block mb-2"
                >
                  SLUG
                </Text>
                <Text
                  code
                  className="text-gray-700 bg-gray-100 px-3 py-2 rounded-lg inline-block"
                >
                  {category.slug}
                </Text>
              </Col>

              {/* Thứ tự */}
              <Col xs={24} sm={12}>
                <Text
                  type="secondary"
                  className="text-sm font-semibold block mb-2"
                >
                  THỨ TỰ HIỂN THỊ
                </Text>
                <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 rounded-full font-semibold">
                  {category.sortOrder}
                </div>
              </Col>
            </Row>

            <Divider />

            {/* Trạng thái */}
            <Row gutter={[32, 32]}>
              <Col xs={24} sm={12}>
                <Text
                  type="secondary"
                  className="text-sm font-semibold block mb-2"
                >
                  TRẠNG THÁI
                </Text>
                {category.status === "active" ? (
                  <Tag
                    icon={<CheckCircleOutlined />}
                    color="success"
                    className="!text-base !py-1 !px-3 !border-0"
                  >
                    Hoạt động
                  </Tag>
                ) : (
                  <Tag
                    icon={<CloseCircleOutlined />}
                    color="error"
                    className="!text-base !py-1 !px-3 !border-0"
                  >
                    Không hoạt động
                  </Tag>
                )}
              </Col>

              {/* Danh mục cha */}
              {category.parentId && typeof category.parentId !== "string" && (
                <Col xs={24} sm={12}>
                  <Text
                    type="secondary"
                    className="text-sm font-semibold block mb-2"
                  >
                    DANH MỤC CHA
                  </Text>
                  <Text className="text-gray-700">
                    {category.parentId.name}
                  </Text>
                </Col>
              )}
            </Row>

            <Divider />

            {/* Mô tả */}
            <div>
              <Text
                type="secondary"
                className="text-sm font-semibold block mb-2"
              >
                MÔ TẢ
              </Text>
              <Text className="text-gray-700 leading-relaxed block bg-gray-50 p-4 rounded-lg">
                {category.description || (
                  <em className="text-gray-400">Không có mô tả</em>
                )}
              </Text>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DetailCategory;
