import { Link } from "react-router-dom";

export type HomeHeroSlide = {
  id: string;
  image: string;
  href: string;
  secondaryHref: string;
  kicker: string;
  titleLine1: string;
  titleLine2: string;
  description: string;
  primaryLabel: string;
  secondaryLabel: string;
  priceLabel: string;
  meta: string;
  badge: string;
};

type StoreHomeHeroSectionProps = {
  heroSlides: HomeHeroSlide[];
  activeHeroIndex: number;
  campaignImage: string;
  onSelectSlide: (index: number) => void;
};

export function StoreHomeHeroSection({
  heroSlides,
  activeHeroIndex,
  campaignImage,
  onSelectSlide,
}: StoreHomeHeroSectionProps) {
  const normalizedHeroIndex =
    heroSlides.length > 0 ? activeHeroIndex % heroSlides.length : 0;
  const activeHeroSlide = heroSlides[normalizedHeroIndex] ?? heroSlides[0];
  const heroImage = activeHeroSlide?.image ?? campaignImage;
  const heroHref = activeHeroSlide?.href ?? "/products";
  const heroAlt = activeHeroSlide?.titleLine1 || "Store banner";

  return (
    <section className="store-home-v3-hero store-home-v3-bleed store-home-v3-hero-image-only">
      <div className="store-home-v3-hero-inner">
        <Link
          to={heroHref}
          className="store-home-v3-hero-image-link"
          aria-label="Xem chi tiết banner"
        >
          <img
            src={heroImage}
            alt={heroAlt}
            className="store-home-v3-hero-image"
          />
        </Link>

        {heroSlides.length > 1 ? (
          <>
            <button
              type="button"
              className="store-home-v3-hero-nav-btn store-home-v3-hero-nav-btn--prev"
              aria-label="Slide trước"
              onClick={() =>
                onSelectSlide((normalizedHeroIndex - 1 + heroSlides.length) % heroSlides.length)
              }
            >
              ‹
            </button>

            <button
              type="button"
              className="store-home-v3-hero-nav-btn store-home-v3-hero-nav-btn--next"
              aria-label="Slide sau"
              onClick={() => onSelectSlide((normalizedHeroIndex + 1) % heroSlides.length)}
            >
              ›
            </button>

            <div className="store-home-v3-hero-image-controls">
              <div className="store-home-v3-hero-image-dots" aria-label="Chọn slide">
                {heroSlides.map((slide, index) => (
                  <button
                    key={`hero-image-dot-${slide.id}`}
                    type="button"
                    className={`store-home-v3-hero-dot ${index === normalizedHeroIndex ? "is-active" : ""}`}
                    aria-label={`Hiển thị slide ${index + 1}`}
                    onClick={() => onSelectSlide(index)}
                  />
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
