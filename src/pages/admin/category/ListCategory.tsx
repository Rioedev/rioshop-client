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
  Select,
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
  ClearOutlined,
} from "@ant-design/icons";

const PAGE_SIZE = 10;

const ListCategory = () => {
  const [data, setData] = useState<ICategory[]>([]);
  const [page, setPage] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | undefined>();

  const fetchCategories = async (
    pageNumber = 1,
    name = "",
    status?: string,
  ) => {
    try {
      setLoading(true);
      const res = await getCategories(
        pageNumber,
        PAGE_SIZE,
        status as "active" | "inactive" | undefined,
        name,
      );

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
    fetchCategories(1, searchName, filterStatus);
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      message.success("Xoá thành công");

      if (data.length === 1 && page > 1) {
        fetchCategories(page - 1, searchName, filterStatus);
      } else {
        fetchCategories(page, searchName, filterStatus);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      message.error("Xoá thất bại");
    }
  };

  const handleSearch = (value: string) => {
    setSearchName(value);
    setPage(1);
    fetchCategories(1, value, filterStatus);
  };

  const handleStatusFilter = (value: string | undefined) => {
    setFilterStatus(value);
    setPage(1);
    fetchCategories(1, searchName, value);
  };

  const handleClearFilters = () => {
    setSearchName("");
    setFilterStatus(undefined);
    setPage(1);
    fetchCategories(1, "", undefined);
  };

  const columns: ColumnsType<ICategory> = [
    {
      title: "ID",
      dataIndex: "_id",
      key: "_id",
      width: 120,
      render: (_id) => (
        <span className="text-gray-600 text-xs font-mono bg-purple-50 px-2 py-1 rounded border border-purple-200">
          {_id?.substring(0, 8)}...
        </span>
      ),
    },
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
          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-sm">
            Không ảnh
          </div>
        ),
    },
    {
      title: "Tên danh mục",
      dataIndex: "name",
      key: "name",
      width: 200,
      render: (name) => (
        <span className="font-semibold text-gray-900">{name}</span>
      ),
    },
    {
      title: "Slug",
      dataIndex: "slug",
      key: "slug",
      width: 120,
      render: (slug) => (
        <span className="text-gray-600 text-sm font-mono bg-blue-50 px-3 py-1 rounded-md border border-blue-200">
          {slug}
        </span>
      ),
    },
    {
      title: "Thứ tự",
      dataIndex: "sortOrder",
      key: "sortOrder",
      align: "center",
      width: 80,
      render: (sortOrder) => (
        <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm">
          {sortOrder}
        </span>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 140,
      filters: [
        { text: "Hoạt động", value: "active" },
        { text: "Không hoạt động", value: "inactive" },
      ],
      render: (status) =>
        status === "active" ? (
          <Tag icon={<span>✓</span>} color="success" className="!border-0">
            Hoạt động
          </Tag>
        ) : (
          <Tag icon={<span>✕</span>} color="error" className="!border-0">
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

  const hasActiveFilters = searchName || filterStatus;

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
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
            {/* search & filters */}
            <div className="flex flex-wrap gap-4">
              <Input.Search
                placeholder="Tìm kiếm theo tên hoặc mã..."
                allowClear
                size="large"
                value={searchName}
                onChange={(e) => handleSearch(e.target.value)}
                className="!rounded-lg w-full sm:!w-auto"
              />

              <Select
                placeholder="Trạng thái"
                allowClear
                size="large"
                value={filterStatus}
                onChange={handleStatusFilter}
                options={[
                  {
                    label: "Hoạt động",
                    value: "active",
                  },
                  {
                    label: "Không hoạt động",
                    value: "inactive",
                  },
                ]}
                className="!w-full sm:!w-auto !rounded-lg"
              />

              {hasActiveFilters && (
                <Button
                  icon={<ClearOutlined />}
                  size="large"
                  onClick={handleClearFilters}
                  className="!w-full sm:!w-auto !rounded-lg"
                >
                  Xóa bộ lọc
                </Button>
              )}
            </div>

            {/* add button */}
            <Link to="create" className="w-full sm:w-auto">
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                className="!bg-indigo-600 hover:!bg-indigo-700 !border-none !font-semibold !w-full sm:!w-auto !rounded-lg"
              >
                Thêm danh mục
              </Button>
            </Link>
          </div>

          {/* Active filters display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 items-center">
              {searchName && (
                <Tag
                  closable
                  onClose={() => handleSearch("")}
                  className="!text-xs"
                >
                  Tìm kiếm: "{searchName}"
                </Tag>
              )}
              {filterStatus && (
                <Tag
                  closable
                  onClose={() => handleStatusFilter(undefined)}
                  className="!text-xs"
                >
                  Trạng thái:{" "}
                  {filterStatus === "active" ? "Hoạt động" : "Không hoạt động"}
                </Tag>
              )}
            </div>
          )}
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
                description={
                  hasActiveFilters
                    ? "Không có danh mục phù hợp"
                    : "Không có danh mục"
                }
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
            onChange={(pageNum) =>
              fetchCategories(pageNum, searchName, filterStatus)
            }
            className="!text-gray-700"
          />
        </div>
      </div>
    </div>
  );
};

export default ListCategory;
