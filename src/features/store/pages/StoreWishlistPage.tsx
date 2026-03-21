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
import { productService } from "../../../services/productService";
import { useCartStore } from "../../../stores/cartStore";
import { useWishlistStore } from "../../../stores/wishlistStore";

export function StoreWishlistPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const items = useWishlistStore((state) => state.items);
  const removeItem = useWishlistStore((state) => state.removeItem);
  const clear = useWishlistStore((state) => state.clear);
  const addCartItem = useCartStore((state) => state.addItem);

  const addWishlistToCart = async (item: (typeof items)[number]) => {
    try {
      const product = await productService.getProductBySlug(item.slug);
      const variant = (product.variants ?? []).find((entry) => entry.isActive !== false);

      if (!variant?.sku) {
        messageApi.error("San pham nay chua co bien the hop le de dat hang.");
        return;
      }

      const variantLabel = `${variant.color?.name?.trim() || "Mac dinh"} / ${(variant.sizeLabel || variant.size).trim()}`;
      const price = Math.max(0, product.pricing.salePrice + Number(variant.additionalPrice || 0));

      addCartItem({
        productId: item.productId,
        slug: item.slug,
        name: `${product.name} - ${variantLabel}`,
        price,
        imageUrl: item.imageUrl,
        variantSku: variant.sku,
        variantLabel,
        quantity: 1,
      });

      messageApi.success("Da them vao gio hang");
    } catch {
      messageApi.error("Khong the them vao gio. Vui long thu lai.");
    }
  };

  if (items.length === 0) {
    return (
      <StoreEmptyState
        kicker="Wishlist"
        title="Danh sach yeu thich dang trong"
        description="Luu san pham ban muon quay lai sau va them vao gio hang bat cu luc nao."
        action={
          <Link to="/products">
            <Button type="primary" className={storeButtonClassNames.primary}>
              Kham pha san pham
            </Button>
          </Link>
        }
      />
    );
  }

  const metrics = [
    {
      label: "Da luu",
      value: items.length,
      description: "San pham san sang de dua vao gio hang.",
    },
    {
      label: "Gia tri tam tinh",
      value: formatStoreCurrency(items.reduce((sum, item) => sum + item.price, 0)),
      description: "Tong muc gia hien tai cua danh sach yeu thich.",
    },
    {
      label: "Trang thai",
      value: "Dong bo",
      description: "Danh sach se duoc cap nhat ngay khi ban them hoac xoa san pham.",
    },
  ];

  return (
    <StorePageShell>
      {contextHolder}
      <StoreHeroSection
        kicker="Wishlist"
        title="San pham ban dang de mat toi"
        description="Tat ca mon hang ban da luu se o day de so sanh nhanh, them vao gio va quay lai mua sau."
        action={
          <Button className={storeButtonClassNames.secondary} onClick={clear}>
            Xoa tat ca
          </Button>
        }
      >
        <StoreMetricGrid items={metrics} />
      </StoreHeroSection>

      <StorePanelSection kicker="Da luu gan day" title="Chon lai va mua nhanh">
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
                    Them gio
                  </Button>
                  <Button size="small" className={storeButtonClassNames.secondaryCompact} onClick={() => removeItem(item.productId)}>
                    Xoa
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
