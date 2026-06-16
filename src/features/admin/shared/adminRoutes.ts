import type { AdminRole } from "../../../services/authService";

export type AdminMenuIcon =
  | "home"
  | "tags"
  | "appstore"
  | "inbox"
  | "shopping-cart"
  | "star"
  | "thunderbolt"
  | "gift"
  | "team"
  | "line-chart"
  | "read"
  | "bg-colors"
  | "user-switch"
  | "safety";

export type AdminRouteSegment =
  | "dashboard"
  | "categories"
  | "collections"
  | "products"
  | "inventories"
  | "orders"
  | "reviews"
  | "flash-sales"
  | "coupons"
  | "users"
  | "analytics-events"
  | "blogs"
  | "brand-config"
  | "policies"
  | "sales-report"
  | "suppliers"
  | "purchase-orders"
  | "admin-accounts"
  | "profile";

export type AdminRouteMeta = {
  segment: AdminRouteSegment;
  title: string;
  menuLabel?: string;
  menuIcon?: AdminMenuIcon;
  showInMenu: boolean;
  allowedRoles?: AdminRole[];
  requiresAdminAccountPermission?: boolean;
};

const ALL_ADMIN_ROLES: AdminRole[] = ["superadmin", "manager", "warehouse", "sales"];
const MANAGEMENT_ROLES: AdminRole[] = ["superadmin", "manager"];
const WAREHOUSE_ROLES: AdminRole[] = ["superadmin", "manager", "warehouse"];
const SALES_ROLES: AdminRole[] = ["superadmin", "manager", "sales"];

export const toAdminFullPath = (segment: AdminRouteSegment): string =>
  `/admin/${segment}`;

export const ADMIN_DEFAULT_PATH = toAdminFullPath("dashboard");

export const ADMIN_ROUTE_META: AdminRouteMeta[] = [
  {
    segment: "dashboard",
    title: "Tổng quan",
    menuLabel: "Tổng quan",
    menuIcon: "home",
    showInMenu: true,
  },
  {
    segment: "categories",
    title: "Danh mục",
    menuLabel: "Danh mục",
    menuIcon: "tags",
    showInMenu: true,
  },
  {
    segment: "collections",
    title: "Bộ sưu tập",
    menuLabel: "Bộ sưu tập",
    menuIcon: "tags",
    showInMenu: true,
  },
  {
    segment: "products",
    title: "Sản phẩm",
    menuLabel: "Sản phẩm",
    menuIcon: "appstore",
    showInMenu: true,
  },
  {
    segment: "inventories",
    title: "Tồn kho",
    menuLabel: "Tồn kho",
    menuIcon: "inbox",
    showInMenu: true,
  },
  {
    segment: "suppliers",
    title: "Nhà cung cấp",
    menuLabel: "Nhà cung cấp",
    menuIcon: "team",
    showInMenu: true,
  },
  {
    segment: "purchase-orders",
    title: "Đơn nhập (PO)",
    menuLabel: "Đơn nhập (PO)",
    menuIcon: "inbox",
    showInMenu: true,
  },
  {
    segment: "orders",
    title: "Đơn hàng",
    menuLabel: "Đơn hàng",
    menuIcon: "shopping-cart",
    showInMenu: true,
  },
  {
    segment: "reviews",
    title: "Đánh giá",
    menuLabel: "Đánh giá",
    menuIcon: "star",
    showInMenu: true,
  },
  {
    segment: "flash-sales",
    title: "Flash Sales",
    menuLabel: "Flash Sales",
    menuIcon: "thunderbolt",
    showInMenu: true,
  },
  {
    segment: "coupons",
    title: "Mã giảm giá",
    menuLabel: "Mã giảm giá",
    menuIcon: "gift",
    showInMenu: true,
  },
  {
    segment: "users",
    title: "Khách hàng",
    menuLabel: "Khách hàng",
    menuIcon: "team",
    showInMenu: true,
  },
  {
    segment: "sales-report",
    title: "Báo cáo bán hàng",
    menuLabel: "Báo cáo bán hàng",
    menuIcon: "line-chart",
    showInMenu: true,
  },
  {
    segment: "analytics-events",
    title: "Analytics Events",
    menuLabel: "Analytics Events",
    menuIcon: "line-chart",
    showInMenu: true,
  },
  {
    segment: "blogs",
    title: "Blog",
    menuLabel: "Blog",
    menuIcon: "read",
    showInMenu: true,
  },
  {
    segment: "brand-config",
    title: "Cấu hình thương hiệu",
    menuLabel: "Cấu hình thương hiệu",
    menuIcon: "bg-colors",
    showInMenu: true,
  },
  {
    segment: "policies",
    title: "Chính sách cửa hàng",
    menuLabel: "Chính sách",
    menuIcon: "safety",
    showInMenu: true,
  },
  {
    segment: "admin-accounts",
    title: "Tài khoản admin",
    menuLabel: "Tài khoản admin",
    menuIcon: "user-switch",
    showInMenu: true,
    requiresAdminAccountPermission: true,
  },
  {
    segment: "profile",
    title: "Hồ sơ cá nhân",
    showInMenu: false,
  },
];

export const ADMIN_PAGE_TITLE_MAP = ADMIN_ROUTE_META.reduce<Record<string, string>>(
  (result, route) => {
    result[toAdminFullPath(route.segment)] = route.title;
    return result;
  },
  {},
);

const ADMIN_ROUTE_ALLOWED_ROLES: Partial<Record<AdminRouteSegment, AdminRole[]>> = {
  dashboard: ALL_ADMIN_ROLES,
  categories: MANAGEMENT_ROLES,
  collections: MANAGEMENT_ROLES,
  products: WAREHOUSE_ROLES,
  inventories: WAREHOUSE_ROLES,
  suppliers: WAREHOUSE_ROLES,
  "purchase-orders": WAREHOUSE_ROLES,
  orders: SALES_ROLES,
  reviews: SALES_ROLES,
  "flash-sales": SALES_ROLES,
  coupons: SALES_ROLES,
  users: SALES_ROLES,
  "sales-report": MANAGEMENT_ROLES,
  "analytics-events": MANAGEMENT_ROLES,
  blogs: MANAGEMENT_ROLES,
  "brand-config": MANAGEMENT_ROLES,
  policies: MANAGEMENT_ROLES,
  "admin-accounts": MANAGEMENT_ROLES,
  profile: ALL_ADMIN_ROLES,
};

export const isAdminRole = (role?: string): role is AdminRole =>
  ALL_ADMIN_ROLES.includes(role as AdminRole);

export const canAccessAdminRoute = (
  route: AdminRouteMeta,
  adminRole?: string,
): boolean => {
  const allowedRoles = route.allowedRoles ?? ADMIN_ROUTE_ALLOWED_ROLES[route.segment];
  return !allowedRoles || (isAdminRole(adminRole) && allowedRoles.includes(adminRole));
};

export const getAdminMenuRouteMeta = (
  adminRole?: string,
): AdminRouteMeta[] =>
  ADMIN_ROUTE_META.filter(
    (route) =>
      route.showInMenu &&
      canAccessAdminRoute(route, adminRole),
  );

export const getAdminRouteMetaByPathname = (
  pathname: string,
): AdminRouteMeta | undefined =>
  ADMIN_ROUTE_META.find((route) => {
    const routePath = toAdminFullPath(route.segment);
    return pathname === routePath || pathname.startsWith(`${routePath}/`);
  });
