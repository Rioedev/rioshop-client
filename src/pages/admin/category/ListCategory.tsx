import { useEffect, useState } from "react";
import {
  Table,
  Button,
  Tag,
  Image,
  Space,
  Popconfirm,
  message,
  Pagination,
  Input,
  Empty,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { Link } from "react-router-dom";
import {
  getCategories,
  deleteCategory,
} from "../../../services/category.service";
import type { ICategory } from "../../../types/category.type";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from "@ant-design/icons";

const PAGE_SIZE = 10;

const ListCategory = () => {
  const [data, setData] = useState<ICategory[]>([]);
  const [page, setPage] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchCategories = async (pageNumber = 1) => {
    try {
      setLoading(true);
      const res = await getCategories(pageNumber, PAGE_SIZE);

      setData(res.docs);
      setTotalDocs(res.totalDocs);
      setPage(res.page || 1);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      message.error("Lỗi khi tải danh mục");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories(1);
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      message.success("Xoá thành công");

      // Nếu xoá xong mà page hiện tại rỗng thì lùi lại 1 trang
      if (data.length === 1 && page > 1) {
        fetchCategories(page - 1);
      } else {
        fetchCategories(page);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      message.error("Xoá thất bại");
    }
  };

  const columns: ColumnsType<ICategory> = [
    {
      title: "Ảnh",
      dataIndex: "image",
      key: "image",
      width: 80,
      render: (image) =>
        image?.url ? (
          <Image
            src={image.url}
            width={70}
            height={70}
            className="rounded-lg object-cover shadow-sm"
          />
        ) : (
          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
            Không ảnh
          </div>
        ),
    },
    {
      title: "Tên danh mục",
      dataIndex: "name",
      key: "name",
      render: (name) => (
        <span className="font-semibold text-gray-900">{name}</span>
      ),
    },
    {
      title: "Slug",
      dataIndex: "slug",
      key: "slug",
      render: (slug) => (
        <span className="text-gray-500 text-sm font-mono bg-gray-100 px-2 py-1 rounded">
          {slug}
        </span>
      ),
    },
    {
      title: "Thứ tự",
      dataIndex: "sortOrder",
      key: "sortOrder",
      align: "center",
      render: (sortOrder) => (
        <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm\">
          {sortOrder}
        </span>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) =>
        status === "active" ? (
          <Tag icon={<span>✓</span>} color="success" className="!border-0">
            Hoạt động
          </Tag>
        ) : (
          <Tag color="error" className="!border-0">
            Không hoạt động
          </Tag>
        ),
    },
    {
      title: "Hành động",
      key: "action",
      width: 200,
      render: (_, record) => (
        <Space size="middle">
          <Link to={`/admin/category/detail/${record._id}`}>
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              className="!text-blue-600 hover:!text-blue-700"
            >
              Xem
            </Button>
          </Link>

          <Link to={`/admin/categories/edit/${record._id}`}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              className="!text-indigo-600 hover:!text-indigo-700"
            >
              Sửa
            </Button>
          </Link>

          <Popconfirm
            title="Xóa danh mục"
            description="Bạn có chắc chắn muốn xóa danh mục này?"
            onConfirm={() => handleDelete(record._id)}
            okText="Xóa"
            cancelText="Huỷ"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              className="hover:!bg-red-50"
            >
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Danh sách danh mục
        </h1>
        <p className="text-gray-600">
          Quản lý các danh mục sản phẩm của cửa hàng
        </p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">
        {/* Toolbar */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <Input.Search
            placeholder="Tìm kiếm danh mục..."
            allowClear
            className="!w-80"
            size="large"
          />
          <Link to="create">
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              className="!bg-indigo-600 hover:!bg-indigo-700 !border-none !font-semibold"
            >
              Thêm danh mục
            </Button>
          </Link>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={data}
          rowKey="_id"
          loading={loading}
          pagination={false}
          className="custom-admin-table"
          locale={{
            emptyText: (
              <Empty
                description="Không có danh mục"
                style={{ paddingTop: 40, paddingBottom: 40 }}
              />
            ),
          }}
        />

        {/* Pagination */}
        <div className="flex justify-end mt-8 pt-6 border-t border-gray-200">
          <Pagination
            current={page}
            total={totalDocs}
            pageSize={PAGE_SIZE}
            showSizeChanger={false}
            onChange={(page) => fetchCategories(page)}
            className="!text-gray-700"
          />
        </div>
      </div>
    </div>
  );
};

export default ListCategory;
