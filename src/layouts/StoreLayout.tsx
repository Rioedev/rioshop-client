import {
  DownOutlined,
  HeartOutlined,
  LogoutOutlined,
  PhoneOutlined,
  ProfileOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Input } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { resolveStoreImageUrl } from "../features/store/utils/storeFormatting";
import { categoryService, type Category } from "../services/categoryService";
import { cartService, toCartStoreItems } from "../services/cartService";
import { useAuthStore } from "../stores/authStore";
import { useCartStore } from "../stores/cartStore";
import { useWishlistStore } from "../stores/wishlistStore";

const defaultMenuItems = [
  { label: "Áo polo", category: "ao-polo" },
  { label: "Áo sơ mi", category: "ao-so-mi" },
  { label: "Quần jeans", category: "quan-jeans" },
  { label: "Đồ thể thao", category: "do-the-thao" },
];

const policyItems = ["Miễn phí đổi trả 60 ngày", "Miễn phí ship từ 499K", "Kiểm tra hàng trước khi nhận", "Hotline 1900 8888"];

const utilityLinks = [
  { label: "Hệ thống cửa hàng", href: "/products" },
  { label: "Tra cứu đơn hàng", href: "/orders" },
  { label: "Rio Member", href: "/account" },
];

type MegaLeaf = {
  key: string;
  label: string;
  href: string;
};

type MegaItem = {
  key: string;
  label: string;
  href: string;
  image?: string;
  children: MegaLeaf[];
};

type MegaColumn = {
  key: "men" | "women" | "kids";
  title: string;
  items: MegaItem[];
};

type MegaCollectionCard = {
  key: string;
  title: string;
  href: string;
  image: string;
};

const stripDiacritics = (value = "") =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const toCategoryHref = (slug?: string) => (slug ? `/products?category=${encodeURIComponent(slug)}` : "/products");

const flattenCategoryTree = (nodes: Category[]): Category[] =>
  nodes.reduce<Category[]>((acc, node) => {
    acc.push(node);
    if (node.children && node.children.length > 0) {
      acc.push(...flattenCategoryTree(node.children));
    }
    return acc;
  }, []);

const toMegaItem = (node: Category): MegaItem => ({
  key: node._id,
  label: node.name,
  href: toCategoryHref(node.slug),
  image: resolveStoreImageUrl(node.image),
  children: (node.children ?? [])
    .filter((child) => Boolean(child.slug))
    .slice(0, 8)
    .map((child) => ({
      key: child._id,
      label: child.name,
      href: toCategoryHref(child.slug),
    })),
});

const buildMegaColumns = (categoryTree: Category[]): MegaColumn[] => {
  const rootNodes = categoryTree.filter((node) => Boolean(node.slug));
  const allNodes = flattenCategoryTree(categoryTree).filter((node) => Boolean(node.slug));
  const usedNodeIds = new Set<string>();

  const groupConfigs: Array<{ key: MegaColumn["key"]; title: string; keywords: string[] }> = [
    { key: "men", title: "NAM", keywords: ["nam", "men"] },
    { key: "women", title: "NỮ", keywords: ["nu", "women", "female"] },
    { key: "kids", title: "TRẺ EM", keywords: ["tre em", "kid", "kids", "baby", "be"] },
  ];

  const columns = groupConfigs.map((group) => {
    const groupRoot = rootNodes.find((node) => {
      const normalized = stripDiacritics(node.name);
      return group.keywords.some(
        (keyword) =>
          normalized === keyword ||
          normalized.startsWith(`${keyword} `) ||
          normalized.endsWith(` ${keyword}`) ||
          normalized.includes(keyword),
      );
    });

    const sourceNodes = groupRoot
      ? (groupRoot.children ?? []).length > 0
        ? groupRoot.children ?? []
        : [groupRoot]
      : allNodes.filter((node) => {
          const normalized = stripDiacritics(node.name);
          return group.keywords.some((keyword) => normalized.includes(keyword));
        });

    const primaryItems = sourceNodes
      .filter((node) => Boolean(node.slug) && !usedNodeIds.has(node._id))
      .slice(0, 8)
      .map((node) => {
        usedNodeIds.add(node._id);
        return toMegaItem(node);
      });

    return {
      key: group.key,
      title: group.title,
      items: primaryItems,
    };
  });

  const remaining = allNodes.filter((node) => !usedNodeIds.has(node._id));
  let remainingIndex = 0;

  columns.forEach((column) => {
    while (column.items.length < 8 && remainingIndex < remaining.length) {
      const candidate = remaining[remainingIndex];
      remainingIndex += 1;
      if (!candidate.slug) continue;
      column.items.push(toMegaItem(candidate));
    }
  });

  return columns;
};

