import { Button, Typography } from "antd";
import { Link } from "react-router-dom";
import { useCartStore } from "../../../stores/cartStore";
import { useWishlistStore } from "../../../stores/wishlistStore";

const { Paragraph, Title } = Typography;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

export function StoreWishlistPage() {
  const items = useWishlistStore((state) => state.items);
  const removeItem = useWishlistStore((state) => state.removeItem);
  const clear = useWishlistStore((state) => state.clear);
  const addCartItem = useCartStore((state) => state.addItem);

  if (items.length === 0) {
    return (
      <section className="cart-empty-state">
        <Title level={3} className="!m-0 !mb-2">
          Danh sach yeu thich dang trong
        </Title>
        <Paragraph className="!mb-4 !text-slate-600">
          Luu san pham yeu thich de quay lai mua nhanh hon.
        </Paragraph>
        <Link to="/products">
          <Button type="primary" className="!rounded-full !bg-slate-900 !px-6 !shadow-none">
            Kham pha san pham
          </Button>
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Title level={3} className="!m-0">
          Danh sach yeu thich
        </Title>
        <Button className="!rounded-full" onClick={clear}>
          Xoa tat ca
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <article key={item.productId} className="cool-product-card">
            <Link to={`/products/${item.slug}`} className="block">
              <div className="cool-product-media">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="cool-product-fallback">RIO</div>
                )}
              </div>
            </Link>

            <div className="p-3">
              <Link to={`/products/${item.slug}`} className="text-sm font-semibold text-slate-900 hover:text-slate-700">
                {item.name}
              </Link>
              <p className="m-0 mt-2 text-base font-extrabold text-slate-900">{formatCurrency(item.price)}</p>

              <div className="mt-3 flex gap-2">
                <Button
                  size="small"
                  type="primary"
                  className="!rounded-full !bg-slate-900 !shadow-none"
                  onClick={() =>
                    addCartItem({
                      productId: item.productId,
                      slug: item.slug,
                      name: item.name,
                      price: item.price,
                      imageUrl: item.imageUrl,
                      quantity: 1,
                    })
                  }
                >
                  Them gio
                </Button>
                <Button size="small" className="!rounded-full" onClick={() => removeItem(item.productId)}>
                  Xoa
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

