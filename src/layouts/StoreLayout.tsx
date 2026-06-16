import { PhoneOutlined, SearchOutlined } from "@ant-design/icons";
import { Input, type InputRef } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppNotificationsModal } from "../components/notifications/AppNotificationsModal";
import { STORE_BRAND_KEY } from "../app/constants/storeBrand";
import { StoreAiChatbot } from "../features/store/components/StoreAiChatbot";
import {
  formatStoreCurrency,
  resolveStoreProductColors,
  resolveStoreProductThumbnail,
} from "../features/store/utils/storeFormatting";
import { analyticsTracker } from "../services/analyticsTracker";
import { brandConfigService } from "../services/brandConfigService";
import { categoryService, type Category } from "../services/categoryService";
import { productService, type Product } from "../services/productService";
import {
  collectionService,
  type Collection,
} from "../services/collectionService";
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
  utilityLinks,
  type MegaColumn,
} from "./shared/storeLayout";

import "../styles/home-v2.scss";
import "../styles/pdp-v2.scss";
import "../styles/store-home-v3.scss";
import "../styles/store-refresh.scss";
import "../styles/store-blog-footer.scss";
import "../styles/store-ai-chatbot.scss";

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
  const [searchSuggestions, setSearchSuggestions] = useState<Product[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [categoryTree, setCategoryTree] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [brandLayout, setBrandLayout] = useState<{
    promoBarText?: string;
    promoBarActive: boolean;
    supportPhone?: string;
    supportEmail?: string;
    supportHotlineNote?: string;
    supportHotlineNoteSecondary?: string;
    storeAddress?: string;
    socialLinks: {
      facebook?: string;
      instagram?: string;
      tiktok?: string;
      youtube?: string;
      zalo?: string;
      messenger?: string;
    };
    footer: {
      introHeading?: string;
      intro?: string;
      companyName?: string;
      companyLegalText?: string;
      complianceBadges: string[];
      newsletterPlaceholder?: string;
    };
  }>({
    promoBarActive: true,
    socialLinks: {},
    footer: { complianceBadges: [] },
  });
  const [activeMegaItemKeys, setActiveMegaItemKeys] = useState<
    Partial<Record<MegaColumn["key"], string>>
  >({});
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const megaMenuRef = useRef<HTMLDivElement | null>(null);
  const megaMenuCloseTimerRef = useRef<number | null>(null);
  const searchInputRef = useRef<InputRef | null>(null);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const searchRequestIdRef = useRef(0);

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

      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
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
        const [treeResult, collectionResult] = await Promise.all([
          categoryService.getCategoryTree(),
          collectionService.getCollections({
            page: 1,
            limit: 24,
            isActive: true,
          }),
        ]);

        if (!active) {
          return;
        }

        setCategoryTree(Array.isArray(treeResult) ? treeResult : []);
        setCollections(
          Array.isArray(collectionResult.docs) ? collectionResult.docs : [],
        );
      } catch {
        if (active) {
          setCategoryTree([]);
          setCollections([]);
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
        const trim = (v?: string | null) => (v?.trim() ? v.trim() : undefined);
        setBrandLayout({
          promoBarText: trim(config.storefront?.promoBar?.text),
          promoBarActive: config.storefront?.promoBar?.isActive !== false,
          supportPhone: trim(config.supportPhone),
          supportEmail: trim(config.supportEmail),
          supportHotlineNote: trim(config.supportHotlineNote),
          supportHotlineNoteSecondary: trim(config.supportHotlineNoteSecondary),
          storeAddress: trim(config.storeAddress),
          socialLinks: {
            facebook: trim(config.socialLinks?.facebook),
            instagram: trim(config.socialLinks?.instagram),
            tiktok: trim(config.socialLinks?.tiktok),
            youtube: trim(config.socialLinks?.youtube),
            zalo: trim(config.socialLinks?.zalo),
            messenger: trim(config.socialLinks?.messenger),
          },
          footer: {
            introHeading: trim(config.storefront?.footer?.introHeading),
            intro: trim(config.storefront?.footer?.intro),
            companyName: trim(config.storefront?.footer?.companyName),
            companyLegalText: trim(config.storefront?.footer?.companyLegalText),
            complianceBadges: (config.storefront?.footer?.complianceBadges ?? []).filter(Boolean),
            newsletterPlaceholder: trim(config.storefront?.footer?.newsletterPlaceholder),
          },
        });
      } catch {
        // giữ default
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

  const searchKeywordFromUrl = useMemo(() => {
    if (location.pathname !== "/products") {
      return "";
    }
    return new URLSearchParams(location.search).get("q")?.trim() ?? "";
  }, [location.pathname, location.search]);

  useEffect(() => {
    setSearchKeyword(searchKeywordFromUrl);
    setSearchSuggestions([]);
    setIsSearchFocused(false);
  }, [searchKeywordFromUrl]);

  useEffect(() => {
    const keyword = searchKeyword.trim();
    const requestId = ++searchRequestIdRef.current;

    if (!isSearchFocused || keyword.length < 2) {
      setSearchSuggestions([]);
      setIsSearchLoading(false);
      return;
    }

    setIsSearchLoading(true);
    const timer = window.setTimeout(() => {
      void productService
        .searchProducts(keyword, 1, 6, "active")
        .then((result) => {
          if (searchRequestIdRef.current !== requestId) {
            return;
          }
          setSearchSuggestions(result.docs);
        })
        .catch(() => {
          if (searchRequestIdRef.current === requestId) {
            setSearchSuggestions([]);
          }
        })
        .finally(() => {
          if (searchRequestIdRef.current === requestId) {
            setIsSearchLoading(false);
          }
        });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [isSearchFocused, searchKeyword]);

  const onSearch = (rawKeyword?: string) => {
    const keyword = (rawKeyword ?? searchKeyword ?? searchInputRef.current?.input?.value ?? "").trim();
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
    setIsSearchFocused(false);
  };

  const megaColumns = useMemo(
    () => buildMegaColumns(categoryTree),
    [categoryTree],
  );
  const megaCollectionCards = useMemo(
    () => buildMegaCollectionCards(collections),
    [collections],
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
  const shouldShowSearchSuggestions =
    isSearchFocused && searchKeyword.trim().length >= 2;

  return (
    <div className="storefront-shell min-h-screen">
      {brandLayout.promoBarActive && brandLayout.promoBarText ? (
        <div className="store-promo-bar">{brandLayout.promoBarText}</div>
      ) : null}

      <div className="store-utility-strip">
        <div className="mx-auto flex w-full max-w-440 items-center justify-between gap-3 px-3 py-2 sm:px-4 xl:px-6">
          <div className="store-utility-links">
            {utilityLinks.map((item) => (
              <Link key={item.label} to={item.href}>
                {item.label}
              </Link>
            ))}
          </div>
          {brandLayout.supportPhone ? (
            <div className="store-utility-hotline">
              <PhoneOutlined />
              <span>CSKH {brandLayout.supportPhone}</span>
            </div>
          ) : null}
        </div>
      </div>

      <header className="store-header">
        <div className="mx-auto w-full max-w-440 px-3 py-4 sm:px-4 xl:px-6">
          <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap">
            <Link to="/" className="store-logo">
              RIO<span>SHOP</span>
            </Link>

            <div
              ref={searchBoxRef}
              className="store-search-wrap order-3 w-full lg:order-0 lg:flex-1"
            >
              <Input
                ref={searchInputRef}
                allowClear
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onPressEnter={(event) => onSearch(event.currentTarget.value)}
                suffix={
                  <SearchOutlined
                    onClick={() => onSearch()}
                    className="cursor-pointer text-slate-500 transition hover:text-slate-700"
                  />
                }
                className="store-search"
                placeholder="Tìm áo thun, quần short, combo..."
              />

              {shouldShowSearchSuggestions ? (
                <div className="store-search-suggestions">
                  <div className="store-search-suggestions-head">
                    <strong>Kết quả tìm kiếm</strong>
                    {!isSearchLoading ? <span>{searchSuggestions.length} sản phẩm</span> : null}
                  </div>

                  {isSearchLoading ? (
                    <div className="store-search-suggestions-state">Đang tìm sản phẩm...</div>
                  ) : searchSuggestions.length > 0 ? (
                    <div className="store-search-suggestions-list">
                      {searchSuggestions.map((product) => {
                        const image = resolveStoreProductThumbnail(product);
                        const colors = resolveStoreProductColors(product).slice(0, 3);
                        const price = product.pricing.regularPrice ?? product.pricing.salePrice;

                        return (
                          <Link
                            key={product._id}
                            to={`/products/${product.slug}`}
                            className="store-search-suggestion-item"
                            onClick={() => setIsSearchFocused(false)}
                          >
                            <div className="store-search-suggestion-image">
                              {image ? <img src={image} alt={product.name} /> : <span>RIO</span>}
                            </div>
                            <div className="store-search-suggestion-copy">
                              <strong>{product.name}</strong>
                              <small>{product.category?.name || product.brand}</small>
                              <div className="store-search-suggestion-meta">
                                <b>{formatStoreCurrency(price)}</b>
                                {colors.length > 0 ? (
                                  <span className="store-search-suggestion-colors">
                                    {colors.map((color) => (
                                      <i
                                        key={`${product._id}-${color.name}-${color.hex}`}
                                        style={{ backgroundColor: color.hex }}
                                        title={color.name}
                                      />
                                    ))}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="store-search-suggestions-state">Không tìm thấy sản phẩm phù hợp.</div>
                  )}

                  <button
                    type="button"
                    className="store-search-view-all"
                    onClick={() => onSearch(searchKeyword)}
                  >
                    Xem tất cả kết quả
                  </button>
                </div>
              ) : null}
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
              onToggleAccountMenu={() => setIsAccountMenuOpen((prev) => !prev)}
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
            <Link to="/flash-sales" className="store-nav-pill">
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
          </nav>
        </div>
      </header>

      <AppNotificationsModal
        open={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />

      <main
        className={`store-main-content mx-auto w-full max-w-440 px-3 sm:px-4 xl:px-6 ${isHomePage ? "pt-0 pb-6 md:pb-8" : "py-6 md:py-8"}`}
      >
        <Outlet />
      </main>

      <StoreFooter brandLayout={brandLayout} />
      <StoreAiChatbot />
    </div>
  );
}
