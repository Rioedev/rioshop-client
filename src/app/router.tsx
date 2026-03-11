import { createBrowserRouter, Navigate } from "react-router-dom";
import { AdminLayout } from "../layouts/AdminLayout";
import { StoreLayout } from "../layouts/StoreLayout";
import { AdminDashboardPage } from "../features/admin/pages/AdminDashboardPage";
import { AdminOrdersPage } from "../features/admin/pages/AdminOrdersPage";
import { AdminProductsPage } from "../features/admin/pages/AdminProductsPage";
import { AdminCategoriesPage } from "../features/admin/pages/AdminCategoriesPage";
import { StoreHomePage } from "../features/store/pages/StoreHomePage";
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
          { path: "categories", element: <AdminCategoriesPage /> },
          { path: "*", element: <Navigate to="/admin/dashboard" replace /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
