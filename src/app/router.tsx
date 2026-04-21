import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { RequireAuth } from "../components/route/RequireAuth";
import { RequireStoreAuth } from "../components/route/RequireStoreAuth";
import { PublicOnlyRoute } from "../components/route/PublicOnlyRoute";
import { AdminPublicOnlyRoute } from "../components/route/AdminPublicOnlyRoute";
import {
  ADMIN_DEFAULT_PATH,
  ADMIN_ROUTE_META,
} from "../features/admin/shared/adminRoutes";
import { ADMIN_PAGE_COMPONENT_MAP } from "../features/admin/shared/adminPageRegistry";

const AdminLayout = lazy(() =>
  import("../layouts/AdminLayout").then((module) => ({ default: module.AdminLayout })),
);
const StoreLayout = lazy(() =>
  import("../layouts/StoreLayout").then((module) => ({ default: module.StoreLayout })),
);

const StoreHomePage = lazy(() =>
  import("../features/store/pages/StoreHomePage").then((module) => ({
    default: module.StoreHomePage,
  })),
);
const StoreProductsPage = lazy(() =>
  import("../features/store/pages/StoreProductsPage").then((module) => ({
    default: module.StoreProductsPage,
  })),
);
const StoreProductDetailPage = lazy(() =>
  import("../features/store/pages/StoreProductDetailPage").then((module) => ({
    default: module.StoreProductDetailPage,
  })),
);
const StoreBlogsPage = lazy(() =>
  import("../features/store/pages/StoreBlogsPage").then((module) => ({
    default: module.StoreBlogsPage,
  })),
);
const StoreBlogDetailPage = lazy(() =>
  import("../features/store/pages/StoreBlogDetailPage").then((module) => ({
    default: module.StoreBlogDetailPage,
  })),
);
const StoreFlashSalesPage = lazy(() =>
  import("../features/store/pages/StoreFlashSalesPage").then((module) => ({
    default: module.StoreFlashSalesPage,
  })),
);
const StoreCartPage = lazy(() =>
  import("../features/store/pages/StoreCartPage").then((module) => ({
    default: module.StoreCartPage,
  })),
);
const StoreWishlistPage = lazy(() =>
  import("../features/store/pages/StoreWishlistPage").then((module) => ({
    default: module.StoreWishlistPage,
  })),
);
const StoreCheckoutPage = lazy(() =>
  import("../features/store/pages/StoreCheckoutPage").then((module) => ({
    default: module.StoreCheckoutPage,
  })),
);
const StoreMomoReturnPage = lazy(() =>
  import("../features/store/pages/StoreMomoReturnPage").then((module) => ({
    default: module.StoreMomoReturnPage,
  })),
);
const StoreMomoSandboxPage = lazy(() =>
  import("../features/store/pages/StoreMomoSandboxPage").then((module) => ({
    default: module.StoreMomoSandboxPage,
  })),
);
const StoreOrdersPage = lazy(() =>
  import("../features/store/pages/StoreOrdersPage").then((module) => ({
    default: module.StoreOrdersPage,
  })),
);
const StoreOrderDetailPage = lazy(() =>
  import("../features/store/pages/StoreOrderDetailPage").then((module) => ({
    default: module.StoreOrderDetailPage,
  })),
);
const StoreAccountPage = lazy(() =>
  import("../features/store/pages/StoreAccountPage").then((module) => ({
    default: module.StoreAccountPage,
  })),
);

const LoginPage = lazy(() =>
  import("../features/auth/pages/LoginPage").then((module) => ({
    default: module.LoginPage,
  })),
);
const RegisterPage = lazy(() =>
  import("../features/auth/pages/RegisterPage").then((module) => ({
    default: module.RegisterPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import("../features/auth/pages/ForgotPasswordPage").then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const AdminLoginPage = lazy(() =>
  import("../features/auth/pages/AdminLoginPage").then((module) => ({
    default: module.AdminLoginPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("./pages/NotFoundPage").then((module) => ({
    default: module.NotFoundPage,
  })),
);

const adminChildRoutes = ADMIN_ROUTE_META.map((route) => {
  const PageComponent = ADMIN_PAGE_COMPONENT_MAP[route.segment];
  return {
    path: route.segment,
    element: <PageComponent />,
  };
});

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
          { index: true, element: <Navigate to={ADMIN_DEFAULT_PATH} replace /> },
          ...adminChildRoutes,
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
