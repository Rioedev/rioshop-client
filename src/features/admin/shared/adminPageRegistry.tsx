import { lazy } from "react";
import type { ComponentType, LazyExoticComponent } from "react";
import type { AdminRouteSegment } from "./adminRoutes";

const AdminDashboardPage = lazy(() =>
  import("../pages/AdminDashboardPage").then((module) => ({
    default: module.AdminDashboardPage,
  })),
);
const AdminOrdersPage = lazy(() =>
  import("../pages/AdminOrdersPage").then((module) => ({
    default: module.AdminOrdersPage,
  })),
);
const AdminProductsPage = lazy(() =>
  import("../pages/AdminProductsPage").then((module) => ({
    default: module.AdminProductsPage,
  })),
);
const AdminInventoriesPage = lazy(() =>
  import("../pages/AdminInventoriesPage").then((module) => ({
    default: module.AdminInventoriesPage,
  })),
);
const AdminCouponsPage = lazy(() =>
  import("../pages/AdminCouponsPage").then((module) => ({
    default: module.AdminCouponsPage,
  })),
);
const AdminReviewsPage = lazy(() =>
  import("../pages/AdminReviewsPage").then((module) => ({
    default: module.AdminReviewsPage,
  })),
);
const AdminFlashSalesPage = lazy(() =>
  import("../pages/AdminFlashSalesPage").then((module) => ({
    default: module.AdminFlashSalesPage,
  })),
);
const AdminAnalyticsEventsPage = lazy(() =>
  import("../pages/AdminAnalyticsEventsPage").then((module) => ({
    default: module.AdminAnalyticsEventsPage,
  })),
);
const AdminCategoriesPage = lazy(() =>
  import("../pages/AdminCategoriesPage").then((module) => ({
    default: module.AdminCategoriesPage,
  })),
);
const AdminCollectionsPage = lazy(() =>
  import("../pages/AdminCollectionsPage").then((module) => ({
    default: module.AdminCollectionsPage,
  })),
);
const AdminUsersPage = lazy(() =>
  import("../pages/AdminUsersPage").then((module) => ({
    default: module.AdminUsersPage,
  })),
);
const AdminAccountsPage = lazy(() =>
  import("../pages/AdminAccountsPage").then((module) => ({
    default: module.AdminAccountsPage,
  })),
);
const AdminBrandConfigPage = lazy(() =>
  import("../pages/AdminBrandConfigPage").then((module) => ({
    default: module.AdminBrandConfigPage,
  })),
);
const AdminBlogsPage = lazy(() =>
  import("../pages/AdminBlogsPage").then((module) => ({
    default: module.AdminBlogsPage,
  })),
);
const AdminProfilePage = lazy(() =>
  import("../pages/AdminProfilePage").then((module) => ({
    default: module.AdminProfilePage,
  })),
);

type AdminPageComponent = LazyExoticComponent<ComponentType<object>>;

export const ADMIN_PAGE_COMPONENT_MAP: Record<AdminRouteSegment, AdminPageComponent> = {
  dashboard: AdminDashboardPage,
  categories: AdminCategoriesPage,
  collections: AdminCollectionsPage,
  products: AdminProductsPage,
  inventories: AdminInventoriesPage,
  orders: AdminOrdersPage,
  reviews: AdminReviewsPage,
  "flash-sales": AdminFlashSalesPage,
  coupons: AdminCouponsPage,
  users: AdminUsersPage,
  "analytics-events": AdminAnalyticsEventsPage,
  blogs: AdminBlogsPage,
  "brand-config": AdminBrandConfigPage,
  "admin-accounts": AdminAccountsPage,
  profile: AdminProfilePage,
};

