import {
  AppstoreOutlined,
  BellOutlined,
  BgColorsOutlined,
  DownOutlined,
  GiftOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  InboxOutlined,
  LineChartOutlined,
  LogoutOutlined,
  MoonOutlined,
  ReadOutlined,
  SettingOutlined,
  SunOutlined,
  ShoppingCartOutlined,
  StarOutlined,
  TagsOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UserOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import { Avatar, Badge, Button, Dropdown, Layout, Menu, Typography, message } from "antd";
import type { ItemType } from "antd/es/menu/interface";
import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppNotificationsModal } from "../components/notifications/AppNotificationsModal";
import { subscribeUserNotifications } from "../services/socketClient";
import { useAuthStore } from "../stores/authStore";
import { useNotificationStore } from "../stores/notificationStore";
import "../styles/admin-darkmode.scss";

const { Header, Content, Sider } = Layout;
const { Text, Title } = Typography;
const ADMIN_THEME_STORAGE_KEY = "rioshop_admin_theme";

const baseAdminMenuItems: ItemType[] = [
  { key: "/admin/dashboard", icon: <HomeOutlined />, label: "Tổng quan" },
  { key: "/admin/categories", icon: <TagsOutlined />, label: "Danh mục" },
  { key: "/admin/products", icon: <AppstoreOutlined />, label: "Sản phẩm" },
  { key: "/admin/inventories", icon: <InboxOutlined />, label: "Tồn kho" },
  { key: "/admin/orders", icon: <ShoppingCartOutlined />, label: "Đơn hàng" },
  { key: "/admin/reviews", icon: <StarOutlined />, label: "Đánh giá" },
  {
    key: "/admin/flash-sales",
    icon: <ThunderboltOutlined />,
    label: "Flash Sales",
  },
  { key: "/admin/coupons", icon: <GiftOutlined />, label: "Mã giảm giá" },
  { key: "/admin/users", icon: <TeamOutlined />, label: "Khách hàng" },
  {
    key: "/admin/analytics-events",
    icon: <LineChartOutlined />,
    label: "Analytics Events",
  },
  { key: "/admin/blogs", icon: <ReadOutlined />, label: "Blog" },
  {
    key: "/admin/brand-config",
    icon: <BgColorsOutlined />,
    label: "Cấu hình thương hiệu",
  },
];

