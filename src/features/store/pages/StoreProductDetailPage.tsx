import {
  CheckCircleOutlined,
  HeartOutlined,
  SafetyCertificateOutlined,
  StarFilled,
  TruckOutlined,
} from "@ant-design/icons";
import { Button, InputNumber, Progress, Rate, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { productService, type Product } from "../../../services/productService";
import { useCartStore } from "../../../stores/cartStore";

const { Paragraph, Title } = Typography;

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000").replace(/\/$/, "");

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const resolveImageUrl = (url?: string): string | undefined => {
  if (!url) {
    return undefined;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const normalizedPath = url.startsWith("/") ? url : `/${url}`;
  return `${apiBaseUrl}${normalizedPath}`;
};

type ProductRuntime = Product & {
  ratings?: {
    avg?: number;
    count?: number;
    dist?: Record<string, number>;
  };
  totalSold?: number;
};

type MockProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  basePrice: number;
  salePrice: number;
  shortDescription: string;
  description: string;
  materials: string[];
  care: string[];
  images: string[];
};

const demoColors = [
  { name: "Coral", hex: "#ff7f7f" },
  { name: "Pearl", hex: "#f1f5f9" },
  { name: "Navy", hex: "#1e3a8a" },
  { name: "Onyx", hex: "#0f172a" },
  { name: "Slate", hex: "#64748b" },
];

const demoSizes = ["XS", "S", "M", "L", "XL", "2XL"];

const techCards = [
  {
    title: "CoolSoft",
    subtitle: "Mem, mat, khong bi xoc",
    text: "Soi vai mem va be mat min giup mac em, thoang, khong gay cam giac kho chiu khi van dong.",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "CoolDry",
    subtitle: "Thoat hoi am nhanh",
    text: "Cong nghe dan hoi va hut am tot giup trang phuc kho nhanh, phu hop cho ca ngay dai.",
    image: "https://images.unsplash.com/photo-1467043198406-dc953a3defa0?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "CoolRib",
    subtitle: "Giu form on dinh",
    text: "Cau truc det rib giup vai giu do bung, giam gian bai va ben dep sau nhieu lan giat.",
    image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "CoolFlex",
    subtitle: "Co gian 4 chieu",
    text: "Ty le spandex toi uu giup cu dong thoai mai hon khi tap luyen va di chuyen lien tuc.",
    image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80",
  },
];

const mockProducts: MockProduct[] = [
  {
    id: "mock-1",
    slug: "ao-thun-airflex-pique",
    name: "Ao Thun AirFlex Pique",
    category: "Ao thun",
    basePrice: 329000,
    salePrice: 259000,
    shortDescription: "Vai pique thoang, mem va gon dang. Hop cho mac hang ngay.",
    description:
      "Ao su dung chat lieu cotton pha spandex giup co do co gian nhe, tham hut tot va thoang khi mac ca ngay.",
    materials: ["95% Cotton", "5% Spandex", "Xu ly khang mui"],
    care: ["Giat may che do nhe", "Khong su dung thuoc tay", "Ui nhiet do thap"],
    images: [
      "https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1400&q=80",
    ],
  },
  {
    id: "mock-2",
    slug: "quan-short-everyday-fit",
    name: "Quan Short Everyday Fit",
    category: "Quan short",
    basePrice: 359000,
    salePrice: 289000,
    shortDescription: "Form regular fit, de phoi voi ao thun va polo.",
    description:
      "Quan short cho mua he voi chat lieu mem nhe, co gian nhe, phu hop di choi, di cafe hoac du lich.",
    materials: ["Cotton twill", "Co gian 2 chieu", "Mem va mau ben"],
    care: ["Giat voi nuoc lanh", "Phoi trong bong ram", "Khong say nhiet cao"],
    images: [
      "https://images.unsplash.com/photo-1595341888016-a392ef81b7de?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1582552938357-32b906df40cb?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?auto=format&fit=crop&w=1400&q=80",
    ],
  },
  {
    id: "mock-3",
    slug: "combo-3-quan-lot-modal",
    name: "Combo 3 Quan Lot Modal",
    category: "Quan lot",
    basePrice: 389000,
    salePrice: 299000,
    shortDescription: "Mem mat, tham hut tot, de mac ca ngay.",
    description:
      "Combo tiet kiem voi vai modal mem nhe, co do dan hoi vua phai, thich hop cho sinh hoat hang ngay.",
    materials: ["Modal bamboo", "Cotton", "Khang mui nhe"],
    care: ["Giat tui luoi", "Khong dung nuoc nong", "Phoi ngang"],
    images: [
      "https://images.unsplash.com/photo-1603251578711-3290ca1a0181?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1617692855027-33b14f061079?auto=format&fit=crop&w=1400&q=80",
    ],
  },
];

const toMockProduct = (product: MockProduct): ProductRuntime => ({
  _id: product.id,
  sku: `SKU-${product.id.toUpperCase()}`,
  slug: product.slug,
  name: product.name,
  brand: "RioShop",
  shortDescription: product.shortDescription,
  description: product.description,
  category: {
    _id: `cat-${product.category.toLowerCase().replace(/\s+/g, "-")}`,
    name: product.category,
    slug: product.category.toLowerCase().replace(/\s+/g, "-"),
  },
  pricing: {
    basePrice: product.basePrice,
    salePrice: product.salePrice,
    currency: "VND",
  },
  media: product.images.map((image, index) => ({
    url: image,
    type: "image",
    isPrimary: index === 0,
  })),
  material: product.materials,
  care: product.care,
  status: "active",
  isFeatured: true,
  isNew: true,
  isBestseller: product.salePrice < product.basePrice,
  ratings: {
    avg: 4.8,
    count: 214,
    dist: {
      5: 168,
      4: 31,
      3: 10,
      2: 4,
      1: 1,
    },
  },
  totalSold: 1860,
});

const findMockBySlug = (slug?: string): ProductRuntime | null => {
  if (!slug) {
    return toMockProduct(mockProducts[0]);
  }

  const found = mockProducts.find((item) => item.slug === slug);
  return found ? toMockProduct(found) : toMockProduct(mockProducts[0]);
};

const toProductCardImage = (item: ProductRuntime, fallback = "RIO") =>
  resolveImageUrl(item.media?.find((media) => media.type === "image")?.url) ??
  `https://dummyimage.com/800x1000/e2e8f0/0f172a&text=${encodeURIComponent(fallback)}`;

const generateReviewPercents = (product: ProductRuntime) => {
  const dist = product.ratings?.dist;
  const count = product.ratings?.count ?? 0;

  if (dist && count > 0) {
    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      percent: Math.round(((dist[String(star)] ?? 0) / count) * 100),
    }));
  }

  return [
    { star: 5, percent: 78 },
    { star: 4, percent: 15 },
    { star: 3, percent: 4 },
    { star: 2, percent: 2 },
    { star: 1, percent: 1 },
  ];
};

