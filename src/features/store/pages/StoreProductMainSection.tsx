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
  const discountPercent =
    hasDiscount && selectedVariantBasePrice > 0
      ? Math.round(((selectedVariantBasePrice - selectedVariantPrice) / selectedVariantBasePrice) * 100)
      : 0;

  const hasColorOptions = colorOptions.length > 0;
  const hasSizeOptions = sizeOptions.length > 0;
  const hasNoVariants = !hasColorOptions && !hasSizeOptions;
  const isPurchaseBlocked = hasNoVariants || isSelectedVariantOutOfStock;
  const primaryButtonLabel = hasNoVariants
    ? "Chưa có biến thể"
    : isSelectedVariantOutOfStock
      ? "Hết hàng"
      : "Thêm vào giỏ";

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

        <div className="pdpv2-price-row mb-4 mt-4">
          <span className="pdpv2-sale-price">
            {formatCurrency(selectedVariantPrice)}
          </span>
          {hasDiscount ? (
            <span className="pdpv2-base-price">
              {formatCurrency(selectedVariantBasePrice)}
            </span>
          ) : null}
          {discountPercent > 0 ? (
            <span className="pdpv2-discount-badge">-{discountPercent}%</span>
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

        {hasNoVariants ? (
          <div className="mt-5 rounded-2xl border border-[#e4eaf2] bg-[#f6f9fd] px-4 py-3 text-sm text-slate-600">
            Sản phẩm này hiện chưa có biến thể đang bán.
          </div>
        ) : null}

        {hasColorOptions ? (
          <div className="mt-5">
            <p className="mb-3 text-sm font-semibold text-slate-700">
              Màu sắc: <span className="font-bold text-slate-900">{selectedColor || colorOptions[0]?.name}</span>
            </p>
            <div className="flex flex-wrap gap-3">
              {colorOptions.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => onSelectColor(color.name)}
                  className={`pdpv2-color-swatch ${selectedColor === color.name ? "is-active" : ""}`}
                  aria-label={color.name}
                  title={color.name}
                >
                  <span
                    className="pdpv2-color-swatch__fill"
                    style={{ background: color.hex || DEFAULT_COLOR_HEX }}
                  />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {hasSizeOptions ? (
          <div className="mt-5">
            <p className="mb-3 text-sm font-semibold text-slate-700">
              Kích thước: <span className="font-bold text-slate-900">{selectedSize || sizeOptions[0]}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {sizeOptions.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onSelectSize(size)}
                  className={`pdpv2-size-pill ${selectedSize === size ? "is-active" : ""}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {hasNoVariants ? null : (
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <p className="m-0 text-sm font-semibold text-slate-700">Số lượng</p>
            <div className="pdpv2-quantity-group" role="group" aria-label="Chọn số lượng">
              <button
                type="button"
                className="pdpv2-quantity-btn"
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                aria-label="Giảm số lượng"
              >
                −
              </button>
              <InputNumber
                min={1}
                max={selectedVariantStock}
                value={quantity}
                onChange={onQuantityChange}
                onKeyDown={onQuantityKeyDown}
                onPaste={onQuantityPaste}
                controls={false}
                bordered={false}
                className="pdpv2-quantity-input"
              />
              <button
                type="button"
                className="pdpv2-quantity-btn"
                onClick={() => onQuantityChange(Math.min(selectedVariantStock, quantity + 1))}
                disabled={quantity >= selectedVariantStock}
                aria-label="Tăng số lượng"
              >
                +
              </button>
            </div>
            <p className="m-0 text-xs text-slate-500">
              Còn <strong className="text-slate-700">{selectedVariantStock}</strong> sản phẩm
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="primary"
            size="large"
            className="h-11! rounded-full! bg-slate-900! px-8! font-bold! shadow-none!"
            disabled={isPurchaseBlocked}
            onClick={onAddToCart}
          >
            {primaryButtonLabel}
          </Button>
          <Button
            size="large"
            className={`h-11! rounded-full! px-7! font-semibold! ${isInWishlist ? "border-rose-200! text-rose-600!" : "border-slate-300!"}`}
            icon={<HeartOutlined />}
            onClick={onToggleWishlist}
          >
            {isInWishlist ? "Đã lưu" : "Yêu thích"}
          </Button>
          {hasNoVariants ? null : (
            <Link to="/cart">
              <Button size="large" className="h-11! rounded-full! border-slate-300! px-7! font-semibold!">
                Mua ngay
              </Button>
            </Link>
          )}
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



