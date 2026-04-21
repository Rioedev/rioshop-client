import { ADMIN_DEFAULT_PATH } from "../../features/admin/shared/adminRoutes";
import { createRouteGuard } from "./createRouteGuard";

export const AdminPublicOnlyRoute = createRouteGuard({
  strategy: ({ isAuthenticated, accountType, searchParams }) => {
    if (isAuthenticated && accountType === "admin") {
      return searchParams.get("redirect") ?? ADMIN_DEFAULT_PATH;
    }

    if (isAuthenticated && accountType === "user") {
      return "/";
    }

    return null;
  },
});
