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
      className={`admin-shell h-screen overflow-hidden transition-colors duration-300 ${isDarkMode ? "admin-shell--dark bg-slate-950" : "bg-slate-50"}`}
      data-admin-theme={isDarkMode ? "dark" : "light"}
    >
      <Sider
        breakpoint="lg"
        width={264}
        collapsedWidth={80}
        className={`admin-sider z-20 sticky! left-0 top-0 h-screen! overflow-y-auto border-r transition-all duration-300 ${
          isDarkMode ? "border-slate-800 bg-slate-900!" : "border-slate-200/60 bg-white!"
        }`}
        onCollapse={(collapsed) => setIsSiderCollapsed(collapsed)}
      >
        <div
          className={`flex items-center transition-all duration-300 ${
            isSiderCollapsed ? "h-20 justify-center" : "h-20 px-6 gap-3"
          }`}
        >
          {isSiderCollapsed ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 bg-gradient-to-br from-indigo-500 to-indigo-700 text-sm font-black text-white shadow-lg shadow-indigo-500/30">
              RS
            </div>
          ) : (
            <>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 bg-gradient-to-br from-indigo-500 to-indigo-700 text-sm font-black text-white shadow-lg shadow-indigo-500/30">
                RS
              </div>
              <div className="flex flex-col">
                <Title level={4} className={`mb-0! mt-0! leading-none tracking-tight ${isDarkMode ? "text-white!" : "text-slate-900!"}`}>
                  RioShop
                </Title>
                <Text className={`text-[10px]! font-bold! uppercase! tracking-[0.2em]! ${isDarkMode ? "text-slate-400!" : "text-slate-500!"}`}>
                  Admin Console
                </Text>
              </div>
            </>
          )}
        </div>

        <div className="px-3 py-2">
          <Menu
            mode="inline"
            selectedKeys={[String(activeKey)]}
            items={adminMenuItems}
            theme={isDarkMode ? "dark" : "light"}
            className="border-r-0! bg-transparent! admin-menu-upgrade"
            onClick={({ key }) => navigate(key)}
          />
        </div>
      </Sider>

      <Layout className={`h-screen overflow-hidden transition-colors duration-300 ${isDarkMode ? "bg-slate-950" : "bg-slate-50"}`}>
        <Header
          className={`admin-header z-10 h-auto! shrink-0 px-8! py-4! leading-normal! transition-all duration-300 ${
            isDarkMode
              ? "border-b border-slate-800/80! bg-slate-900/80! backdrop-blur-md shadow-none"
              : "border-b border-slate-200/80! bg-white/90! backdrop-blur-md shadow-xs"
          }`}
        >
          {contextHolder}
          <div className="flex min-h-[40px] items-center justify-between gap-4">
            <div className="leading-tight">
              <Text className={`text-[11px]! font-semibold! uppercase! tracking-widest ${isDarkMode ? "text-slate-400!" : "text-slate-500!"}`}>
                Tổng quan
              </Text>
              <Title level={3} className={`m-0! mt-1! font-bold! tracking-tight! ${isDarkMode ? "text-slate-100!" : "text-slate-900!"}`}>
                {activePageTitle}
              </Title>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="text"
                className={`flex h-10 w-10 items-center justify-center rounded-full! transition-all duration-300 hover:scale-105! ${
                  isDarkMode
                    ? "bg-slate-800! text-yellow-400! hover:bg-slate-700!"
                    : "bg-slate-100! text-slate-600! hover:bg-slate-200!"
                }`}
                onClick={() => setIsDarkMode((prev) => !prev)}
                aria-label="Chuyển giao diện"
              >
                {isDarkMode ? <SunOutlined className="text-lg" /> : <MoonOutlined className="text-lg" />}
              </Button>

              <Button
                type="text"
                className={`flex h-10 w-10 items-center justify-center rounded-full! transition-all duration-300 hover:scale-105! ${
                  isDarkMode
                    ? "bg-slate-800! text-slate-200! hover:bg-slate-700!"
                    : "bg-slate-100! text-slate-600! hover:bg-slate-200!"
                }`}
                onClick={() => setIsNotificationsModalOpen(true)}
                aria-label="Thông báo"
              >
                <Badge count={unreadCount} overflowCount={99} size="small" offset={[-2, 4]}>
                  <BellOutlined className="text-lg" />
                </Badge>
              </Button>

              <div className={`ml-2 h-8 w-px ${isDarkMode ? "bg-slate-800" : "bg-slate-200"}`} />

              <Dropdown
                trigger={["click"]}
                open={isProfileMenuOpen}
                onOpenChange={setIsProfileMenuOpen}
                placement="bottomRight"
                dropdownRender={() => (
                  <div className={`admin-profile-dropdown w-72 origin-top-right overflow-hidden rounded-2xl border p-2 shadow-2xl transition-all ${isDarkMode ? "border-slate-800 bg-slate-900 text-slate-100 shadow-slate-950/50" : "border-slate-100 bg-white text-slate-700 shadow-slate-200/50"}`}>
                    <div className={`mb-2 mt-2 px-3 pb-3 ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
                      <p className={`m-0 text-base font-bold leading-tight tracking-tight ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                        {userFullName}
                      </p>
                      <p className={`m-0 mt-0.5 text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{userEmail}</p>
                    </div>

                    <div className="space-y-0.5 p-1">
                      <Button
                        type="text"
                        className={`flex w-full items-center justify-start! rounded-xl! px-3! py-5! font-medium transition-colors ${isDarkMode ? "text-slate-300! hover:bg-slate-800! hover:text-white!" : "text-slate-600! hover:bg-slate-100! hover:text-slate-900!"}`}
                        icon={<UserOutlined className="text-lg" />}
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          messageApi.info("Trang chỉnh hồ sơ sẽ được bổ sung sớm.");
                        }}
                      >
                        Hồ sơ cá nhân
                      </Button>
                      <Button
                        type="text"
                        className={`flex w-full items-center justify-start! rounded-xl! px-3! py-5! font-medium transition-colors ${isDarkMode ? "text-slate-300! hover:bg-slate-800! hover:text-white!" : "text-slate-600! hover:bg-slate-100! hover:text-slate-900!"}`}
                        icon={<SettingOutlined className="text-lg" />}
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          navigate("/admin/brand-config");
                        }}
                      >
                        Cài đặt hệ thống
                      </Button>
                      <Button
                        type="text"
                        className={`flex w-full items-center justify-start! rounded-xl! px-3! py-5! font-medium transition-colors ${isDarkMode ? "text-slate-300! hover:bg-slate-800! hover:text-white!" : "text-slate-600! hover:bg-slate-100! hover:text-slate-900!"}`}
                        icon={<InfoCircleOutlined className="text-lg" />}
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          messageApi.info("Mục hỗ trợ sẽ được cập nhật trong bản tới.");
                        }}
                      >
                        Trung tâm hỗ trợ
                      </Button>
                    </div>

                    <div className={`my-2 border-t ${isDarkMode ? "border-slate-800" : "border-slate-100"}`} />

                    <div className="p-1">
                      <Button
                        type="text"
                        danger
                        className={`flex w-full items-center justify-start! rounded-xl! px-3! py-5! font-medium transition-colors ${isDarkMode ? "hover:bg-red-950/30!" : "hover:bg-red-50!"}`}
                        icon={<LogoutOutlined className="text-lg" />}
                        onClick={() => void handleLogout()}
                      >
                        Đăng xuất
                      </Button>
                    </div>
                  </div>
                )}
              >
                <button
                  type="button"
                  className={`admin-profile-trigger group ml-2 flex items-center gap-3 rounded-full border border-transparent bg-transparent p-1 pl-3 text-left transition-all duration-300 outline-none ${isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}
                >
                  <span className={`hidden text-sm font-semibold tracking-tight sm:block ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                    {userFullName}
                  </span>
                  <Avatar src={avatarUrl} size={40} className={`ring-2 ring-offset-2 transition-all duration-300 group-hover:scale-105 ${isDarkMode ? "ring-slate-700 ring-offset-slate-900" : "ring-slate-200 ring-offset-white"}`}>
                    {userFullName.charAt(0).toUpperCase()}
                  </Avatar>
                </button>
              </Dropdown>
            </div>
          </div>
        </Header>

        <Content className="admin-content relative overflow-y-auto overflow-x-hidden p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
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

