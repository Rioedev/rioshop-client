import { PhoneOutlined } from "@ant-design/icons";
import { Input } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppNotificationsModal } from "../components/notifications/AppNotificationsModal";
import { STORE_BRAND_KEY } from "../app/constants/storeBrand";
import { analyticsTracker } from "../services/analyticsTracker";
import { brandConfigService } from "../services/brandConfigService";
import { categoryService, type Category } from "../services/categoryService";
import {
  cartService,
  toCartCouponMeta,
  toCartStoreItems,
} from "../services/cartService";
import { subscribeUserNotifications } from "../services/socketClient";
import {
  toWishlistStoreItems,
  wishlistService,
} from "../services/wishlistService";
import { useAuthStore } from "../stores/authStore";
import { useCartStore } from "../stores/cartStore";
import { useNotificationStore } from "../stores/notificationStore";
import { useWishlistStore } from "../stores/wishlistStore";
import { StoreFooter } from "./StoreFooter";
import { StoreHeaderActions } from "./StoreHeaderActions";
import { StoreMegaMenu } from "./StoreMegaMenu";
import {
  buildMegaCollectionCards,
  buildMegaColumns,
  defaultMenuItems,
  policyItems,
  utilityLinks,
  type MegaColumn,
} from "./shared/storeLayout";

import "../styles/home-v2.scss";
import "../styles/pdp-v2.scss";
import "../styles/store-home-v3.scss";
import "../styles/store-refresh.scss";
import "../styles/store-blog-footer.scss";

