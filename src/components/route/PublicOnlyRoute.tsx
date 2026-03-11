import { Spin } from "antd";
import { Navigate, Outlet, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

export function PublicOnlyRoute() {
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

  if (isAuthenticated) {
    const fallbackPath = accountType === "admin" ? "/admin/dashboard" : "/";
    return <Navigate to={searchParams.get("redirect") ?? fallbackPath} replace />;
  }

  return <Outlet />;
}
