import {
  CheckCircleOutlined,
  HeartOutlined,
  SafetyCertificateOutlined,
  StarFilled,
  TruckOutlined,
} from "@ant-design/icons";
import { Button, InputNumber, Typography } from "antd";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { formatStoreCurrency as formatCurrency } from "../utils/storeFormatting";
import { DEFAULT_COLOR_HEX, type ProductRuntime } from "../shared/productDetail";

const { Paragraph, Title } = Typography;

type StoreProductMainSectionProps = {
  product: ProductRuntime;
  imageList: string[];
  selectedImage?: string;
  displayImage?: string;
  onSelectImage: (image: string) => void;
  ratingValue: number;
  ratingCount: number;
  soldText: string;
  selectedVariantPrice: number;
  selectedVariantBasePrice: number;
  hasDiscount: boolean;
  shortDescriptionPreview: string;
  colorOptions: Array<{ name: string; hex: string }>;
  selectedColor: string;
  onSelectColor: (color: string) => void;
  sizeOptions: string[];
  selectedSize: string;
  onSelectSize: (size: string) => void;
  quantity: number;
  selectedVariantStock: number;
  onQuantityChange: (value: number | null) => void;
  onQuantityKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onQuantityPaste: (event: ClipboardEvent<HTMLInputElement>) => void;
  isSelectedVariantOutOfStock: boolean;
  onAddToCart: () => void;
  isInWishlist: boolean;
  onToggleWishlist: () => void;
};

export function StoreProductMainSection({
  product,
  imageList,
  selectedImage,
  displayImage,
  onSelectImage,
  ratingValue,
  ratingCount,
  soldText,
  selectedVariantPrice,
  selectedVariantBasePrice,
  hasDiscount,
  shortDescriptionPreview,
  colorOptions,
  selectedColor,
  onSelectColor,
  sizeOptions,
  selectedSize,
  onSelectSize,
  quantity,
  selectedVariantStock,
  onQuantityChange,
  onQuantityKeyDown,
  onQuantityPaste,
  isSelectedVariantOutOfStock,
  onAddToCart,
  isInWishlist,
  onToggleWishlist,
}: StoreProductMainSectionProps) {
  return (
    <section className="pdpv2-main-wrap">
      <div className="pdpv2-gallery-panel">
        <div className="pdpv2-gallery-grid">
          {imageList.length > 1 ? (
            <div className="pdpv2-thumb-column">
              {imageList.map((image) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => onSelectImage(image)}
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
        <p className="product-info-category">{product.category?.name ?? "Sáº£n pháº©m má»›i"}</p>
        <Title level={2} className="mb-2! mt-1! text-3xl! text-slate-900! md:text-[34px]!">
          {product.name}
        </Title>

        <div className="pdpv2-rating-row">
          <span className="inline-flex items-center gap-1 text-amber-500">
            <StarFilled />
            {ratingValue.toFixed(1)}
          </span>
          <span>({ratingCount} Ä‘Ã¡nh giÃ¡)</span>
          <span>{soldText}</span>
        </div>

        <div className="mb-4 mt-4 flex items-end gap-2">
          <span className="text-3xl font-black text-slate-900">
            {formatCurrency(selectedVariantPrice)}
          </span>
          {hasDiscount ? (
            <span className="text-lg text-slate-400 line-through">
              {formatCurrency(selectedVariantBasePrice)}
            </span>
          ) : null}
        </div>

        {shortDescriptionPreview ? (
          <Paragraph className="mb-4! text-base! leading-7! text-slate-600!">
            {shortDescriptionPreview}
          </Paragraph>
        ) : null}

        <div className="pdpv2-policy-grid">
          <div className="pdpv2-policy-item">
            <TruckOutlined />
            Giao nhanh 2h ná»™i thÃ nh
          </div>
          <div className="pdpv2-policy-item">
            <SafetyCertificateOutlined />
            ChÃ­nh hÃ£ng 100%
          </div>
          <div className="pdpv2-policy-item">
            <CheckCircleOutlined />
            Äá»•i tráº£ 60 ngÃ y
          </div>
          <div className="pdpv2-policy-item">
            <HeartOutlined />
            TÆ° váº¥n size 24/7
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">MÃ u sáº¯c</p>
          <div className="flex flex-wrap gap-2">
            {colorOptions.map((color) => (
              <button
                key={color.name}
                type="button"
                onClick={() => onSelectColor(color.name)}
                className={`pdpv2-color-pill ${selectedColor === color.name ? "is-active" : ""}`}
              >
                <span className="pdpv2-color-dot" style={{ background: color.hex || DEFAULT_COLOR_HEX }} />
                {color.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">KÃ­ch thÆ°á»›c</p>
          <div className="flex flex-wrap gap-2">
            {sizeOptions.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onSelectSize(size)}
                className={`option-pill ${selectedSize === size ? "is-active" : ""}`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <p className="m-0 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Sá»‘ lÆ°á»£ng</p>
          <InputNumber
            min={1}
            max={selectedVariantStock}
            value={quantity}
            onChange={onQuantityChange}
            onKeyDown={onQuantityKeyDown}
            onPaste={onQuantityPaste}
            className="w-28! rounded-xl!"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="primary"
            size="large"
            className="h-11! rounded-full! bg-slate-900! px-8! font-bold! shadow-none!"
            disabled={isSelectedVariantOutOfStock}
            onClick={onAddToCart}
          >
            {isSelectedVariantOutOfStock ? "Háº¿t hÃ ng" : "ThÃªm vÃ o giá»"}
          </Button>
          <Button
            size="large"
            className={`h-11! rounded-full! px-7! font-semibold! ${isInWishlist ? "border-rose-200! text-rose-600!" : "border-slate-300!"}`}
            icon={<HeartOutlined />}
            onClick={onToggleWishlist}
          >
            {isInWishlist ? "ÄÃ£ lÆ°u" : "YÃªu thÃ­ch"}
          </Button>
          <Link to="/cart">
            <Button size="large" className="h-11! rounded-full! border-slate-300! px-7! font-semibold!">
              Mua ngay
            </Button>
          </Link>
        </div>

        <div className="product-note-list">
          <p>
            <strong>Cháº¥t liá»‡u:</strong> {(product.material ?? ["Cotton cao cáº¥p"]).join(" | ")}
          </p>
          <p>
            <strong>Báº£o quáº£n:</strong> {(product.care ?? ["Giáº·t nháº¹, trÃ¡nh nhiá»‡t cao"]).join(" | ")}
          </p>
        </div>
      </div>
    </section>
  );
}


