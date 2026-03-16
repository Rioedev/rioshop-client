import { Button } from "antd";
import { Link } from "react-router-dom";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

type HomeProduct = {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  image: string;
};

const quickCategories = [
  { name: "Áo thun", count: "120+ mẫu", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80" },
  { name: "Áo polo", count: "56 sản phẩm", image: "https://images.unsplash.com/photo-1622470953794-aa9c70b0fb9d?auto=format&fit=crop&w=400&q=80" },
  { name: "Quần short", count: "88 sản phẩm", image: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=400&q=80" },
  { name: "Đồ tập", count: "74 sản phẩm", image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=400&q=80" },
  { name: "Đồ mặc nhà", count: "42 sản phẩm", image: "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=400&q=80" },
  { name: "Combo", count: "34 gói", image: "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=400&q=80" },
];

const featuredProducts: HomeProduct[] = [
  {
    id: "p1",
    name: "Áo Thun AirFlex Pique",
    slug: "ao-thun-airflex-pique",
    category: "Bán chạy",
    price: 259000,
    originalPrice: 329000,
    badge: "-21%",
    image: "https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "p2",
    name: "Polo Premium Essential",
    slug: "polo-premium-essential",
    category: "Mới về",
    price: 329000,
    image: "https://images.unsplash.com/photo-1593032465171-8bd40f88d5f8?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "p3",
    name: "Quần Short Everyday Fit",
    slug: "quan-short-everyday-fit",
    category: "Mùa hè",
    price: 289000,
    originalPrice: 359000,
    badge: "-19%",
    image: "https://images.unsplash.com/photo-1595341888016-a392ef81b7de?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "p4",
    name: "Áo Khoác Light Bomber",
    slug: "ao-khoac-light-bomber",
    category: "Giới hạn",
    price: 549000,
    image: "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "p5",
    name: "Bộ Đồ Tập Motion Pro",
    slug: "bo-do-tap-motion-pro",
    category: "Năng động",
    price: 469000,
    image: "https://images.unsplash.com/photo-1571731956672-f2b94d7dd0cb?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "p6",
    name: "Combo 3 Quần Lót Modal",
    slug: "combo-3-quan-lot-modal",
    category: "Combo tốt",
    price: 299000,
    originalPrice: 389000,
    badge: "-23%",
    image: "https://images.unsplash.com/photo-1603251578711-3290ca1a0181?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "p7",
    name: "Sơ Mi Linen Breath",
    slug: "so-mi-linen-breath",
    category: "Công sở",
    price: 399000,
    image: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "p8",
    name: "Quần Dài Smart Chino",
    slug: "quan-dai-smart-chino",
    category: "Dáng chuẩn",
    price: 459000,
    originalPrice: 539000,
    badge: "-15%",
    image: "https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=900&q=80",
  },
];

const valueProps = [
  {
    title: "Chất liệu cao cấp",
    text: "Vải mềm, bền màu, giữ form ổn định qua nhiều lần giặt.",
  },
  {
    title: "Form dễ mặc",
    text: "Phù hợp nhiều dáng người, dễ phối từ đi làm đến đi chơi.",
  },
  {
    title: "Đổi trả 60 ngày",
    text: "Thử thoải mái tại nhà, đổi trả miễn phí nếu không vừa.",
  },
];

export function StoreHomePage() {
  return (
    <div className="rio-home space-y-7 md:space-y-10">
      <section className="rio-hero rio-full-bleed">
        <div className="rio-hero-overlay" />
        <div className="rio-hero-content">
          <p className="rio-kicker">Bộ sưu tập mới 2026</p>
          <h1 className="mt-3 text-4xl font-black leading-[1.05] text-white md:text-6xl">
            Mặc hằng ngày
            <br />
            nhưng vẫn nổi bật.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-200 md:text-lg">
            Giao diện demo cho RioShop theo phong cách thời trang trẻ, hiện đại,
            gọn gàng như các website top trong ngành.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/products/ao-thun-airflex-pique">
              <Button type="primary" className="rio-btn-light !h-11 !rounded-full !px-7 !font-bold">
                Mua BST mới
              </Button>
            </Link>
            <Button className="rio-btn-ghost !h-11 !rounded-full !px-7 !font-bold">
              Xem lookbook
            </Button>
          </div>
          <div className="rio-tag-row">
            <span className="rio-tag">Freeship 299K</span>
            <span className="rio-tag">Đổi trả 60 ngày</span>
            <span className="rio-tag">Hàng mới mỗi tuần</span>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {quickCategories.map((item) => (
          <button key={item.name} type="button" className="rio-category-card">
            <div className="rio-category-image">
              <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
            </div>
            <div className="p-4">
              <p className="m-0 text-base font-bold text-slate-900">{item.name}</p>
              <p className="m-0 mt-1 text-sm text-slate-500">{item.count}</p>
            </div>
          </button>
        ))}
      </section>

      <section className="rio-collection-grid">
        <article className="rio-collection-card rio-collection-men">
          <div className="rio-collection-content">
            <p className="rio-collection-kicker">Dành cho nam</p>
            <h2>Tối giản. Gọn dáng. Mỗi ngày.</h2>
            <Button className="!h-10 !rounded-full !border-0 !px-6 !font-bold">Khám phá ngay</Button>
          </div>
        </article>

        <article className="rio-collection-card rio-collection-women">
          <div className="rio-collection-content">
            <p className="rio-collection-kicker">Dành cho nữ</p>
            <h2>Nhẹ. Thoải mái. Linh hoạt.</h2>
            <Button className="!h-10 !rounded-full !border-0 !px-6 !font-bold">Xem bộ sưu tập</Button>
          </div>
        </article>
      </section>

      <section className="rio-product-section">
        <div className="rio-section-head">
          <div>
            <p className="rio-mini-title">Gợi ý hôm nay</p>
            <h3 className="m-0 text-2xl font-black text-slate-900 md:text-3xl">Sản phẩm nổi bật</h3>
          </div>
          <button type="button" className="rio-more-link">
            Xem tat ca
          </button>
        </div>

        <div className="rio-product-grid">
          {featuredProducts.map((product) => {
            const hasDiscount =
              typeof product.originalPrice === "number" && product.originalPrice > product.price;

            return (
              <Link key={product.id} to={`/products/${product.slug}`} className="rio-product-card">
                <div className="rio-product-image">
                  <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                  <span className="rio-product-category">{product.category}</span>
                  {hasDiscount && product.badge ? (
                    <span className="rio-product-discount">{product.badge}</span>
                  ) : null}
                </div>
                <div className="p-4">
                  <h4 className="m-0 min-h-[44px] text-sm font-semibold leading-6 text-slate-900 md:text-base">
                    {product.name}
                  </h4>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-base font-extrabold text-slate-900 md:text-lg">
                      {formatCurrency(product.price)}
                    </span>
                    {hasDiscount ? (
                      <span className="text-sm text-slate-400 line-through">
                        {formatCurrency(product.originalPrice ?? product.price)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {valueProps.map((item) => (
          <article key={item.title} className="rio-value-card">
            <h4>{item.title}</h4>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className="rio-story">
        <div>
          <p className="rio-mini-title">Rio Journal</p>
          <h3 className="m-0 text-3xl font-black text-slate-900">Thời trang dễ sống dễ mặc.</h3>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Mục tiêu của demo này là tạo một giao diện storefront đẹp, hiện đại, có bố cục rõ ràng,
            khuyến mãi nổi bật và trình bày sản phẩm theo phong cách thương mại điện tử chuyên nghiệp.
          </p>
        </div>
        <div className="rio-newsletter">
          <div>
            <p className="m-0 text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Rio Member</p>
            <h4 className="m-0 mt-2 text-2xl font-black text-slate-900">Nhận ưu đãi 10% cho đơn đầu</h4>
          </div>
          <form className="rio-newsletter-form" onSubmit={(event) => event.preventDefault()}>
            <input className="rio-newsletter-input" placeholder="Nhập email của bạn" />
            <Button type="primary" className="!h-11 !rounded-full !bg-slate-900 !px-6 !font-bold !shadow-none">
              Đăng ký
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
