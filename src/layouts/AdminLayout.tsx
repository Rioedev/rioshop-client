import {
  AppstoreOutlined,
  BellOutlined,
  BgColorsOutlined,
  GiftOutlined,
  HomeOutlined,
  InboxOutlined,
  LineChartOutlined,
  LogoutOutlined,
  ShoppingCartOutlined,
  StarOutlined,
  TagsOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import { Badge, Button, Layout, Menu, Typography } from "antd";
import type { ItemType } from "antd/es/menu/interface";
import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { StoreNotificationsModal } from "../features/store/components/StoreNotificationsModal";
import { subscribeUserNotifications } from "../services/socketClient";
import { useAuthStore } from "../stores/authStore";
import { useNotificationStore } from "../stores/notificationStore";

const { Header, Content, Sider } = Layout;
const { Text, Title } = Typography;

const baseAdminMenuItems: ItemType[] = [
  { key: "/admin/dashboard", icon: <HomeOutlined />, label: "Tổng quan" },
  { key: "/admin/orders", icon: <ShoppingCartOutlined />, label: "Đơn hàng" },
  { key: "/admin/products", icon: <AppstoreOutlined />, label: "Sản phẩm" },
  { key: "/admin/reviews", icon: <StarOutlined />, label: "Đánh giá" },
  { key: "/admin/flash-sales", icon: <ThunderboltOutlined />, label: "Flash Sales" },
  {
    key: "/admin/analytics-events",
    icon: <LineChartOutlined />,
    label: "Sự kiện phân tích",
  },
  { key: "/admin/coupons", icon: <GiftOutlined />, label: "Mã giảm giá" },
  { key: "/admin/inventories", icon: <InboxOutlined />, label: "Tồn kho" },
  { key: "/admin/categories", icon: <TagsOutlined />, label: "Danh mục" },
  { key: "/admin/users", icon: <TeamOutlined />, label: "Khách hàng" },
  {
    key: "/admin/brand-config",
    icon: <BgColorsOutlined />,
    label: "Cấu hình thương hiệu",
  },
];

const pageTitleMap: Record<string, string> = {
  "/admin/dashboard": "Tổng quan",
  "/admin/orders": "Đơn hàng",
  "/admin/products": "Sản phẩm",
  "/admin/reviews": "Đánh giá",
  "/admin/flash-sales": "Flash Sales",
  "/admin/analytics-events": "Sự kiện phân tích",
  "/admin/coupons": "Mã giảm giá",
  "/admin/inventories": "Tồn kho",
  "/admin/categories": "Danh mục",
  "/admin/users": "Khách hàng",
  "/admin/brand-config": "Cấu hình thương hiệu",
  "/admin/admin-accounts": "Tài khoản admin",
};

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const accountType = useAuthStore((state) => state.accountType);
  const logout = useAuthStore((state) => state.logout);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const refreshUnreadCount = useNotificationStore((state) => state.refreshUnreadCount);
  const applyRealtimeNotification = useNotificationStore((state) => state.applyRealtimeNotification);
  const resetNotifications = useNotificationStore((state) => state.reset);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isSiderCollapsed, setIsSiderCollapsed] = useState(false);

  const canManageAdminAccounts = user?.role === "superadmin" || user?.role === "manager";
  const adminMenuItems: ItemType[] = canManageAdminAccounts
    ? [
        ...baseAdminMenuItems,
        {
          key: "/admin/admin-accounts",
          icon: <UserSwitchOutlined />,
          label: "Tài khoản admin",
        },
      ]
    : baseAdminMenuItems;

  const activeKey =
    adminMenuItems.find((item) => location.pathname.startsWith(String(item?.key)))?.key ??
    "/admin/dashboard";

  const activePageTitle = useMemo(
    () => pageTitleMap[String(activeKey)] ?? "Bảng điều khiển",
    [activeKey],
  );

  useEffect(() => {
    const principalId = user?.id?.toString().trim();
    if (accountType !== "admin" || !principalId) {
      resetNotifications();
      return;
    }

    void refreshUnreadCount().catch(() => undefined);
    const unsubscribe = subscribeUserNotifications(principalId, (payload) => {
      applyRealtimeNotification(payload);
    });

    return () => {
      unsubscribe();
    };
  }, [accountType, applyRealtimeNotification, refreshUnreadCount, resetNotifications, user?.id]);

  return (
    <Layout className="h-screen overflow-hidden bg-slate-100">
      <Sider
        breakpoint="lg"
        width={248}
        collapsedWidth={76}
        className="sticky! left-0 top-0 h-screen! overflow-y-auto bg-slate-950!"
        onCollapse={(collapsed) => setIsSiderCollapsed(collapsed)}
      >
        <div
          className={`border-b border-slate-800 transition-all ${
            isSiderCollapsed ? "px-2 py-4 text-center" : "px-6 py-5"
          }`}
        >
          {isSiderCollapsed ? (
            <div className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-sm font-black text-white">
              RS
            </div>
          ) : (
            <>
              <Text className="text-[11px]! font-semibold! uppercase! tracking-[0.16em]! text-slate-500!">
                Admin Console
              </Text>
              <Title level={4} className="mb-0! mt-1! text-white!">
                RioShop
              </Title>
            </>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[String(activeKey)]}
          items={adminMenuItems}
          theme="dark"
          className="border-r-0! bg-transparent! px-2 pt-3"
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout className="h-screen overflow-hidden">
        <Header className="h-auto! shrink-0 border-b border-slate-200 bg-white! px-6! py-3! leading-normal! shadow-sm">
          <div className="flex min-h-[52px] items-center justify-between gap-4">
            <div className="leading-tight">
              <Text className="text-xs! uppercase! tracking-[0.12em]! text-slate-500!">Trang đang xem</Text>
              <Title level={4} className="m-0! text-slate-900! leading-tight!">
                {activePageTitle}
              </Title>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="text"
                className="rounded-full! border border-slate-200! bg-slate-50! px-3!"
                onClick={() => setIsNotificationsModalOpen(true)}
              >
                <span className="inline-flex items-center gap-2">
                  <Badge count={unreadCount} overflowCount={99} size="small">
                    <BellOutlined className="text-base" />
                  </Badge>
                  <span className="hidden md:inline">Thông báo</span>
                </span>
              </Button>

              <div className="min-w-[190px] rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-right leading-tight">
                <Text className="block text-[11px]! uppercase! tracking-[0.08em]! text-slate-500! leading-tight!">Tài khoản</Text>
                <Text strong className="block text-sm! text-slate-800! leading-tight!">
                  {user?.fullName ?? "Khách"}
                </Text>
              </div>

              <Button
                icon={<LogoutOutlined />}
                className="rounded-full!"
                onClick={async () => {
                  await logout();
                  navigate("/admin/login", { replace: true });
                }}
              >
                Đăng xuất
              </Button>
            </div>
          </div>
        </Header>

        <Content className="overflow-y-auto bg-slate-100 p-6">
          <div className="min-h-full rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
            <Outlet />
          </div>
        </Content>
      </Layout>

      <StoreNotificationsModal
        open={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
      />
    </Layout>
  );
}
