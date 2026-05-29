import { Navigate, Outlet, useLocation, useSearchParams } from "react-router-dom";
import type { AccountType } from "../../services/authService";
import { useAuthStore } from "../../stores/authStore";

type GuardContext = {
  isAuthenticated: boolean;
  isHydrated: boolean;
  accountType: AccountType | null;
  pathname: string;
  search: string;
  searchParams: URLSearchParams;
};

type GuardStrategy = (context: GuardContext) => string | null;

type CreateRouteGuardOptions = {
  strategy: GuardStrategy;
};

export const createRouteGuard = ({ strategy }: CreateRouteGuardOptions) => {
  const RouteGuard = () => {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isHydrated = useAuthStore((state) => state.isHydrated);
    const accountType = useAuthStore((state) => state.accountType);

    if (!isHydrated) {
      return (
        <div className="store-boot-loader">
          <div className="store-boot-loader__brand">R</div>
          <div className="store-boot-loader__dots" aria-hidden>
            <span />
            <span />
            <span />
          </div>
          <p className="store-boot-loader__label">Đang chuẩn bị Rioshop</p>
        </div>
      );
    }

    const redirectTo = strategy({
      isAuthenticated,
      isHydrated,
      accountType,
      pathname: location.pathname,
      search: location.search,
      searchParams,
    });

    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }

    return <Outlet />;
  };

  return RouteGuard;
};
