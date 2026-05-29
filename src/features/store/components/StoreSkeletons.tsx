type BrandSpinnerProps = {
  label?: string;
  size?: "sm" | "md" | "lg";
};

export function BrandSpinner({ label, size = "md" }: BrandSpinnerProps) {
  return (
    <div className={`store-brand-spinner store-brand-spinner--${size}`} role="status" aria-live="polite">
      <div className="store-brand-spinner__dots" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      {label ? <p className="store-brand-spinner__label">{label}</p> : null}
    </div>
  );
}

export function BlogCardSkeleton() {
  return (
    <article className="store-skeleton-card" aria-hidden>
      <div className="store-skeleton-card__image" style={{ height: 200 }} />
      <div className="store-skeleton-card__body">
        <div className="store-skeleton-card__line store-skeleton-card__line--xs" />
        <div className="store-skeleton-card__line store-skeleton-card__line--lg" />
        <div className="store-skeleton-card__line store-skeleton-card__line--md" />
        <div className="store-skeleton-card__line store-skeleton-card__line--sm" />
      </div>
    </article>
  );
}

export function BlogDetailSkeleton() {
  return (
    <div className="store-skeleton-blog-detail" aria-hidden>
      <div className="store-skeleton-card__line store-skeleton-card__line--xs" />
      <div className="store-skeleton-card__line store-skeleton-card__line--xl" />
      <div className="store-skeleton-card__line store-skeleton-card__line--lg" />
      <div className="store-skeleton-blog-detail__cover" />
      <div className="store-skeleton-blog-detail__body">
        <div className="store-skeleton-card__line store-skeleton-card__line--lg" />
        <div className="store-skeleton-card__line store-skeleton-card__line--lg" />
        <div className="store-skeleton-card__line store-skeleton-card__line--md" />
        <div className="store-skeleton-card__line store-skeleton-card__line--lg" />
        <div className="store-skeleton-card__line store-skeleton-card__line--sm" />
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="store-skeleton-card" aria-hidden>
      <div className="store-skeleton-card__image" />
      <div className="store-skeleton-card__body">
        <div className="store-skeleton-card__line store-skeleton-card__line--xs" />
        <div className="store-skeleton-card__line store-skeleton-card__line--lg" />
        <div className="store-skeleton-card__line store-skeleton-card__line--md" />
        <div className="store-skeleton-card__swatches">
          <span />
          <span />
          <span />
        </div>
        <div className="store-skeleton-card__price" />
        <div className="store-skeleton-card__actions">
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="store-skeleton-detail" aria-hidden>
      <div className="store-skeleton-detail__gallery">
        <div className="store-skeleton-detail__main" />
        <div className="store-skeleton-detail__thumbs">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="store-skeleton-detail__info">
        <div className="store-skeleton-card__line store-skeleton-card__line--xs" />
        <div className="store-skeleton-card__line store-skeleton-card__line--xl" />
        <div className="store-skeleton-card__line store-skeleton-card__line--lg" />
        <div className="store-skeleton-detail__price" />
        <div className="store-skeleton-card__line store-skeleton-card__line--sm" />
        <div className="store-skeleton-detail__chips">
          <span />
          <span />
          <span />
        </div>
        <div className="store-skeleton-detail__button" />
      </div>
    </div>
  );
}
