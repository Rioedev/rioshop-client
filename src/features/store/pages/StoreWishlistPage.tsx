import { Button, message } from "antd";
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
import { formatStoreCurrency } from "../utils/storeFormatting";
import { cartService, toCartStoreItems } from "../../../services/cartService";
import { productService } from "../../../services/productService";
import { useAuthStore } from "../../../stores/authStore";
import { useCartStore } from "../../../stores/cartStore";
import { useWishlistStore } from "../../../stores/wishlistStore";

export function StoreWishlistPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const items = useWishlistStore((state) => state.items);
  const removeItem = useWishlistStore((state) => state.removeItem);
  const clear = useWishlistStore((state) => state.clear);
  const addCartItem = useCartStore((state) => state.addItem);
  const setCartItems = useCartStore((state) => state.setItems);

  const addWishlistToCart = async (item: (typeof items)[number]) => {
    try {
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
        setCartItems(toCartStoreItems(cart));
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
          <Button className={storeButtonClassNames.secondary} onClick={clear}>
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
              footer={
                <>
                  <Button
                    size="small"
                    type="primary"
                    className={storeButtonClassNames.primaryCompact}
                    onClick={() => void addWishlistToCart(item)}
                  >
                    Thêm giỏ
                  </Button>
                  <Button size="small" className={storeButtonClassNames.secondaryCompact} onClick={() => removeItem(item.productId)}>
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