export function StoreProductDetailPage() {
  const { slug } = useParams();
  const addItem = useCartStore((state) => state.addItem);

  const [product, setProduct] = useState<ProductRuntime | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductRuntime[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<ProductRuntime[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);
  const [selectedColor, setSelectedColor] = useState(demoColors[0].name);
  const [selectedSize, setSelectedSize] = useState(demoSizes[2]);

  useEffect(() => {
    let active = true;

    const fetchProduct = async () => {
      setLoading(true);
      setUsingMock(false);

      const fallbackProduct = findMockBySlug(slug);

      if (!slug) {
        if (active) {
          setProduct(fallbackProduct);
          setRelatedProducts(mockProducts.slice(1).map((item) => toMockProduct(item)));
          setCatalogProducts(mockProducts.map((item) => toMockProduct(item)));
          setUsingMock(true);
          setLoading(false);
        }
        return;
      }

      try {
        const result = (await productService.getProductBySlug(slug)) as ProductRuntime;
        if (!active) {
          return;
        }

        setProduct(result);

        const [relatedResult, catalogResult] = await Promise.allSettled([
          productService.getRelatedProducts(result._id),
          productService.getProducts({
            page: 1,
            limit: 28,
            status: "active",
            sort: { isFeatured: -1, totalSold: -1, createdAt: -1 },
          }),
        ]);

        if (active) {
          if (relatedResult.status === "fulfilled") {
            setRelatedProducts((relatedResult.value as ProductRuntime[]).filter((item) => item._id !== result._id));
          } else {
            setRelatedProducts(
              mockProducts
                .filter((item) => item.slug !== slug)
                .map((item) => toMockProduct(item)),
            );
          }

          if (catalogResult.status === "fulfilled") {
            setCatalogProducts((catalogResult.value.docs as ProductRuntime[]).filter((item) => item._id !== result._id));
          } else {
            setCatalogProducts(mockProducts.filter((item) => item.slug !== slug).map((item) => toMockProduct(item)));
          }
        }
      } catch {
        if (!active) {
          return;
        }

        setProduct(fallbackProduct);
        setRelatedProducts(mockProducts.filter((item) => item.slug !== slug).map((item) => toMockProduct(item)));
        setCatalogProducts(mockProducts.filter((item) => item.slug !== slug).map((item) => toMockProduct(item)));
        setUsingMock(true);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchProduct();

    return () => {
      active = false;
    };
  }, [slug]);

  const imageList = useMemo(
    () =>
      (product?.media ?? [])
        .filter((item) => item.type === "image")
        .map((item) => resolveImageUrl(item.url))
        .filter((item): item is string => Boolean(item)),
    [product],
  );

  useEffect(() => {
    setSelectedImage(imageList[0]);
  }, [imageList]);

  const productPool = useMemo(() => {
    const all = [...relatedProducts, ...catalogProducts].filter((item) => item._id !== product?._id);
    const map = new Map<string, ProductRuntime>();

    all.forEach((item) => {
      if (!map.has(item._id)) {
        map.set(item._id, item);
      }
    });

    return Array.from(map.values());
  }, [relatedProducts, catalogProducts, product?._id]);

  const styleProducts = productPool.slice(0, 4);
  const sameTechProducts = productPool.slice(4, 8).length > 0 ? productPool.slice(4, 8) : productPool.slice(0, 4);
  const suggestedProducts = productPool.slice(8, 12).length > 0 ? productPool.slice(8, 12) : productPool.slice(2, 6);

  const viewedProducts = useMemo(() => {
    const list = [product, ...productPool].filter((item): item is ProductRuntime => Boolean(item));
    const map = new Map<string, ProductRuntime>();

    list.forEach((item) => {
      if (!map.has(item._id)) {
        map.set(item._id, item);
      }
    });

    return Array.from(map.values()).slice(0, 4);
  }, [product, productPool]);

  if (loading) {
    return <div className="product-detail-skeleton" />;
  }

  if (!product) {
    return (
      <section className="product-empty-state">
        <Title level={3} className="!mb-2 !mt-0">
          Khong tim thay san pham
        </Title>
        <Paragraph className="!mb-4 !text-slate-600">
          San pham co the da bi an hoac duong dan khong hop le.
        </Paragraph>
        <Link to="/">
          <Button type="primary" className="!rounded-full !bg-slate-900 !px-6 !shadow-none">
            Quay ve trang chu
          </Button>
        </Link>
      </section>
    );
  }

  const displayImage = selectedImage ?? imageList[0];
  const hasDiscount = product.pricing.basePrice > product.pricing.salePrice;
  const ratingValue = product.ratings?.avg ?? 4.8;
  const ratingCount = product.ratings?.count ?? 0;
  const soldText = product.totalSold ? `${product.totalSold.toLocaleString("vi-VN")} da ban` : "Moi cap nhat";
  const reviewPercents = generateReviewPercents(product);

  const onAddToCart = () => {
    addItem({
      productId: product._id,
      slug: product.slug,
      name: `${product.name} - ${selectedColor} / ${selectedSize}`,
      price: product.pricing.salePrice,
      imageUrl: displayImage,
      quantity,
    });
    message.success("Da them san pham vao gio hang");
  };

  const renderProductCards = (items: ProductRuntime[]) => (
    <div className="pdpv2-showcase-grid">
      {items.map((item, index) => (
        <Link key={item._id} to={`/products/${item.slug}`} className="pdpv2-showcase-card">
          <div className="pdpv2-showcase-image">
            <img src={toProductCardImage(item, `RIO-${index + 1}`)} alt={item.name} className="h-full w-full object-cover" />
          </div>
          <div className="pdpv2-showcase-content">
            <div className="pdpv2-color-row">
              {demoColors.slice(0, 4).map((color) => (
                <span key={`${item._id}-${color.name}`} className="pdpv2-color-mini" style={{ background: color.hex }} />
              ))}
            </div>
            <h4>{item.name}</h4>
            <p>{formatCurrency(item.pricing.salePrice)}</p>
          </div>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="pdpv2-page space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <div>
          <Link to="/" className="hover:text-slate-900">
            Trang chu
          </Link>
          <span className="mx-2">/</span>
          <span>{product.category?.name ?? "San pham"}</span>
          <span className="mx-2">/</span>
          <span>{product.name}</span>
        </div>
        {usingMock ? <span className="product-mock-badge">Demo UI mode</span> : null}
      </div>

      <section className="pdpv2-main-wrap">
        <div className="pdpv2-gallery-panel">
          <div className="pdpv2-gallery-grid">
            {imageList.length > 1 ? (
              <div className="pdpv2-thumb-column">
                {imageList.map((image) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setSelectedImage(image)}
                    className={`pdpv2-thumb-btn ${selectedImage === image ? "is-active" : ""}`}
                  >
                    <img src={image} alt={product.name} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}

            <div className="pdpv2-main-image-wrap">
              {displayImage ? (
                <img src={displayImage} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="product-main-fallback">RIO</div>
              )}
            </div>
          </div>
        </div>

        <div className="pdpv2-buy-panel">
          <p className="product-info-category">{product.category?.name ?? "San pham moi"}</p>
          <Title level={2} className="!mb-2 !mt-1 !text-3xl !text-slate-900 md:!text-[34px]">
            {product.name}
          </Title>

          <div className="pdpv2-rating-row">
            <span className="inline-flex items-center gap-1 text-amber-500">
              <StarFilled />
              {ratingValue.toFixed(1)}
            </span>
            <span>({ratingCount} danh gia)</span>
            <span>{soldText}</span>
          </div>

          <div className="mb-4 mt-4 flex items-end gap-2">
            <span className="text-3xl font-black text-slate-900">
              {formatCurrency(product.pricing.salePrice)}
            </span>
            {hasDiscount ? (
              <span className="text-lg text-slate-400 line-through">
                {formatCurrency(product.pricing.basePrice)}
              </span>
            ) : null}
          </div>

          <Paragraph className="!mb-4 !text-base !leading-7 !text-slate-600">
            {product.shortDescription ?? product.description ?? "San pham toi gian, de mac, de phoi."}
          </Paragraph>

          <div className="pdpv2-policy-grid">
            <div className="pdpv2-policy-item">
              <TruckOutlined />
              Giao nhanh 2h noi thanh
            </div>
            <div className="pdpv2-policy-item">
              <SafetyCertificateOutlined />
              Chinh hang 100%
            </div>
            <div className="pdpv2-policy-item">
              <CheckCircleOutlined />
              Doi tra 60 ngay
            </div>
            <div className="pdpv2-policy-item">
              <HeartOutlined />
              Tu van size 24/7
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Mau sac</p>
            <div className="flex flex-wrap gap-2">
              {demoColors.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setSelectedColor(color.name)}
                  className={`pdpv2-color-pill ${selectedColor === color.name ? "is-active" : ""}`}
                >
                  <span className="pdpv2-color-dot" style={{ background: color.hex }} />
                  {color.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Kich thuoc</p>
            <div className="flex flex-wrap gap-2">
              {demoSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={`option-pill ${selectedSize === size ? "is-active" : ""}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <p className="m-0 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">So luong</p>
            <InputNumber
              min={1}
              value={quantity}
              onChange={(value) => setQuantity(Math.max(1, Number(value ?? 1)))}
              className="!w-28 !rounded-xl"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              type="primary"
              size="large"
              className="!h-11 !rounded-full !bg-slate-900 !px-8 !font-bold !shadow-none"
              onClick={onAddToCart}
            >
              Them vao gio
            </Button>
            <Link to="/cart">
              <Button size="large" className="!h-11 !rounded-full !border-slate-300 !px-7 !font-semibold">
                Mua ngay
              </Button>
            </Link>
          </div>

          <div className="product-note-list">
            <p>
              <strong>Chat lieu:</strong> {(product.material ?? ["Cotton cao cap"]).join(" | ")}
            </p>
            <p>
              <strong>Bao quan:</strong> {(product.care ?? ["Giat nhe, tranh nhiet cao"]).join(" | ")}
            </p>
          </div>
        </div>
      </section>

      <section className="pdpv2-overview-card">
        <h3 className="pdpv2-section-title">Mo ta san pham</h3>
        <div className="pdpv2-overview-grid">
          <div className="pdpv2-spec-card">
            <p className="pdpv2-spec-label">Thong tin chi tiet</p>
            <ul className="pdpv2-spec-list">
              <li>
                <span>Thuong hieu</span>
                <strong>{product.brand ?? "RioShop"}</strong>
              </li>
              <li>
                <span>Danh muc</span>
                <strong>{product.category?.name ?? "San pham"}</strong>
              </li>
              <li>
                <span>SKU</span>
                <strong>{product.sku ?? "Dang cap nhat"}</strong>
              </li>
              <li>
                <span>Tinh trang</span>
                <strong>{product.status === "active" ? "Con hang" : "Tam het"}</strong>
              </li>
            </ul>

            <Paragraph className="!mb-0 !mt-4 !text-sm !leading-7 !text-slate-600">
              {product.description ?? "San pham duoc phat trien theo huong toi gian, de mac, de phoi va de bao quan."}
            </Paragraph>
          </div>

          <div className="pdpv2-overview-media-grid">
            <div className="pdpv2-overview-media-large">
              <img src={displayImage ?? techCards[0].image} alt={product.name} className="h-full w-full object-cover" />
            </div>
            <div className="pdpv2-overview-media-large">
              <img
                src={imageList[1] ?? imageList[0] ?? techCards[1].image}
                alt={`${product.name}-look`}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="pdpv2-block">
        <h3 className="pdpv2-section-title">Mua sam theo phong cach</h3>
        {renderProductCards(styleProducts.length > 0 ? styleProducts : relatedProducts.slice(0, 4))}
      </section>

      <section className="pdpv2-block">
        <h3 className="pdpv2-section-title">San pham cung cong nghe</h3>
        {renderProductCards(sameTechProducts.length > 0 ? sameTechProducts : relatedProducts.slice(0, 4))}
      </section>

      <section className="pdpv2-block">
        <h3 className="pdpv2-section-title">Cong nghe vai noi bat</h3>
        <div className="pdpv2-tech-grid">
          {techCards.map((item) => (
            <article key={item.title} className="pdpv2-tech-card">
              <div className="pdpv2-tech-image">
                <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
              </div>
              <div className="pdpv2-tech-content">
                <h4>{item.title}</h4>
                <p className="pdpv2-tech-subtitle">{item.subtitle}</p>
                <p>{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="pdpv2-block">
        <h3 className="pdpv2-section-title">Goi y san pham</h3>
        {renderProductCards(suggestedProducts.length > 0 ? suggestedProducts : relatedProducts.slice(0, 4))}
      </section>

      <section className="pdpv2-review-wrap">
        <h3 className="pdpv2-section-title">Danh gia san pham</h3>
        <div className="pdpv2-review-grid">
          <div className="pdpv2-review-score">
            <p className="pdpv2-score-number">{ratingValue.toFixed(1)}</p>
            <Rate allowHalf disabled value={ratingValue} className="!text-base" />
            <p className="m-0 text-sm text-slate-500">{ratingCount} danh gia tu khach hang</p>
          </div>

          <div className="space-y-3">
            {reviewPercents.map((item) => (
              <div key={item.star} className="pdpv2-review-row">
                <span>{item.star} sao</span>
                <Progress percent={item.percent} showInfo={false} strokeColor="#0f172a" trailColor="#e2e8f0" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pdpv2-block">
        <h3 className="pdpv2-section-title">San pham ban da xem</h3>
        {renderProductCards(viewedProducts)}
      </section>

      {relatedProducts.length > 0 ? (
        <section className="pdpv2-block">
          <h3 className="pdpv2-section-title">Ban co the se thich</h3>
          <div className="related-grid">
            {relatedProducts.slice(0, 4).map((item) => {
              const image = resolveImageUrl(item.media?.find((media) => media.type === "image")?.url);
              return (
                <Link key={item._id} to={`/products/${item.slug}`} className="related-card">
                  <div className="related-card-image">
                    {image ? (
                      <img src={image} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="product-main-fallback">RIO</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      {item.category?.name ?? "San pham"}
                    </p>
                    <h3 className="mt-2 min-h-[48px] text-sm font-semibold text-slate-900">{item.name}</h3>
                    <p className="mt-2 text-base font-bold text-slate-900">
                      {formatCurrency(item.pricing.salePrice)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="pdpv2-member-banner">
        <div>
          <p className="pdpv2-mini-kicker">Dac quyen thanh vien</p>
          <h4>Uu dai rieng cho don tiep theo</h4>
        </div>
        <Button className="!h-11 !rounded-full !border-0 !px-7 !font-bold">Dang ky ngay</Button>
      </div>
    </div>
  );
}
