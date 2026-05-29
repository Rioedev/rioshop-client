import { Button, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { StoreProductGridCard } from "../components/StoreProductGridCard";
import {
  StoreEmptyState,
  StoreMetricGrid,
  StorePageShell,
  StorePanelSection,
  StoreHeroSection,
  storeButtonClassNames,
} from "../components/StorePageChrome";
import {
  formatStoreCurrency,
  resolveStoreImageUrl,
} from "../utils/storeFormatting";
import { toStoreColorSwatches, type StoreColorSwatch } from "../utils/productSwatches";
import { cartService, toCartCouponMeta, toCartStoreItems } from "../../../services/cartService";
import { productService } from "../../../services/productService";
import { toWishlistStoreItems, wishlistService } from "../../../services/wishlistService";
import { useAuthStore } from "../../../stores/authStore";
import { useCartStore } from "../../../stores/cartStore";
import { useWishlistStore } from "../../../stores/wishlistStore";
import { getErrorMessage } from "../../../utils/errorMessage";

const resolveSwatchImageUrls = (
  swatches?: StoreColorSwatch[],
): StoreColorSwatch[] | undefined => {
  if (!swatches?.length) return undefined;
  return swatches.map((swatch) => ({
    ...swatch,
    imageUrl: swatch.imageUrl ? resolveStoreImageUrl(swatch.imageUrl) : undefined,
  }));
};

export function StoreWishlistPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const items = useWishlistStore((state) => state.items);
  const removeItemLocal = useWishlistStore((state) => state.removeItem);
  const clearLocal = useWishlistStore((state) => state.clear);
  const setWishlistItems = useWishlistStore((state) => state.setItems);
  const addCartItem = useCartStore((state) => state.addItem);
  const setCartItems = useCartStore((state) => state.setItems);
  const [processingProductId, setProcessingProductId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  // Fallback cache cho item legacy (đã thêm vào wishlist từ trước khi tính năng
  // lưu colorSwatches có mặt). Các item mới đã có sẵn swatches trong store.
  const [legacySwatchCache, setLegacySwatchCache] = useState<
    Record<string, StoreColorSwatch[]>
  >({});

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let active = true;
    const loadWishlist = async () => {
      try {
        const wishlist = await wishlistService.getWishlist();
        if (!active) {
          return;
        }
        setWishlistItems(toWishlistStoreItems(wishlist), userId);
      } catch {
        // ignore and keep current state
      }
    };

    void loadWishlist();

    return () => {
      active = false;
    };
  }, [isAuthenticated, setWishlistItems, userId]);

  useEffect(() => {
    let active = true;

    // Chỉ fetch product cho các item CHƯA có colorSwatches (data cũ).
    const legacyItems = items.filter(
      (item) => !item.colorSwatches?.length && item.slug?.trim(),
    );
    const validIds = new Set(items.map((item) => item.productId));

    setLegacySwatchCache((prev) => {
      const pruned: Record<string, StoreColorSwatch[]> = {};
      Object.entries(prev).forEach(([productId, swatches]) => {
        if (validIds.has(productId)) pruned[productId] = swatches;
      });
      return pruned;
    });

    legacyItems.forEach((item) => {
      void productService
        .getProductBySlug(item.slug)
        .then((product) => {
          if (!active) return;
          const swatches = toStoreColorSwatches(product, item.imageUrl);
          setLegacySwatchCache((prev) => ({ ...prev, [item.productId]: swatches }));
        })
        .catch(() => {
          // bỏ qua lỗi của từng sản phẩm
        });
    });

    return () => {
      active = false;
    };
  }, [items]);

  // Resolve URL ngay tại điểm hiển thị (swatches lưu trong DB là raw path)
  const swatchesByProductId = useMemo(() => {
    const map: Record<string, StoreColorSwatch[]> = {};
    items.forEach((item) => {
      const source = item.colorSwatches?.length
        ? item.colorSwatches
        : legacySwatchCache[item.productId];
      const resolved = resolveSwatchImageUrls(source);
      if (resolved) map[item.productId] = resolved;
    });
    return map;
  }, [items, legacySwatchCache]);

  const removeWishlistItem = async (productId: string) => {
    if (!isAuthenticated) {
      removeItemLocal(productId);
      messageApi.success("Đã xóa khỏi danh sách yêu thích");
      return;
    }

    setProcessingProductId(productId);
    try {
      const wishlist = await wishlistService.removeItem(productId);
      setWishlistItems(toWishlistStoreItems(wishlist), userId);
      messageApi.success("Đã xóa khỏi danh sách yêu thích");
    } catch (error) {
      const messageText = getErrorMessage(error, "Không thể xóa sản phẩm yêu thích");
      messageApi.error(messageText);
    } finally {
      setProcessingProductId(null);
    }
  };

  const clearWishlist = async () => {
    if (!isAuthenticated) {
      clearLocal();
      messageApi.success("Đã xóa toàn bộ danh sách yêu thích");
      return;
    }

    setClearing(true);
    try {
      const wishlist = await wishlistService.clearWishlist();
      setWishlistItems(toWishlistStoreItems(wishlist), userId);
      messageApi.success("Đã xóa toàn bộ danh sách yêu thích");
    } catch (error) {
      const messageText = getErrorMessage(error, "Không thể xóa toàn bộ yêu thích");
      messageApi.error(messageText);
    } finally {
      setClearing(false);
    }
  };

  const addWishlistToCart = async (item: (typeof items)[number]) => {
    try {
      if (!item.slug?.trim()) {
        messageApi.error("Không tìm thấy liên kết sản phẩm để thêm vào giỏ.");
        return;
      }

      const product = await productService.getProductBySlug(item.slug);
      const variant = (product.variants ?? []).find((entry) => entry.isActive !== false && Number(entry.stock || 0) > 0);

      if (!variant?.sku) {
        messageApi.error("Sản phẩm này chưa có biến thể hợp lệ để đặt hàng.");
        return;
      }

      const variantLabel = `${variant.color?.name?.trim() || "Mặc định"} / ${(variant.sizeLabel || variant.size).trim()}`;
      const price = Math.max(0, product.pricing.salePrice + Number(variant.additionalPrice || 0));

      if (isAuthenticated) {
        const cart = await cartService.addItem({
          productId: item.productId,
          variantSku: variant.sku,
          quantity: 1,
        });
        const couponMeta = toCartCouponMeta(cart);
        setCartItems(
          toCartStoreItems(cart),
          undefined,
          couponMeta.couponCode,
          couponMeta.couponDiscount,
        );
      } else {
        addCartItem({
          productId: item.productId,
          slug: item.slug,
          name: `${product.name} - ${variantLabel}`,
          price,
          imageUrl: item.imageUrl,
          variantSku: variant.sku,
          variantLabel,
          availableStock: Math.max(1, Number(variant.stock || 1)),
          quantity: 1,
        });
      }

      messageApi.success("Đã thêm vào giỏ hàng");
    } catch {
      messageApi.error("Không thể thêm vào giỏ. Vui lòng thử lại.");
    }
  };

  if (items.length === 0) {
    return (
      <StoreEmptyState
        kicker="Yêu thích"
        title="Danh sách yêu thích đang trống"
        description="Lưu sản phẩm bạn muốn quay lại sau và thêm vào giỏ hàng bất cứ lúc nào."
        action={
          <Link to="/products">
            <Button type="primary" className={storeButtonClassNames.primary}>
              Khám phá sản phẩm
            </Button>
          </Link>
        }
      />
    );
  }

  const metrics = [
    {
      label: "Đã lưu",
      value: items.length,
      description: "Sản phẩm sẵn sàng để đưa vào giỏ hàng.",
    },
    {
      label: "Giá trị tạm tính",
      value: formatStoreCurrency(items.reduce((sum, item) => sum + item.price, 0)),
      description: "Tổng mức giá hiện tại của danh sách yêu thích.",
    },
    {
      label: "Trạng thái",
      value: "Đồng bộ",
      description: "Danh sách sẽ được cập nhật ngay khi bạn thêm hoặc xóa sản phẩm.",
    },
  ];

  return (
    <StorePageShell>
      {contextHolder}
      <StoreHeroSection
        kicker="Yêu thích"
        title="Sản phẩm bạn đang để mắt tới"
        description="Tất cả món hàng bạn đã lưu sẽ ở đây để so sánh nhanh, thêm vào giỏ và quay lại mua sau."
        action={
          <Button
            className={storeButtonClassNames.secondary}
            onClick={() => void clearWishlist()}
            loading={clearing}
          >
            Xóa tất cả
          </Button>
        }
      >
        <StoreMetricGrid items={metrics} />
      </StoreHeroSection>

      <StorePanelSection kicker="Đã lưu gần đây" title="Chọn lại và mua nhanh">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <StoreProductGridCard
              key={item.productId}
              href={`/products/${item.slug}`}
              imageUrl={item.imageUrl}
              name={item.name}
              price={formatStoreCurrency(item.price)}
              colorSwatches={swatchesByProductId[item.productId]}
              footer={
                <>
                  <Button
                    size="small"
                    type="primary"
                    className={storeButtonClassNames.primaryCompact}
                    onClick={() => void addWishlistToCart(item)}
                    disabled={processingProductId === item.productId || clearing}
                  >
                    Thêm giỏ
                  </Button>
                  <Button
                    size="small"
                    className={storeButtonClassNames.secondaryCompact}
                    onClick={() => void removeWishlistItem(item.productId)}
                    loading={processingProductId === item.productId}
                    disabled={clearing}
                  >
                    Xóa
                  </Button>
                </>
              }
            />
          ))}
        </div>
      </StorePanelSection>
    </StorePageShell>
  );
}
