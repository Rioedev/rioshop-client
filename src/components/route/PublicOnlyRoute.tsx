import { ADMIN_DEFAULT_PATH } from "../../features/admin/shared/adminRoutes";
import { createRouteGuard } from "./createRouteGuard";

export const PublicOnlyRoute = createRouteGuard({
  strategy: ({ isAuthenticated, accountType, searchParams }) => {
    if (!isAuthenticated) {
      return null;
    }

    const fallbackPath = accountType === "admin" ? ADMIN_DEFAULT_PATH : "/";
    return searchParams.get("redirect") ?? fallbackPath;
  },
});
