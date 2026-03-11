import { Spin } from "antd";
import { Navigate, Outlet, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

export function AdminPublicOnlyRoute() {
  const [searchParams] = useSearchParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const accountType = useAuthStore((state) => state.accountType);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (isAuthenticated && accountType === "admin") {
    return <Navigate to={searchParams.get("redirect") ?? "/admin/dashboard"} replace />;
  }

  if (isAuthenticated && accountType === "user") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

