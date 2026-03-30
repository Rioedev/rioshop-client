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
        <p className="product-info-category">{product.category?.name ?? "Sản phẩm mới"}</p>
        <Title level={2} className="mb-2! mt-1! text-3xl! text-slate-900! md:text-[34px]!">
          {product.name}
        </Title>

        <div className="pdpv2-rating-row">
          <span className="inline-flex items-center gap-1 text-amber-500">
            <StarFilled />
            {ratingValue.toFixed(1)}
          </span>
          <span>({ratingCount} đánh giá)</span>
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
            Giao nhanh 2h nội thành
          </div>
          <div className="pdpv2-policy-item">
            <SafetyCertificateOutlined />
            Chính hãng 100%
          </div>
          <div className="pdpv2-policy-item">
            <CheckCircleOutlined />
            Đổi trả 60 ngày
          </div>
          <div className="pdpv2-policy-item">
            <HeartOutlined />
            Tư vấn size 24/7
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Màu sắc</p>
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
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Kích thước</p>
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
          <p className="m-0 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Số lượng</p>
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
            {isSelectedVariantOutOfStock ? "Hết hàng" : "Thêm vào giỏ"}
          </Button>
          <Button
            size="large"
            className={`h-11! rounded-full! px-7! font-semibold! ${isInWishlist ? "border-rose-200! text-rose-600!" : "border-slate-300!"}`}
            icon={<HeartOutlined />}
            onClick={onToggleWishlist}
          >
            {isInWishlist ? "Đã lưu" : "Yêu thích"}
          </Button>
          <Link to="/cart">
            <Button size="large" className="h-11! rounded-full! border-slate-300! px-7! font-semibold!">
              Mua ngay
            </Button>
          </Link>
        </div>

        <div className="product-note-list">
          <p>
            <strong>Chất liệu:</strong> {(product.material ?? ["Cotton cao cấp"]).join(" | ")}
          </p>
          <p>
            <strong>Bảo quản:</strong> {(product.care ?? ["Giặt nhẹ, tránh nhiệt cao"]).join(" | ")}
          </p>
        </div>
      </div>
    </section>
  );
}