const pageTitleMap: Record<string, string> = {
  "/admin/dashboard": "Tổng quan",
  "/admin/categories": "Danh mục",
  "/admin/products": "Sản phẩm",
  "/admin/inventories": "Tồn kho",
  "/admin/orders": "Đơn hàng",
  "/admin/reviews": "Đánh giá",
  "/admin/flash-sales": "Flash Sales",
  "/admin/coupons": "Mã giảm giá",
  "/admin/users": "Khách hàng",
  "/admin/analytics-events": "Analytics Events",
  "/admin/blogs": "Blog",
  "/admin/brand-config": "Cấu hình thương hiệu",
  "/admin/admin-accounts": "Tài khoản admin",
};

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const user = useAuthStore((state) => state.user);
  const accountType = useAuthStore((state) => state.accountType);
  const logout = useAuthStore((state) => state.logout);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const refreshUnreadCount = useNotificationStore(
    (state) => state.refreshUnreadCount,
  );
  const applyRealtimeNotification = useNotificationStore(
    (state) => state.applyRealtimeNotification,
  );
  const resetNotifications = useNotificationStore((state) => state.reset);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] =
    useState(false);
  const [isSiderCollapsed, setIsSiderCollapsed] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(ADMIN_THEME_STORAGE_KEY) === "dark";
  });

  const canManageAdminAccounts =
    user?.role === "superadmin" || user?.role === "manager";
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
    adminMenuItems.find((item) =>
      location.pathname.startsWith(String(item?.key)),
    )?.key ?? "/admin/dashboard";

  const activePageTitle = useMemo(
    () => pageTitleMap[String(activeKey)] ?? "Bảng điều khiển",
    [activeKey],
  );

  const userFullName = user?.fullName ?? "Admin";
  const userEmail = user?.email ?? "admin@rioshop.com";
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    userFullName,
  )}&background=e2e8f0&color=0f172a&bold=true`;

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ADMIN_THEME_STORAGE_KEY, isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("admin-dark-mode", isDarkMode);
    return () => {
      document.body.classList.remove("admin-dark-mode");
    };
  }, [isDarkMode]);

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
  }, [
    accountType,
    applyRealtimeNotification,
    refreshUnreadCount,
    resetNotifications,
    user?.id,
  ]);

  // Scroll to top when route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <Layout
      className={`admin-shell h-screen overflow-hidden bg-slate-100 ${isDarkMode ? "admin-shell--dark" : ""}`}
      data-admin-theme={isDarkMode ? "dark" : "light"}
    >
      <Sider
        breakpoint="lg"
        width={248}
        collapsedWidth={76}
        className="admin-sider sticky! left-0 top-0 h-screen! overflow-y-auto bg-slate-950!"
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

      <Layout className={`h-screen overflow-hidden ${isDarkMode ? "bg-slate-950" : ""}`}>
        <Header
          className={`admin-header h-auto! shrink-0 border-b px-6! py-3! leading-normal! ${
            isDarkMode
              ? "border-slate-700 bg-slate-900! shadow-none"
              : "border-slate-200 bg-white! shadow-sm"
          }`}
        >
          {contextHolder}
          <div className="flex min-h-13 items-center justify-between gap-4">
            <div className="leading-tight">
              <Text className={`text-xs! uppercase! tracking-[0.12em]! ${isDarkMode ? "text-slate-400!" : "text-slate-500!"}`}>
                Trang đang xem
              </Text>
              <Title level={4} className={`m-0! leading-tight! ${isDarkMode ? "text-slate-100!" : "text-slate-900!"}`}>
                {activePageTitle}
              </Title>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="text"
                className={`admin-top-icon-btn h-10! w-10! rounded-full! border p-0! ${
                  isDarkMode
                    ? "border-slate-700! bg-slate-800! text-slate-200! hover:border-slate-600! hover:bg-slate-700!"
                    : "border-slate-200! bg-slate-50! text-slate-500! hover:border-slate-300! hover:bg-white!"
                }`}
                onClick={() => setIsDarkMode((prev) => !prev)}
                aria-label="Chuyển giao diện"
              >
                {isDarkMode ? <SunOutlined className="text-base" /> : <MoonOutlined className="text-base" />}
              </Button>

              <Button
                type="text"
                className={`admin-top-icon-btn h-10! w-10! rounded-full! border p-0! ${
                  isDarkMode
                    ? "border-slate-700! bg-slate-800! text-slate-200! hover:border-slate-600! hover:bg-slate-700!"
                    : "border-slate-200! bg-slate-50! text-slate-600! hover:border-slate-300! hover:bg-white!"
                }`}
                onClick={() => setIsNotificationsModalOpen(true)}
                aria-label="Thông báo"
              >
                <Badge count={unreadCount} overflowCount={99} size="small">
                  <BellOutlined className="text-base" />
                </Badge>
              </Button>

              <Dropdown
                trigger={["click"]}
                open={isProfileMenuOpen}
                onOpenChange={setIsProfileMenuOpen}
                placement="bottomRight"
                dropdownRender={() => (
                  <div className={`admin-profile-dropdown w-72 rounded-2xl border p-4 shadow-xl ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-700"}`}>
                    <div className={`mb-3 border-b pb-3 ${isDarkMode ? "border-slate-700" : "border-slate-100"}`}>
                      <p className={`m-0 text-xl font-bold leading-tight ${isDarkMode ? "text-slate-100" : "text-slate-700"}`}>
                        {userFullName}
                      </p>
                      <p className={`m-0 mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{userEmail}</p>
                    </div>

                    <div className="space-y-1">
                      <Button
                        type="text"
                        className={`w-full justify-start! rounded-lg! px-2! ${isDarkMode ? "text-slate-100! hover:bg-slate-800!" : "text-slate-700!"}`}
                        icon={<UserOutlined />}
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          messageApi.info("Trang chỉnh hồ sơ sẽ được bổ sung sớm.");
                        }}
                      >
                        Edit profile
                      </Button>
                      <Button
                        type="text"
                        className={`w-full justify-start! rounded-lg! px-2! ${isDarkMode ? "text-slate-100! hover:bg-slate-800!" : "text-slate-700!"}`}
                        icon={<SettingOutlined />}
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          navigate("/admin/brand-config");
                        }}
                      >
                        Account settings
                      </Button>
                      <Button
                        type="text"
                        className={`w-full justify-start! rounded-lg! px-2! ${isDarkMode ? "text-slate-100! hover:bg-slate-800!" : "text-slate-700!"}`}
                        icon={<InfoCircleOutlined />}
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          messageApi.info("Mục hỗ trợ sẽ được cập nhật trong bản tới.");
                        }}
                      >
                        Support
                      </Button>
                    </div>

                    <div className={`my-3 border-t ${isDarkMode ? "border-slate-700" : "border-slate-200"}`} />

                    <Button
                      type="text"
                      danger
                      className="w-full justify-start! rounded-lg! px-2!"
                      icon={<LogoutOutlined />}
                      onClick={() => void handleLogout()}
                    >
                      Sign out
                    </Button>
                  </div>
                )}
              >
                <button
                  type="button"
                  className={`admin-profile-trigger inline-flex items-center gap-2 rounded-full border border-transparent bg-transparent px-1 py-1 text-left transition ${isDarkMode ? "hover:border-slate-700 hover:bg-slate-800" : "hover:border-slate-200 hover:bg-slate-50"}`}
                >
                  <Avatar src={avatarUrl} size={38}>
                    {userFullName.charAt(0).toUpperCase()}
                  </Avatar>
                  <span className={`hidden text-sm font-semibold sm:inline ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>
                    {userFullName}
                  </span>
                  <DownOutlined className={`text-xs ${isDarkMode ? "text-slate-300" : "text-slate-500"}`} />
                </button>
              </Dropdown>
            </div>
          </div>
        </Header>

        <Content className={`admin-content overflow-y-auto p-6 ${isDarkMode ? "bg-slate-950" : "bg-slate-100"}`}>
          <div
            className={`admin-main-surface min-h-full rounded-2xl border p-5 md:p-6 ${
              isDarkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"
            }`}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>

      <AppNotificationsModal
        open={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
      />
    </Layout>
  );
}

