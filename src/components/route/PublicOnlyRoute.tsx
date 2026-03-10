import { Spin } from "antd";
import { Navigate, Outlet, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

export function PublicOnlyRoute() {
  const [searchParams] = useSearchParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={searchParams.get("redirect") ?? "/admin/dashboard"} replace />;
  }

  return <Outlet />;
}

