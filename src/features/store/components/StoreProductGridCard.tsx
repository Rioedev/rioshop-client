import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

type StoreProductGridCardProps = {
  href: string;
  imageUrl?: string;
  name: string;
  price: string;
  originalPrice?: string;
  categoryLabel?: string;
  badge?: string;
  colorSwatches?: Array<{
    key: string;
    label: string;
    hex?: string;
    imageUrl?: string;
  }>;
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
  colorSwatches,
  footer,
}: StoreProductGridCardProps) {
  const [activeColorKey, setActiveColorKey] = useState(colorSwatches?.[0]?.key ?? "");

  useEffect(() => {
    setActiveColorKey(colorSwatches?.[0]?.key ?? "");
  }, [href, colorSwatches]);

  const activeColor = useMemo(
    () => colorSwatches?.find((color) => color.key === activeColorKey) ?? colorSwatches?.[0],
    [activeColorKey, colorSwatches],
  );

  const displayedImage = activeColor?.imageUrl ?? imageUrl;

  return (
    <article className="store-home-v3-product-card">
      <Link to={href} className="block">
        <div className="store-home-v3-product-media">
          {displayedImage ? (
            <img src={displayedImage} alt={name} className="h-full w-full object-cover object-top" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-lg font-black tracking-[0.22em] text-slate-400">
              RIO
            </div>
          )}
          {categoryLabel ? <span className="store-home-v3-product-chip">{categoryLabel}</span> : null}
          {badge ? <span className="store-home-v3-product-sale">{badge}</span> : null}
        </div>
      </Link>

      <div className="store-home-v3-product-body">
        {categoryLabel ? <p className="store-home-v3-product-meta">{categoryLabel}</p> : null}

        <h3>
          <Link to={href} className="text-current no-underline hover:text-current">
            {name}
          </Link>
        </h3>

        {colorSwatches && colorSwatches.length > 0 ? (
          <div className="store-home-v3-product-colors" aria-label="Màu sắc sản phẩm">
            {colorSwatches.slice(0, 5).map((color) => (
              <span
                key={color.key}
                role="button"
                tabIndex={0}
                className={`store-home-v3-product-color ${activeColor?.key === color.key ? "is-active" : ""}`}
                style={{ backgroundColor: color.hex || "#e2e8f0" }}
                title={color.label}
                aria-label={color.label}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setActiveColorKey(color.key);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") {
                    return;
                  }
                  event.preventDefault();
                  event.stopPropagation();
                  setActiveColorKey(color.key);
                }}
              />
            ))}
          </div>
        ) : null}

        <div className="store-home-v3-price-row">
          <strong>{price}</strong>
          {originalPrice ? <span>{originalPrice}</span> : null}
        </div>

        {footer ? <div className="store-home-v3-product-footer">{footer}</div> : null}
      </div>
    </article>
  );
}
