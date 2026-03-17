import { createBrowserRouter, Navigate } from "react-router-dom";
import { AdminLayout } from "../layouts/AdminLayout";
import { StoreLayout } from "../layouts/StoreLayout";
import { AdminDashboardPage } from "../features/admin/pages/AdminDashboardPage";
import { AdminOrdersPage } from "../features/admin/pages/AdminOrdersPage";
import { AdminProductsPage } from "../features/admin/pages/AdminProductsPage";
import { AdminInventoriesPage } from "../features/admin/pages/AdminInventoriesPage";
import { AdminCouponsPage } from "../features/admin/pages/AdminCouponsPage";
import { AdminNotificationsPage } from "../features/admin/pages/AdminNotificationsPage";
import { AdminReviewsPage } from "../features/admin/pages/AdminReviewsPage";
import { AdminFlashSalesPage } from "../features/admin/pages/AdminFlashSalesPage";
import { AdminAnalyticsEventsPage } from "../features/admin/pages/AdminAnalyticsEventsPage";
import { AdminCategoriesPage } from "../features/admin/pages/AdminCategoriesPage";
import { AdminUsersPage } from "../features/admin/pages/AdminUsersPage";
import { AdminAccountsPage } from "../features/admin/pages/AdminAccountsPage";
import { AdminBrandConfigPage } from "../features/admin/pages/AdminBrandConfigPage";
import { StoreHomePage } from "../features/store/pages/StoreHomePage";
import { StoreProductDetailPage } from "../features/store/pages/StoreProductDetailPage";
import { StoreCartPage } from "../features/store/pages/StoreCartPage";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterPage } from "../features/auth/pages/RegisterPage";
import { AdminLoginPage } from "../features/auth/pages/AdminLoginPage";
import { RequireAuth } from "../components/route/RequireAuth";
import { PublicOnlyRoute } from "../components/route/PublicOnlyRoute";
import { AdminPublicOnlyRoute } from "../components/route/AdminPublicOnlyRoute";

export const appRouter = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },
  {
    element: <AdminPublicOnlyRoute />,
    children: [{ path: "/admin/login", element: <AdminLoginPage /> }],
  },
  {
    path: "/",
    element: <StoreLayout />,
    children: [
      { index: true, element: <StoreHomePage /> },
      { path: "products/:slug", element: <StoreProductDetailPage /> },
      { path: "cart", element: <StoreCartPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="/admin/dashboard" replace /> },
          { path: "dashboard", element: <AdminDashboardPage /> },
          { path: "orders", element: <AdminOrdersPage /> },
          { path: "products", element: <AdminProductsPage /> },
          { path: "reviews", element: <AdminReviewsPage /> },
          { path: "flash-sales", element: <AdminFlashSalesPage /> },
          { path: "analytics-events", element: <AdminAnalyticsEventsPage /> },
          { path: "inventories", element: <AdminInventoriesPage /> },
          { path: "coupons", element: <AdminCouponsPage /> },
          { path: "notifications", element: <AdminNotificationsPage /> },
          { path: "categories", element: <AdminCategoriesPage /> },
          { path: "users", element: <AdminUsersPage /> },
          { path: "admin-accounts", element: <AdminAccountsPage /> },
          { path: "brand-config", element: <AdminBrandConfigPage /> },
          { path: "*", element: <Navigate to="/admin/dashboard" replace /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
