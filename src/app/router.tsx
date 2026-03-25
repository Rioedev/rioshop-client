import { createBrowserRouter, Navigate } from "react-router-dom";
import { AdminLayout } from "../layouts/AdminLayout";
import { StoreLayout } from "../layouts/StoreLayout";
import { AdminDashboardPage } from "../features/admin/pages/AdminDashboardPage";
import { AdminOrdersPage } from "../features/admin/pages/AdminOrdersPage";
import { AdminProductsPage } from "../features/admin/pages/AdminProductsPage";
import { AdminInventoriesPage } from "../features/admin/pages/AdminInventoriesPage";
import { AdminCouponsPage } from "../features/admin/pages/AdminCouponsPage";
import { AdminReviewsPage } from "../features/admin/pages/AdminReviewsPage";
import { AdminFlashSalesPage } from "../features/admin/pages/AdminFlashSalesPage";
import { AdminAnalyticsEventsPage } from "../features/admin/pages/AdminAnalyticsEventsPage";
import { AdminCategoriesPage } from "../features/admin/pages/AdminCategoriesPage";
import { AdminUsersPage } from "../features/admin/pages/AdminUsersPage";
import { AdminAccountsPage } from "../features/admin/pages/AdminAccountsPage";
import { AdminBrandConfigPage } from "../features/admin/pages/AdminBrandConfigPage";
import { AdminBlogsPage } from "../features/admin/pages/AdminBlogsPage";
import { StoreHomePage } from "../features/store/pages/StoreHomePage";
import { StoreProductsPage } from "../features/store/pages/StoreProductsPage";
import { StoreProductDetailPage } from "../features/store/pages/StoreProductDetailPage";
import { StoreBlogsPage } from "../features/store/pages/StoreBlogsPage";
import { StoreBlogDetailPage } from "../features/store/pages/StoreBlogDetailPage";
import { StoreFlashSalesPage } from "../features/store/pages/StoreFlashSalesPage";
import { StoreCartPage } from "../features/store/pages/StoreCartPage";
import { StoreWishlistPage } from "../features/store/pages/StoreWishlistPage";
import { StoreCheckoutPage } from "../features/store/pages/StoreCheckoutPage";
import { StoreMomoReturnPage } from "../features/store/pages/StoreMomoReturnPage";
import { StoreMomoSandboxPage } from "../features/store/pages/StoreMomoSandboxPage";
import { StoreOrdersPage } from "../features/store/pages/StoreOrdersPage";
import { StoreOrderDetailPage } from "../features/store/pages/StoreOrderDetailPage";
import { StoreAccountPage } from "../features/store/pages/StoreAccountPage";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterPage } from "../features/auth/pages/RegisterPage";
import { ForgotPasswordPage } from "../features/auth/pages/ForgotPasswordPage";
import { AdminLoginPage } from "../features/auth/pages/AdminLoginPage";
import { RequireAuth } from "../components/route/RequireAuth";
import { RequireStoreAuth } from "../components/route/RequireStoreAuth";
import { PublicOnlyRoute } from "../components/route/PublicOnlyRoute";
import { AdminPublicOnlyRoute } from "../components/route/AdminPublicOnlyRoute";

export const appRouter = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
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
      { path: "products", element: <StoreProductsPage /> },
      { path: "products/:slug", element: <StoreProductDetailPage /> },
      { path: "blog", element: <StoreBlogsPage /> },
      { path: "blog/:slug", element: <StoreBlogDetailPage /> },
      { path: "flash-sales", element: <StoreFlashSalesPage /> },
      { path: "cart", element: <StoreCartPage /> },
      { path: "wishlist", element: <StoreWishlistPage /> },
      { path: "payment/momo-sandbox", element: <StoreMomoSandboxPage /> },
      { path: "payment/momo-return", element: <StoreMomoReturnPage /> },
      {
        element: <RequireStoreAuth />,
        children: [{ path: "checkout", element: <StoreCheckoutPage /> }],
      },
      { path: "orders", element: <StoreOrdersPage /> },
      { path: "orders/:id", element: <StoreOrderDetailPage /> },
      { path: "account", element: <StoreAccountPage /> },
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
          { path: "categories", element: <AdminCategoriesPage /> },
          { path: "users", element: <AdminUsersPage /> },
          { path: "admin-accounts", element: <AdminAccountsPage /> },
          { path: "brand-config", element: <AdminBrandConfigPage /> },
          { path: "blogs", element: <AdminBlogsPage /> },
          { path: "*", element: <Navigate to="/admin/dashboard" replace /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
