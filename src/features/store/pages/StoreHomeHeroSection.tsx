import { Button } from "antd";
import { Link } from "react-router-dom";
import { formatStoreCurrency as formatCurrency } from "../utils/storeFormatting";
import type { ResolvedHomeContent } from "../shared/home";

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
  homeContent: ResolvedHomeContent;
  heroSlides: HomeHeroSlide[];
  activeHeroIndex: number;
  campaignImage: string;
  primaryCtaLink: string;
  secondaryCtaLink: string;
  fallbackPrice: number;
  onSelectSlide: (index: number) => void;
};

export function StoreHomeHeroSection({
  homeContent,
  heroSlides,
  activeHeroIndex,
  campaignImage,
  primaryCtaLink,
  secondaryCtaLink,
  fallbackPrice,
  onSelectSlide,
}: StoreHomeHeroSectionProps) {
  const normalizedHeroIndex =
    heroSlides.length > 0 ? activeHeroIndex % heroSlides.length : 0;
  const activeHeroSlide = heroSlides[normalizedHeroIndex] ?? heroSlides[0];

  return (
    <section
      className="store-home-v3-hero store-home-v3-bleed"
      style={{
        backgroundImage: `linear-gradient(118deg, rgba(15, 79, 168, 0.82), rgba(15, 79, 168, 0.24)), url(${activeHeroSlide?.image ?? campaignImage})`,
      }}
    >
      <div className="store-home-v3-hero-inner">
        <div className="store-home-v3-hero-copy">
          <div className="store-home-v3-hero-copy-top">
            <p className="store-home-v3-kicker">
              {activeHeroSlide?.kicker ?? homeContent.hero.kicker}
            </p>
            <span className="store-home-v3-hero-badge">
              {activeHeroSlide?.badge ?? homeContent.labels.flashDeal}
            </span>
          </div>
          <h1>
            {activeHeroSlide?.titleLine1 ?? homeContent.hero.titleLine1}
            <br />
            {activeHeroSlide?.titleLine2 ?? homeContent.hero.titleLine2}
          </h1>
          <p className="store-home-v3-hero-text">
            {activeHeroSlide?.description ?? homeContent.hero.description}
          </p>
          <div className="store-home-v3-hero-actions">
            <Link to={activeHeroSlide?.href ?? primaryCtaLink}>
              <Button
                type="primary"
                className="store-home-v3-primary-btn h-12! rounded-full! px-7! font-bold! shadow-none!"
              >
                {activeHeroSlide?.primaryLabel ?? homeContent.hero.primaryCtaLabel}
              </Button>
            </Link>
            <Link to={activeHeroSlide?.secondaryHref ?? secondaryCtaLink}>
              <Button className="store-home-v3-secondary-btn h-12! rounded-full! px-7! font-bold!">
                {activeHeroSlide?.secondaryLabel ?? homeContent.hero.secondaryCtaLabel}
              </Button>
            </Link>
          </div>

          <div className="store-home-v3-hero-panel">
            <div className="store-home-v3-hero-panel-item">
              <span>{homeContent.labels.heroPriceLabel}</span>
              <strong>
                {activeHeroSlide?.priceLabel ?? formatCurrency(fallbackPrice)}
              </strong>
            </div>
            <div className="store-home-v3-hero-panel-item">
              <span>{homeContent.labels.heroSignalLabel}</span>
              <strong>
                {activeHeroSlide?.meta ??
                  homeContent.hero.metrics[0]?.value ??
                  homeContent.labels.updatingLabel}
              </strong>
            </div>
          </div>

          {heroSlides.length > 1 ? (
            <div className="store-home-v3-hero-dots" aria-label="Chọn ảnh nổi bật">
              {heroSlides.map((slide, index) => (
                <button
                  key={`hero-dot-${slide.id}`}
                  type="button"
                  className={`store-home-v3-hero-dot ${index === normalizedHeroIndex ? "is-active" : ""}`}
                  aria-label={`Hiển thị ảnh nổi bật ${index + 1}`}
                  onClick={() => onSelectSlide(index)}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="store-home-v3-hero-rail">
          {heroSlides.map((slide, index) => (
            <button
              key={`hero-${slide.id}`}
              type="button"
              className={`store-home-v3-hero-mini ${index === normalizedHeroIndex ? "is-active" : ""}`}
              onClick={() => onSelectSlide(index)}
            >
              <div className="store-home-v3-hero-mini-media">
                <img src={slide.image} alt={slide.titleLine1} className="h-full w-full object-cover" />
              </div>
              <div>
                <p>{slide.kicker}</p>
                <h3>{slide.titleLine1}</h3>
                <strong>{slide.priceLabel}</strong>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}


