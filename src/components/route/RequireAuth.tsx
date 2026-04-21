import { createRouteGuard } from "./createRouteGuard";

export const RequireAuth = createRouteGuard({
  strategy: ({ isAuthenticated, accountType, pathname, search }) => {
    if (!isAuthenticated) {
      const redirectPath = `${pathname}${search}`;
      return `/admin/login?redirect=${encodeURIComponent(redirectPath)}`;
    }

    if (accountType !== "admin") {
      return "/";
    }

    return null;
  },
});
