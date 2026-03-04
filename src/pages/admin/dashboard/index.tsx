import {
  DollarOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";
import StatCard from "../../../components/admin/dashboard/StatCard";
import RevenueChart from "../../../components/admin/dashboard/RevenueChart";
import RecentOrders from "../../../components/admin/dashboard/RecentOrders";

const Dashboard = () => {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Chào mừng quay lại, Admin</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard
          title="Tổng doanh thu"
          value="250,000,000đ"
          icon={<DollarOutlined />}
          color="purple"
        />
        <StatCard
          title="Đơn hàng"
          value="1,245"
          icon={<ShoppingCartOutlined />}
          color="blue"
        />
        <StatCard
          title="Khách hàng"
          value="845"
          icon={<UserOutlined />}
          color="green"
        />
        <StatCard
          title="Sản phẩm"
          value="320"
          icon={<ShoppingOutlined />}
          color="orange"
        />
      </div>

      {/* Chart + Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <div>
          <RecentOrders />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
