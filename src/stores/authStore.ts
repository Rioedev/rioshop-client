import { AxiosError } from "axios";
import { create } from "zustand";
import {
  authService,
  type AccountType,
  type AuthUser,
  type LoginPayload,
  type RegisterPayload,
} from "../services/authService";
import { bindAuthTokenGetter } from "../services/apiClient";
import { cartService, toCartCouponMeta, toCartStoreItems } from "../services/cartService";
import { wishlistService, toWishlistStoreItems } from "../services/wishlistService";
import { useCartStore } from "./cartStore";
import { useNotificationStore } from "./notificationStore";
import { useWishlistStore } from "./wishlistStore";

type AuthStorage = {
  user: AuthUser;
  token: string;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  accountType: AccountType | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  loginAdmin: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
};

const AUTH_STORAGE_KEY = "rioshop_auth";
const WISHLIST_FALLBACK_IMAGE =
  "https://dummyimage.com/400x400/e2e8f0/0f172a&text=RIO";

const readAuthStorage = (): AuthStorage | null => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthStorage>;
    if (!parsed?.token || !parsed?.user) {
      return null;
    }

    const normalizedUser: AuthUser = {
      id: parsed.user.id,
      email: parsed.user.email,
      fullName: parsed.user.fullName,
      phone: parsed.user.phone,
      role: parsed.user.role ?? "user",
      accountType: parsed.user.accountType ?? "user",
    };

    if (!normalizedUser.id || !normalizedUser.email || !normalizedUser.fullName) {
      return null;
    }

    return { token: parsed.token, user: normalizedUser };
  } catch {
    return null;
  }
};

const writeAuthStorage = (data: AuthStorage) => {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
};

const clearAuthStorage = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const responseMessage = (error.response?.data as { message?: string } | undefined)?.message;
    return responseMessage ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
};

const applyAuthState = (user: AuthUser, token: string) => ({
  user,
  token,
  accountType: user.accountType,
  isAuthenticated: true,
});

const syncCartAfterLogin = async (user: AuthUser) => {
  if (user.accountType !== "user" || !user.id) {
    return;
  }

  const cartState = useCartStore.getState();
  const shouldMergeGuestItems =
    cartState.ownerUserId === null && (cartState.items || []).length > 0;
  const guestItems = shouldMergeGuestItems ? [...cartState.items] : [];

  if (guestItems.length > 0) {
    for (const item of guestItems) {
      const productId = item.productId?.trim();
      const variantSku = item.variantSku?.trim();
      const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
      if (!productId || !variantSku) {
        continue;
      }

      try {
        await cartService.addItem({
          productId,
          variantSku,
          quantity,
        });
      } catch {
        // Skip invalid/out-of-stock item and continue merging the rest.
      }
    }
  }

  try {
    const cart = await cartService.getCart();
    const couponMeta = toCartCouponMeta(cart);
    useCartStore
      .getState()
      .setItems(toCartStoreItems(cart), user.id, couponMeta.couponCode, couponMeta.couponDiscount);
  } catch {
    if (shouldMergeGuestItems) {
      // Keep guest cart if server is unavailable to avoid data loss.
      useCartStore.getState().setItems(guestItems, null, null, 0);
    }
  }
};

const syncWishlistAfterLogin = async (user: AuthUser) => {
  if (user.accountType !== "user" || !user.id) {
    return;
  }

  const wishlistState = useWishlistStore.getState();
  const shouldMergeGuestItems =
    wishlistState.ownerUserId === null && (wishlistState.items || []).length > 0;
  const guestItems = shouldMergeGuestItems ? [...wishlistState.items] : [];

  if (guestItems.length > 0) {
    for (const item of guestItems) {
      const productId = item.productId?.trim();
      if (!productId) {
        continue;
      }

      try {
        await wishlistService.addItem({
          productId,
          productSlug: item.slug?.trim() || "",
          name: item.name?.trim() || "San pham",
          image: item.imageUrl?.trim() || WISHLIST_FALLBACK_IMAGE,
          price: Math.max(0, Number(item.price || 0)),
        });
      } catch {
        // Ignore invalid item and continue syncing the rest.
      }
    }
  }

  try {
    const wishlist = await wishlistService.getWishlist();
    useWishlistStore.getState().setItems(toWishlistStoreItems(wishlist), user.id);
  } catch {
    if (shouldMergeGuestItems) {
      // Keep local wishlist if server is unavailable to avoid data loss.
      useWishlistStore.getState().setItems(guestItems, null);
    }
  }
};

export const useAuthStore = create<AuthState>((set, get) => {
  bindAuthTokenGetter(() => get().token);

  return {
    user: null,
    token: null,
    accountType: null,
    isAuthenticated: false,
    isHydrated: false,
    isLoading: false,

    login: async (payload) => {
      set({ isLoading: true });
      try {
        const { user, token } = await authService.login(payload);
        writeAuthStorage({ user, token });
        set({
          ...applyAuthState(user, token),
          isLoading: false,
        });
        await syncCartAfterLogin(user);
        await syncWishlistAfterLogin(user);
      } catch (error) {
        set({ isLoading: false });
        throw new Error(getErrorMessage(error));
      }
    },

    loginAdmin: async (payload) => {
      set({ isLoading: true });
      try {
        const { user, token } = await authService.loginAdmin(payload);
        writeAuthStorage({ user, token });
        set({
          ...applyAuthState(user, token),
          isLoading: false,
        });
      } catch (error) {
        set({ isLoading: false });
        throw new Error(getErrorMessage(error));
      }
    },

    register: async (payload) => {
      set({ isLoading: true });
      try {
        const { user, token } = await authService.register(payload);
        writeAuthStorage({ user, token });
        set({
          ...applyAuthState(user, token),
          isLoading: false,
        });
        await syncCartAfterLogin(user);
        await syncWishlistAfterLogin(user);
      } catch (error) {
        set({ isLoading: false });
        throw new Error(getErrorMessage(error));
      }
    },

    logout: async () => {
      const hasToken = Boolean(get().token);
      const accountType = get().accountType;

      try {
        if (hasToken && accountType) {
          await authService.logout(accountType);
        }
      } finally {
        clearAuthStorage();
        useCartStore.getState().resetCart();
        useWishlistStore.getState().resetWishlist();
        useNotificationStore.getState().reset();
        set({
          user: null,
          token: null,
          accountType: null,
          isAuthenticated: false,
        });
      }
    },

    hydrate: async () => {
      if (get().isHydrated) {
        return;
      }

      const stored = readAuthStorage();

      if (!stored) {
        if (useWishlistStore.getState().ownerUserId !== null) {
          useWishlistStore.getState().resetWishlist();
        }
        useNotificationStore.getState().reset();
        set({ isHydrated: true });
        return;
      }

      set({
        ...applyAuthState(stored.user, stored.token),
        isHydrated: true,
      });

      try {
        const user = await authService.getCurrentUser(stored.user.accountType);
        writeAuthStorage({ user, token: stored.token });
        set({
          user,
          token: stored.token,
          accountType: stored.user.accountType,
          isAuthenticated: true,
        });
        await syncCartAfterLogin(user);
        await syncWishlistAfterLogin(user);
      } catch {
        clearAuthStorage();
        useCartStore.getState().resetCart();
        useWishlistStore.getState().resetWishlist();
        useNotificationStore.getState().reset();
        set({
          user: null,
          token: null,
          accountType: null,
          isAuthenticated: false,
        });
      }
    },
  };
});
