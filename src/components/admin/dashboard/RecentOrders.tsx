import { Table, Empty } from "antd";
import { CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";

const columns = [
  {
    title: "Order ID",
    dataIndex: "id",
    key: "id",
    render: (id: string) => (
      <span className="font-semibold text-gray-900">{id}</span>
    ),
  },
  {
    title: "Customer",
    dataIndex: "customer",
    key: "customer",
  },
  {
    title: "Total",
    dataIndex: "total",
    key: "total",
    render: (total: string) => (
      <span className="font-semibold text-green-600">{total}</span>
    ),
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    render: (status: string) => (
      <div className="flex items-center gap-2">
        {status === "Completed" ? (
          <>
            <CheckCircleOutlined className="text-green-600" />
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-600">
              {status}
            </span>
          </>
        ) : (
          <>
            <ClockCircleOutlined className="text-yellow-600" />
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-600">
              {status}
            </span>
          </>
        )}
      </div>
    ),
  },
];

const data = [
  {
    key: "1",
    id: "#1001",
    customer: "Nguyen Van A",
    total: "1,200,000đ",
    status: "Completed",
  },
  {
    key: "2",
    id: "#1002",
    customer: "Tran Thi B",
    total: "800,000đ",
    status: "Pending",
  },
];

const RecentOrders = () => {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Đơn hàng gần đây</h3>
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        className="custom-table"
        locale={{
          emptyText: (
            <Empty description="Không có dữ liệu" style={{ marginTop: 20 }} />
          ),
        }}
      />
    </div>
  );
};

export default RecentOrders;
