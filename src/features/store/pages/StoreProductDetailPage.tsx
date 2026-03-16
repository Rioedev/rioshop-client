import { Button, InputNumber, Typography, message } from "antd";
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

const demoColors = ["Den", "Trang", "Navy", "Reu"];
const demoSizes = ["S", "M", "L", "XL", "2XL"];

const toMockProduct = (product: MockProduct): Product => ({
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
});

const findMockBySlug = (slug?: string): Product | null => {
  if (!slug) {
    return toMockProduct(mockProducts[0]);
  }

  const found = mockProducts.find((item) => item.slug === slug);
  return found ? toMockProduct(found) : toMockProduct(mockProducts[0]);
};

export function StoreProductDetailPage() {
  const { slug } = useParams();
  const addItem = useCartStore((state) => state.addItem);

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);
  const [selectedColor, setSelectedColor] = useState(demoColors[0]);
  const [selectedSize, setSelectedSize] = useState(demoSizes[1]);

  useEffect(() => {
    let active = true;

    const fetchProduct = async () => {
      setLoading(true);
      setUsingMock(false);

      if (!slug) {
        if (active) {
          setProduct(findMockBySlug());
          setRelatedProducts(mockProducts.slice(1).map((item) => toMockProduct(item)));
          setUsingMock(true);
          setLoading(false);
        }
        return;
      }

      try {
        const result = await productService.getProductBySlug(slug);
        if (!active) {
          return;
        }

        setProduct(result);

        try {
          const related = await productService.getRelatedProducts(result._id);
          if (active) {
            setRelatedProducts(related);
          }
        } catch {
          if (active) {
            setRelatedProducts(
              mockProducts.filter((item) => item.slug !== slug).map((item) => toMockProduct(item)),
            );
          }
        }
      } catch {
        if (!active) {
          return;
        }

        const mockProduct = findMockBySlug(slug);
        setProduct(mockProduct);
        setRelatedProducts(mockProducts.filter((item) => item.slug !== slug).map((item) => toMockProduct(item)));
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

  return (
    <div className="space-y-8">
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

      <section className="product-detail-wrap">
        <div className="product-gallery-panel">
          <div className="product-main-image">
            {displayImage ? (
              <img src={displayImage} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="product-main-fallback">RIO</div>
            )}
          </div>

          {imageList.length > 1 ? (
            <div className="product-thumb-grid">
              {imageList.map((image) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setSelectedImage(image)}
                  className={`product-thumb-btn ${selectedImage === image ? "is-active" : ""}`}
                >
                  <img src={image} alt={product.name} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="product-info-panel">
          <p className="product-info-category">{product.category?.name ?? "San pham moi"}</p>
          <Title level={2} className="!mb-2 !mt-1 !text-3xl !text-slate-900 md:!text-4xl">
            {product.name}
          </Title>

          <div className="mb-5 flex items-end gap-2">
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

          <div className="product-highlight-grid">
            <div className="product-highlight-item">Giao nhanh 2h noi thanh</div>
            <div className="product-highlight-item">Doi size 60 ngay</div>
            <div className="product-highlight-item">Bao hanh duong may 6 thang</div>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
              Mau sac
            </p>
            <div className="flex flex-wrap gap-2">
              {demoColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`option-pill ${selectedColor === color ? "is-active" : ""}`}
                >
                  {color}
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

          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">So luong</p>
            <InputNumber
              min={1}
              value={quantity}
              onChange={(value) => setQuantity(Math.max(1, Number(value ?? 1)))}
              className="!w-32 !rounded-xl"
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
                Xem gio hang
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

      {relatedProducts.length > 0 ? (
        <section>
          <Title level={3} className="!mb-4 !mt-0 !text-2xl">
            Ban co the se thich
          </Title>
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
    </div>
  );
}
