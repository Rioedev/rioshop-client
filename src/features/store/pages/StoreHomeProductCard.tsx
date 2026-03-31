import { StarFilled } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { formatStoreCurrency as formatCurrency } from "../utils/storeFormatting";
import type { HomeProduct } from "../shared/home";

type StoreHomeProductCardProps = {
  product: HomeProduct;
  large?: boolean;
};

export function StoreHomeProductCard({
  product,
  large = false,
}: StoreHomeProductCardProps) {
  const hasDiscount =
    typeof product.originalPrice === "number" && product.originalPrice > product.price;

  return (
    <Link
      to={`/products/${product.slug}`}
      className={`store-home-v3-product-card ${large ? "is-large" : ""}`}
    >
      <div className="store-home-v3-product-media">
        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        <span className="store-home-v3-product-chip">
          {product.categoryName ?? product.category}
        </span>
        {hasDiscount && product.badge ? (
          <span className="store-home-v3-product-sale">{product.badge}</span>
        ) : null}
      </div>
      <div className="store-home-v3-product-body">
        <p className="store-home-v3-product-meta">{product.category}</p>
        <h3>{product.name}</h3>
        {product.colors && product.colors.length > 0 ? (
          <div className="store-home-v3-product-colors">
            {product.colors.map((color) => (
              <span
                key={`${product.id}-${color.name}-${color.hex}`}
                className="store-home-v3-product-color"
                style={{ backgroundColor: color.hex }}
                title={color.name}
                aria-label={color.name}
              />
            ))}
          </div>
        ) : null}
        <div className="store-home-v3-price-row">
          <strong>{formatCurrency(product.price)}</strong>
          {hasDiscount ? <span>{formatCurrency(product.originalPrice ?? product.price)}</span> : null}
        </div>
        <div className="store-home-v3-product-foot">
          <span className="inline-flex items-center gap-1 text-amber-500">
            <StarFilled />
            {product.rating.toFixed(1)}
          </span>
          <span>{product.sold}</span>
        </div>
      </div>
    </Link>
  );
}

type StoreHomeShowcaseItemProps = {
  product: HomeProduct;
};

export function StoreHomeShowcaseItem({ product }: StoreHomeShowcaseItemProps) {
  const hasDiscount =
    typeof product.originalPrice === "number" && product.originalPrice > product.price;

  return (
    <Link
      key={`showcase-${product.id}`}
      to={`/products/${product.slug}`}
      className="store-home-v3-showcase-item"
    >
      <div className="store-home-v3-showcase-item-media">
        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
      </div>
      <div className="store-home-v3-showcase-item-copy">
        <p>{product.categoryName ?? product.category}</p>
        <h3>{product.name}</h3>
        <div className="store-home-v3-showcase-item-price">
          <strong>{formatCurrency(product.price)}</strong>
          {hasDiscount ? <span>{formatCurrency(product.originalPrice ?? product.price)}</span> : null}
        </div>
        <div className="store-home-v3-showcase-item-foot">
          <span className="inline-flex items-center gap-1 text-amber-500">
            <StarFilled />
            {product.rating.toFixed(1)}
          </span>
          <span>{product.sold}</span>
        </div>
      </div>
    </Link>
  );
}