export function StoreLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const accountType = useAuthStore((state) => state.accountType);
  const logout = useAuthStore((state) => state.logout);

  const cartItems = useCartStore((state) => state.items);
  const setCartItems = useCartStore((state) => state.setItems);
  const wishlistItems = useWishlistStore((state) => state.items);
  const setWishlistItems = useWishlistStore((state) => state.setItems);
  const unreadNotificationCount = useNotificationStore(
    (state) => state.unreadCount,
  );
  const refreshUnreadCount = useNotificationStore(
    (state) => state.refreshUnreadCount,
  );
  const applyRealtimeNotification = useNotificationStore(
    (state) => state.applyRealtimeNotification,
  );
  const resetNotifications = useNotificationStore((state) => state.reset);
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [menuItems, setMenuItems] = useState(defaultMenuItems);
  const [categoryTree, setCategoryTree] = useState<Category[]>([]);
  const [footerSocialLinks, setFooterSocialLinks] = useState<{
    facebook?: string;
    instagram?: string;
  }>({});
  const [activeMegaItemKeys, setActiveMegaItemKeys] = useState<
    Partial<Record<MegaColumn["key"], string>>
  >({});
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const megaMenuRef = useRef<HTMLDivElement | null>(null);
  const megaMenuCloseTimerRef = useRef<number | null>(null);

  const fullName = user?.fullName ?? "";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const avatarUrl = fullName
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0f172a&color=ffffff&bold=true`
    : undefined;

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }

      if (
        megaMenuRef.current &&
        !megaMenuRef.current.contains(event.target as Node)
      ) {
        setIsMegaMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      try {
        const [listResult, treeResult] = await Promise.all([
          categoryService.getCategories({
            page: 1,
            limit: 16,
            isActive: true,
          }),
          categoryService.getCategoryTree(),
        ]);

        if (!active) {
          return;
        }

        const mapped = listResult.docs
          .filter((item) => item.slug)
          .slice(0, 8)
          .map((item) => ({ label: item.name, category: item.slug }));
        setMenuItems(mapped.length > 0 ? mapped : defaultMenuItems);
        setCategoryTree(Array.isArray(treeResult) ? treeResult : []);
      } catch {
        if (active) {
          setMenuItems(defaultMenuItems);
          setCategoryTree([]);
        }
      }
    };

    void loadCategories();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadBrandConfig = async () => {
      try {
        const config = await brandConfigService.getBrandConfig(STORE_BRAND_KEY);
        if (!active) {
          return;
        }
        setFooterSocialLinks({
          facebook: config.socialLinks?.facebook?.trim() || undefined,
          instagram: config.socialLinks?.instagram?.trim() || undefined,
        });
      } catch {
        if (active) {
          setFooterSocialLinks({});
        }
      }
    };

    void loadBrandConfig();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      resetNotifications();
      return;
    }

    let active = true;
    const loadServerData = async () => {
      const [cartResult, wishlistResult] = await Promise.allSettled([
        cartService.getCart(),
        wishlistService.getWishlist(),
      ]);

      if (!active) {
        return;
      }

      if (cartResult.status === "fulfilled") {
        const couponMeta = toCartCouponMeta(cartResult.value);
        setCartItems(
          toCartStoreItems(cartResult.value),
          user?.id ?? null,
          couponMeta.couponCode,
          couponMeta.couponDiscount,
        );
      }

      if (wishlistResult.status === "fulfilled") {
        setWishlistItems(
          toWishlistStoreItems(wishlistResult.value),
          user?.id ?? null,
        );
      }
    };

    void loadServerData();

    return () => {
      active = false;
    };
  }, [
    isAuthenticated,
    resetNotifications,
    setCartItems,
    setWishlistItems,
    user?.id,
  ]);

  useEffect(() => {
    const principalId = user?.id?.toString().trim();
    if (!isAuthenticated || !principalId) {
      return;
    }

    void refreshUnreadCount().catch(() => undefined);
    const unsubscribe = subscribeUserNotifications(principalId, (payload) => {
      applyRealtimeNotification(payload);
    });

    return () => {
      unsubscribe();
    };
  }, [
    applyRealtimeNotification,
    isAuthenticated,
    refreshUnreadCount,
    user?.id,
  ]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const onSearch = () => {
    const keyword = searchKeyword.trim();
    if (keyword) {
      void analyticsTracker.track({
        event: "search",
        userId: user?.id,
        properties: {
          query: keyword,
          source: "header_search",
          path: location.pathname,
        },
      });
    }
    navigate(
      keyword ? `/products?q=${encodeURIComponent(keyword)}` : "/products",
    );
  };

  const megaColumns = useMemo(
    () => buildMegaColumns(categoryTree),
    [categoryTree],
  );
  const megaCollectionCards = useMemo(
    () => buildMegaCollectionCards(categoryTree),
    [categoryTree],
  );

  const normalizedActiveMegaItemKeys = useMemo(() => {
    const next = { ...activeMegaItemKeys };
    megaColumns.forEach((column) => {
      const previousKey = activeMegaItemKeys[column.key];
      if (!previousKey) {
        delete next[column.key];
        return;
      }

      const stillExists = column.items.some((item) => item.key === previousKey);
      if (!stillExists) {
        delete next[column.key];
      }
    });
    return next;
  }, [activeMegaItemKeys, megaColumns]);

  useEffect(
    () => () => {
      if (megaMenuCloseTimerRef.current) {
        window.clearTimeout(megaMenuCloseTimerRef.current);
      }
    },
    [],
  );

  const openMegaMenu = () => {
    if (megaMenuCloseTimerRef.current) {
      window.clearTimeout(megaMenuCloseTimerRef.current);
      megaMenuCloseTimerRef.current = null;
    }
    setIsMegaMenuOpen(true);
  };

  const closeMegaMenu = () => {
    if (megaMenuCloseTimerRef.current) {
      window.clearTimeout(megaMenuCloseTimerRef.current);
    }
    megaMenuCloseTimerRef.current = window.setTimeout(() => {
      setIsMegaMenuOpen(false);
    }, 120);
  };

  const toggleMegaChildren = (
    columnKey: MegaColumn["key"],
    itemKey: string,
  ) => {
    setActiveMegaItemKeys((prev) => {
      const next = { ...prev };
      if (prev[columnKey] === itemKey) {
        delete next[columnKey];
      } else {
        next[columnKey] = itemKey;
      }
      return next;
    });
  };

  useEffect(() => {
    analyticsTracker.captureUtmFromSearch(location.search);
    void analyticsTracker.track({
      event: "page_view",
      userId: user?.id,
      properties: {
        path: location.pathname,
        query: location.search,
        title: typeof document !== "undefined" ? document.title : undefined,
      },
    });
  }, [location.pathname, location.search, user?.id]);

  const isHomePage = location.pathname === "/";

  return (
    <div className="storefront-shell min-h-screen">
      <div className="store-promo-bar">
        FLASH SALE 10H - 14H | Giảm đến 50% + Freeship toàn quốc
      </div>

      <div className="store-utility-strip">
        <div className="mx-auto flex w-full max-w-405 items-center justify-between gap-3 px-3 py-2 sm:px-4 xl:px-6">
          <div className="store-utility-links">
            {utilityLinks.map((item) => (
              <Link key={item.label} to={item.href}>
                {item.label}
              </Link>
            ))}
          </div>
          <div className="store-utility-hotline">
            <PhoneOutlined />
            <span>CSKH 1900 8888</span>
          </div>
        </div>
      </div>

      <header className="store-header">
        <div className="mx-auto w-full max-w-405 px-3 py-4 sm:px-4 xl:px-6">
          <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap">
            <Link to="/" className="store-logo">
              RIO<span>SHOP</span>
            </Link>

            <div className="order-3 w-full lg:order-0 lg:flex-1">
              <Input
                allowClear
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                onPressEnter={onSearch}
                className="store-search"
                placeholder="Tìm áo thun, quần short, combo..."
              />
            </div>

            <StoreHeaderActions
              isAuthenticated={isAuthenticated}
              accountType={accountType}
              fullName={fullName}
              initials={initials}
              avatarUrl={avatarUrl}
              unreadNotificationCount={unreadNotificationCount}
              wishlistCount={wishlistItems.length}
              cartCount={cartCount}
              isAccountMenuOpen={isAccountMenuOpen}
              accountMenuRef={accountMenuRef}
              onToggleAccountMenu={() =>
                setIsAccountMenuOpen((prev) => !prev)
              }
              onCloseAccountMenu={() => setIsAccountMenuOpen(false)}
              onOpenNotificationModal={() => setIsNotificationModalOpen(true)}
              onLogout={() => {
                void logout();
              }}
            />
          </div>

          <nav className="store-main-nav mt-3 flex gap-2 overflow-x-auto pb-1">
            <Link to="/" className="store-nav-pill">
              Trang chủ
            </Link>
            <Link to="/products?sort=best_selling" className="store-nav-pill">
              Bán chạy
            </Link>
            <Link to="/products?sort=newest" className="store-nav-pill">
              Mới về
            </Link>
            <Link to="/products?sort=price_desc" className="store-nav-pill">
              Flash sale
            </Link>
            <Link to="/products" className="store-nav-pill">
              Tất cả sản phẩm
            </Link>

            <StoreMegaMenu
              megaMenuRef={megaMenuRef}
              isMegaMenuOpen={isMegaMenuOpen}
              megaColumns={megaColumns}
              normalizedActiveMegaItemKeys={normalizedActiveMegaItemKeys}
              megaCollectionCards={megaCollectionCards}
              onOpenMenu={openMegaMenu}
              onCloseMenu={closeMegaMenu}
              onToggleMenu={() => setIsMegaMenuOpen((prev) => !prev)}
              onCloseMenuNow={() => setIsMegaMenuOpen(false)}
              onToggleMegaChildren={toggleMegaChildren}
            />

            {menuItems.slice(0, 6).map((item) => (
              <Link
                key={item.category}
                to={`/products?category=${encodeURIComponent(item.category)}`}
                className="store-nav-pill"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <AppNotificationsModal
        open={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />

      <div className="store-policy-strip">
        <div className="mx-auto w-full max-w-405 px-3 sm:px-4 xl:px-6">
          <div className="flex flex-wrap items-center gap-3 py-3">
            {policyItems.map((item) => (
              <div key={item} className="store-policy-item">
                <span className="store-policy-dot" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <main
        className={`store-main-content mx-auto w-full max-w-405 px-3 sm:px-4 xl:px-6 ${isHomePage ? "pt-0 pb-6 md:pb-8" : "py-6 md:py-8"}`}
      >
        <Outlet />
      </main>

      <StoreFooter footerSocialLinks={footerSocialLinks} />
    </div>
  );
}