const fallbackCollectionImages = [
  "https://dummyimage.com/960x420/e2e8f0/0f172a&text=BST+M%E1%BB%9Bi",
  "https://dummyimage.com/960x420/fde2e4/7f1d1d&text=BST+Hot",
  "https://dummyimage.com/960x420/fee2e2/991b1b&text=BST+Flash",
];

const buildMegaCollectionCards = (categoryTree: Category[]): MegaCollectionCard[] => {
  const imageNodes = flattenCategoryTree(categoryTree)
    .filter((node) => Boolean(node.slug))
    .map((node) => ({
      ...node,
      image: resolveStoreImageUrl(node.image),
    }))
    .filter((node) => Boolean(node.image))
    .slice(0, 3);

  if (imageNodes.length > 0) {
    const cards = imageNodes.map((node, index) => ({
      key: node._id,
      title: `BST ${node.name}`,
      href: toCategoryHref(node.slug),
      image: node.image || fallbackCollectionImages[index % fallbackCollectionImages.length],
    }));

    while (cards.length < 3) {
      const index = cards.length;
      cards.push({
        key: `fallback-${index}`,
        title: `BST nổi bật ${index + 1}`,
        href: "/products",
        image: fallbackCollectionImages[index % fallbackCollectionImages.length],
      });
    }

    return cards;
  }

  return fallbackCollectionImages.map((image, index) => ({
    key: `fallback-${index}`,
    title: `BST nổi bật ${index + 1}`,
    href: "/products",
    image,
  }));
};

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
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [menuItems, setMenuItems] = useState(defaultMenuItems);
  const [categoryTree, setCategoryTree] = useState<Category[]>([]);
  const [activeMegaItemKeys, setActiveMegaItemKeys] = useState<Partial<Record<MegaColumn["key"], string>>>({});
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
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }

      if (megaMenuRef.current && !megaMenuRef.current.contains(event.target as Node)) {
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
    if (!isAuthenticated) {
      return;
    }

    let active = true;
    const loadServerCart = async () => {
      try {
        const cart = await cartService.getCart();
        if (!active) {
          return;
        }
        setCartItems(toCartStoreItems(cart), user?.id ?? null);
      } catch {
        // no-op: UI keeps current local state if cart API is unavailable
      }
    };

    void loadServerCart();

    return () => {
      active = false;
    };
  }, [isAuthenticated, setCartItems, user?.id]);

  const onSearch = () => {
    const keyword = searchKeyword.trim();
    navigate(keyword ? `/products?q=${encodeURIComponent(keyword)}` : "/products");
  };

  const megaColumns = useMemo(() => buildMegaColumns(categoryTree), [categoryTree]);
  const megaCollectionCards = useMemo(() => buildMegaCollectionCards(categoryTree), [categoryTree]);

  useEffect(() => {
    setActiveMegaItemKeys((prev) => {
      const next = { ...prev };
      megaColumns.forEach((column) => {
        const previousKey = prev[column.key];
        if (!previousKey) {
          delete next[column.key];
          return;
        }

        const stillExists = previousKey && column.items.some((item) => item.key === previousKey);
        if (!stillExists) {
          delete next[column.key];
        }
      });
      return next;
    });
  }, [megaColumns]);

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

  const toggleMegaChildren = (columnKey: MegaColumn["key"], itemKey: string) => {
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
    setIsMegaMenuOpen(false);
  }, [location.pathname]);

  const isHomePage = location.pathname === "/";

  return (
    <div className="storefront-shell min-h-screen">
      <div className="store-promo-bar">FLASH SALE 10H - 14H | Giảm đến 50% + Freeship toàn quốc</div>

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

            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <Link to="/wishlist" className="store-icon-link">
                <span className="store-top-icon" title="Yêu thích" aria-label="Yêu thích">
                  <HeartOutlined />
                  {wishlistItems.length > 0 ? <span className="store-cart-count">{wishlistItems.length}</span> : null}
                </span>
              </Link>

              <Link to="/cart" className="store-icon-link">
                <span className="store-top-icon" title="Giỏ hàng" aria-label="Giỏ hàng">
                  <ShoppingCartOutlined />
                  {cartCount > 0 ? <span className="store-cart-count">{cartCount}</span> : null}
                </span>
              </Link>

              {isAuthenticated ? (
                <div className={`store-account-menu ${isAccountMenuOpen ? "is-open" : ""}`} ref={accountMenuRef}>
                  <button
                    type="button"
                    className="store-account-trigger"
                    title="Tài khoản"
                    aria-label="Tài khoản"
                    onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                  >
                    <span className="store-avatar-wrap">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={fullName} className="store-avatar-image" />
                      ) : (
                        <span className="store-avatar-fallback">{initials || "U"}</span>
                      )}
                    </span>
                  </button>
                  <div className="store-user-dropdown">
                    <div className="store-user-dropdown-head">
                      <p className="store-user-dropdown-name">{fullName}</p>
                      <p className="store-user-dropdown-role">{accountType === "admin" ? "Quản trị viên" : "Khách hàng"}</p>
                    </div>
                    <Link
                      to="/account"
                      className="store-user-dropdown-item"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      <UserOutlined />
                      Tài khoản của tôi
                    </Link>
                    <Link
                      to="/orders"
                      className="store-user-dropdown-item"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      <ProfileOutlined />
                      Đơn hàng của tôi
                    </Link>
                    {accountType === "admin" ? (
                      <Link
                        to="/admin/dashboard"
                        className="store-user-dropdown-item"
                        onClick={() => setIsAccountMenuOpen(false)}
                      >
                        <UserOutlined />
                        Trang quản trị
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      className="store-user-dropdown-item"
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        void logout();
                      }}
                    >
                      <LogoutOutlined />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`store-user-menu ${isAccountMenuOpen ? "is-open" : ""}`} ref={accountMenuRef}>
                  <button
                    type="button"
                    className="store-top-icon"
                    title="Tài khoản"
                    aria-label="Tài khoản"
                    onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                  >
                    <UserOutlined />
                  </button>
                  <div className="store-user-dropdown">
                    <Link to="/login" className="store-user-dropdown-item" onClick={() => setIsAccountMenuOpen(false)}>
                      Đăng nhập
                    </Link>
                    <Link to="/register" className="store-user-dropdown-item" onClick={() => setIsAccountMenuOpen(false)}>
                      Đăng ký
                    </Link>
                  </div>
                </div>
              )}
            </div>
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

            <div
              ref={megaMenuRef}
              className={`store-nav-mega ${isMegaMenuOpen ? "is-open" : ""}`}
              onMouseEnter={openMegaMenu}
              onMouseLeave={closeMegaMenu}
            >
              <button
                type="button"
                className="store-nav-pill store-nav-pill--mega"
                aria-expanded={isMegaMenuOpen}
                onClick={() => setIsMegaMenuOpen((prev) => !prev)}
              >
                Danh mục
                <DownOutlined />
              </button>

              <div className="store-mega-panel">
                <div className="store-mega-grid">
                  {megaColumns.map((column) => {
                    const activeItemKey = activeMegaItemKeys[column.key];
                    return (
                      <section key={column.key} className="store-mega-col">
                        <h4 className="store-mega-heading">{column.title} ↗</h4>
                        <div className="store-mega-list">
                          {column.items.map((item) => {
                            const isOpen = item.key === activeItemKey;
                            return (
                              <article
                                key={item.key}
                                className={`store-mega-item ${isOpen ? "is-open" : ""}`}
                              >
                                <div className="store-mega-item-trigger">
                                  <Link
                                    to={item.href}
                                    className="store-mega-item-main"
                                    onClick={() => setIsMegaMenuOpen(false)}
                                  >
                                    <span className="store-mega-thumb">
                                      {item.image ? (
                                        <img src={item.image} alt={item.label} className="h-full w-full object-cover" />
                                      ) : (
                                        <span>{item.label.slice(0, 1).toUpperCase()}</span>
                                      )}
                                    </span>
                                    <span className="store-mega-item-label">{item.label}</span>
                                  </Link>
                                  {item.children.length > 0 ? (
                                    <button
                                      type="button"
                                      className="store-mega-toggle"
                                      aria-expanded={isOpen}
                                      onClick={() => toggleMegaChildren(column.key, item.key)}
                                    >
                                      <DownOutlined className="store-mega-chevron" />
                                    </button>
                                  ) : null}
                                </div>
                                {isOpen && item.children.length > 0 ? (
                                  <div className="store-mega-children">
                                    {item.children.map((child) => (
                                      <Link
                                        key={child.key}
                                        to={child.href}
                                        onClick={() => setIsMegaMenuOpen(false)}
                                      >
                                        {child.label}
                                      </Link>
                                    ))}
                                  </div>
                                ) : null}
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}

                  <section className="store-mega-col store-mega-col--collection">
                    <h4 className="store-mega-heading">BỘ SƯU TẬP</h4>
                    <div className="store-mega-collection-list">
                      {megaCollectionCards.map((card) => (
                        <Link
                          key={card.key}
                          to={card.href}
                          className="store-mega-collection-card"
                          onClick={() => setIsMegaMenuOpen(false)}
                        >
                          <div className="store-mega-collection-media">
                            <img src={card.image} alt={card.title} className="h-full w-full object-cover" />
                          </div>
                          <p>{card.title}</p>
                        </Link>
                      ))}
                    </div>
                  </section>
                </div>
                <div className="store-mega-foot">
                  <button type="button" onClick={() => setIsMegaMenuOpen(false)}>
                    Đóng
                  </button>
                </div>
              </div>
            </div>

            {menuItems.slice(0, 6).map((item) => (
              <Link key={item.category} to={`/products?category=${encodeURIComponent(item.category)}`} className="store-nav-pill">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

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

      <main className={`store-main-content mx-auto w-full max-w-405 px-3 sm:px-4 xl:px-6 ${isHomePage ? "pt-0 pb-6 md:pb-8" : "py-6 md:py-8"}`}>
        <Outlet />
      </main>

      <footer className="store-footer">
        <div className="mx-auto grid w-full max-w-405 gap-8 px-3 py-10 sm:px-4 lg:grid-cols-4 xl:px-6">
          <div>
            <h4 className="store-footer-title">RIO SHOP</h4>
            <p className="store-footer-text">Thời trang hằng ngày cho gia đình Việt.</p>
            <p className="store-footer-text">Hotline: 1900 8888</p>
            <p className="store-footer-text">Email: cskh@rioshop.vn</p>
          </div>
          <div>
            <h4 className="store-footer-title">Về chúng tôi</h4>
            <p className="store-footer-text">Giới thiệu</p>
            <p className="store-footer-text">Hệ thống cửa hàng</p>
            <p className="store-footer-text">Tuyển dụng</p>
          </div>
          <div>
            <h4 className="store-footer-title">Chính sách</h4>
            <p className="store-footer-text">Đổi trả 60 ngày</p>
            <p className="store-footer-text">Chính sách vận chuyển</p>
            <p className="store-footer-text">Bảo mật thông tin</p>
          </div>
          <div>
            <h4 className="store-footer-title">Hỗ trợ khách hàng</h4>
            <p className="store-footer-text">Hướng dẫn mua hàng</p>
            <p className="store-footer-text">Tra cứu đơn hàng</p>
            <p className="store-footer-text">Câu hỏi thường gặp</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
