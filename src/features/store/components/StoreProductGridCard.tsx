import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type StoreProductGridCardProps = {
  href: string;
  imageUrl?: string;
  name: string;
  price: string;
  originalPrice?: string;
  categoryLabel?: string;
  badge?: string;
  footer?: ReactNode;
};

export function StoreProductGridCard({
  href,
  imageUrl,
  name,
  price,
  originalPrice,
  categoryLabel,
  badge,
  footer,
}: StoreProductGridCardProps) {
  return (
    <article className="cool-product-card">
      <Link to={href} className="block">
        <div className="cool-product-media">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="cool-product-fallback">RIO</div>
          )}
          {categoryLabel ? <span className="cool-product-badge">{categoryLabel}</span> : null}
          {badge ? <span className="cool-product-discount">{badge}</span> : null}
        </div>
      </Link>

      <div className="p-3">
        <Link to={href} className="text-sm font-semibold text-slate-900 hover:text-slate-700">
          {name}
        </Link>

        <div className="mt-2 flex items-end gap-2">
          <span className="text-base font-extrabold text-slate-900">{price}</span>
          {originalPrice ? <span className="text-sm text-slate-400 line-through">{originalPrice}</span> : null}
        </div>

        {footer ? <div className="mt-3 flex gap-2">{footer}</div> : null}
      </div>
    </article>
  );
}
