import {
  CheckCircleOutlined,
  HeartOutlined,
  SafetyCertificateOutlined,
  StarFilled,
  TruckOutlined,
} from "@ant-design/icons";
import { Button, InputNumber, Modal, Typography } from "antd";
import { useMemo, useState, type ClipboardEvent, type KeyboardEvent } from "react";
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
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const discountPercent =
    hasDiscount && selectedVariantBasePrice > 0
      ? Math.round(((selectedVariantBasePrice - selectedVariantPrice) / selectedVariantBasePrice) * 100)
      : 0;

  const hasColorOptions = colorOptions.length > 0;
  const hasSizeOptions = sizeOptions.length > 0;
  const hasNoVariants = !hasColorOptions && !hasSizeOptions;
  const sizeChartRows = useMemo(
    () => (product.sizeChart?.rows ?? []).filter((row) => row.size?.trim()),
    [product.sizeChart?.rows],
  );
  const displayedSizeRows =
    sizeChartRows.length > 0
      ? sizeChartRows
      : sizeOptions.map((size) => ({
          size,
          shoulder: null,
          chest: null,
          waist: null,
          hip: null,
          length: null,
        }));
  const hasSizeGuide = displayedSizeRows.length > 0;
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
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="m-0 text-sm font-semibold text-slate-700">
                Kích thước: <span className="font-bold text-slate-900">{selectedSize || sizeOptions[0]}</span>
              </p>
              {hasSizeGuide ? (
                <Button
                  type="link"
                  className="h-auto! p-0! text-sm! font-semibold! text-slate-700!"
                  onClick={() => setIsSizeGuideOpen(true)}
                >
                  Hướng dẫn chọn size
                </Button>
              ) : null}
            </div>
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

        <Modal
          title="Hướng dẫn chọn size"
          open={isSizeGuideOpen}
          onCancel={() => setIsSizeGuideOpen(false)}
          footer={null}
          width={720}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-3 font-semibold">Size</th>
                  <th className="py-2 pr-3 font-semibold">Vai</th>
                  <th className="py-2 pr-3 font-semibold">Ngực</th>
                  <th className="py-2 pr-3 font-semibold">Eo</th>
                  <th className="py-2 pr-3 font-semibold">Hông</th>
                  <th className="py-2 pr-3 font-semibold">Dài</th>
                </tr>
              </thead>
              <tbody>
                {displayedSizeRows.map((row) => (
                  <tr key={row.size} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-bold text-slate-900">{row.size}</td>
                    <td className="py-2 pr-3 text-slate-700">{row.shoulder ? `${row.shoulder} cm` : "-"}</td>
                    <td className="py-2 pr-3 text-slate-700">{row.chest ? `${row.chest} cm` : "-"}</td>
                    <td className="py-2 pr-3 text-slate-700">{row.waist ? `${row.waist} cm` : "-"}</td>
                    <td className="py-2 pr-3 text-slate-700">{row.hip ? `${row.hip} cm` : "-"}</td>
                    <td className="py-2 pr-3 text-slate-700">{row.length ? `${row.length} cm` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            <p className="m-0">
              Nếu số đo nằm giữa hai size, hãy chọn size lớn hơn để mặc thoải mái hơn. Với sản phẩm
              form ôm, nên ưu tiên số đo ngực/eo; với sản phẩm form rộng, có thể chọn theo size thường mặc.
            </p>
            {sizeChartRows.length === 0 ? (
              <p className="m-0 mt-2 text-slate-500">
                Bảng số đo chi tiết của sản phẩm này đang được cập nhật.
              </p>
            ) : null}
          </div>
        </Modal>

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



