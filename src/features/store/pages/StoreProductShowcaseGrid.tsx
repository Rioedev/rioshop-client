import { Link } from "react-router-dom";
import { formatStoreCurrency as formatCurrency } from "../utils/storeFormatting";
import {
  getProductColorDots,
  toProductCardImage,
  type ProductRuntime,
} from "./storeProductDetailShared";

type StoreProductShowcaseGridProps = {
  items: ProductRuntime[];
};

export function StoreProductShowcaseGrid({ items }: StoreProductShowcaseGridProps) {
  return (
    <div className="pdpv2-showcase-grid">
      {items.map((item, index) => {
        const colorDots = getProductColorDots(item);
        return (
          <Link key={item._id} to={`/products/${item.slug}`} className="pdpv2-showcase-card">
            <div className="pdpv2-showcase-image">
              <img src={toProductCardImage(item, `RIO-${index + 1}`)} alt={item.name} className="h-full w-full object-cover" />
            </div>
            <div className="pdpv2-showcase-content">
              {colorDots.length > 0 ? (
                <div className="pdpv2-color-row">
                  {colorDots.map((color) => (
                    <span key={`${item._id}-${color.name}-${color.hex}`} className="pdpv2-color-mini" style={{ background: color.hex }} />
                  ))}
                </div>
              ) : null}
              <h4>{item.name}</h4>
              <p>{formatCurrency(item.pricing.salePrice)}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
