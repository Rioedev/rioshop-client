import { StarFilled } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { formatStoreCurrency as formatCurrency } from "../utils/storeFormatting";
import {
  type HomeCategory,
  type HomeProduct,
  type ResolvedHomeContent,
} from "../shared/home";
import { StoreHomeShowcaseItem } from "./StoreHomeProductCard";

type StoreHomeShowcaseSectionProps = {
  homeContent: ResolvedHomeContent;
  quickCategories: HomeCategory[];
  activeQuickCategoryId: string;
  showcaseLeadProduct: HomeProduct;
  showcaseRailProducts: HomeProduct[];
  onSelectCategory: (categoryId: string) => void;
};

export function StoreHomeShowcaseSection({
  homeContent,
  quickCategories,
  activeQuickCategoryId,
  showcaseLeadProduct,
  showcaseRailProducts,
  onSelectCategory,
}: StoreHomeShowcaseSectionProps) {
  const activeQuickCategory =
    quickCategories.find((item) => item.id === activeQuickCategoryId) ??
    quickCategories[0];

  return (
    <section className="store-home-v3-section store-home-v3-showcase">
      <div className="store-home-v3-section-head">
        <div>
          <p>{homeContent.sections.showcaseKicker}</p>
          <h2>{homeContent.sections.showcaseTitle}</h2>
        </div>
        <div className="store-home-v3-pill-row">
          {quickCategories.slice(0, 6).map((item) => (
            <button
              key={`pill-${item.id}`}
              type="button"
              className={`store-home-v3-pill ${item.id === activeQuickCategory?.id ? "is-active" : ""}`}
              onClick={() => onSelectCategory(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      <div className="store-home-v3-showcase-layout">
        <Link to={`/products/${showcaseLeadProduct.slug}`} className="store-home-v3-showcase-feature">
          <div className="store-home-v3-showcase-copy">
            <span className="store-home-v3-showcase-badge">
              {activeQuickCategory?.name ??
                showcaseLeadProduct.categoryName ??
                showcaseLeadProduct.category}
            </span>
            <h3>{showcaseLeadProduct.name}</h3>
            <p>{homeContent.sections.showcaseDescription}</p>
            <div className="store-home-v3-showcase-price">
              <strong>{formatCurrency(showcaseLeadProduct.price)}</strong>
              {typeof showcaseLeadProduct.originalPrice === "number" &&
              showcaseLeadProduct.originalPrice > showcaseLeadProduct.price ? (
                <span>{formatCurrency(showcaseLeadProduct.originalPrice)}</span>
              ) : null}
            </div>
            <div className="store-home-v3-showcase-meta">
              <span className="inline-flex items-center gap-1 text-amber-500">
                <StarFilled />
                {showcaseLeadProduct.rating.toFixed(1)}
              </span>
              <span>{showcaseLeadProduct.sold}</span>
            </div>
          </div>
          <div className="store-home-v3-showcase-media">
            <img
              src={showcaseLeadProduct.image}
              alt={showcaseLeadProduct.name}
              className="h-full w-full object-cover"
            />
          </div>
        </Link>

        <div className="store-home-v3-showcase-side">
          {showcaseRailProducts.map((product) => (
            <StoreHomeShowcaseItem key={`showcase-${product.id}`} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

