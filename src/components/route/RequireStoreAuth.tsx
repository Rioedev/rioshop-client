import { createRouteGuard } from "./createRouteGuard";

export const RequireStoreAuth = createRouteGuard({
  strategy: ({ isAuthenticated, pathname, search }) => {
    if (!isAuthenticated) {
      const redirectPath = `${pathname}${search}`;
      return `/login?redirect=${encodeURIComponent(redirectPath)}`;
    }

    return null;
  },
});
