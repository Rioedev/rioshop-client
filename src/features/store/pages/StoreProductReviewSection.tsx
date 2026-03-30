import { Button, Input, Progress, Rate } from "antd";
import { Link } from "react-router-dom";
import type { ReviewItem } from "../../../services/reviewService";
import { formatReviewDate } from "../shared/productDetail";

type ReviewPercent = {
  star: number;
  percent: number;
};

type StoreProductReviewSectionProps = {
  ratingValue: number;
  ratingCount: number;
  reviewPercents: ReviewPercent[];
  isAuthenticated: boolean;
  reviewRating: number;
  onReviewRatingChange: (value: number) => void;
  reviewBody: string;
  onReviewBodyChange: (value: string) => void;
  reviewSubmitting: boolean;
  onSubmitReview: () => void;
  recentReviews: ReviewItem[];
};

export function StoreProductReviewSection({
  ratingValue,
  ratingCount,
  reviewPercents,
  isAuthenticated,
  reviewRating,
  onReviewRatingChange,
  reviewBody,
  onReviewBodyChange,
  reviewSubmitting,
  onSubmitReview,
  recentReviews,
}: StoreProductReviewSectionProps) {
  return (
    <section className="pdpv2-review-wrap">
      <h3 className="pdpv2-section-title">ÄÃ¡nh giÃ¡ sáº£n pháº©m</h3>
      <div className="pdpv2-review-grid">
        <div className="pdpv2-review-score">
          <p className="pdpv2-score-number">{ratingValue.toFixed(1)}</p>
          <Rate allowHalf disabled value={ratingValue} className="text-base!" />
          <p className="m-0 text-sm text-slate-500">{ratingCount} Ä‘Ã¡nh giÃ¡ tá»« khÃ¡ch hÃ ng</p>
        </div>

        <div className="space-y-3">
          {reviewPercents.map((item) => (
            <div key={item.star} className="pdpv2-review-row">
              <span>{item.star} sao</span>
              <Progress percent={item.percent} showInfo={false} strokeColor="#0f172a" trailColor="#e2e8f0" />
            </div>
          ))}
        </div>
      </div>

      <div className="pdpv2-review-composer">
        <div className="pdpv2-review-composer-head">
          <div>
            <p className="pdpv2-review-composer-kicker">Chia sáº» tráº£i nghiá»‡m cá»§a báº¡n</p>
            <p className="pdpv2-review-composer-hint">
              ÄÃ¡nh giÃ¡ thá»±c táº¿ sáº½ giÃºp ngÆ°á»i mua khÃ¡c chá»n Ä‘Ãºng sáº£n pháº©m hÆ¡n.
            </p>
          </div>
          {!isAuthenticated ? (
            <Link to="/login" className="pdpv2-review-login">
              ÄÄƒng nháº­p Ä‘á»ƒ bÃ¬nh luáº­n
            </Link>
          ) : null}
        </div>

        <div className="mt-4 space-y-3">
          <div className="pdpv2-review-rating-line">
            <span>Cháº¥m Ä‘iá»ƒm cá»§a báº¡n</span>
            <Rate
              value={reviewRating}
              onChange={onReviewRatingChange}
              disabled={!isAuthenticated || reviewSubmitting}
            />
          </div>

          <Input.TextArea
            value={reviewBody}
            onChange={(event) => onReviewBodyChange(event.target.value)}
            placeholder="Chia sáº» tráº£i nghiá»‡m cá»§a báº¡n vá» sáº£n pháº©m..."
            rows={5}
            maxLength={1000}
            showCount
            disabled={!isAuthenticated || reviewSubmitting}
            className="pdpv2-review-input"
          />

          <div className="pdpv2-review-actions">
            <span>Vui lÃ²ng giá»¯ ná»™i dung lá»‹ch sá»±, há»¯u Ã­ch vÃ  Ä‘Ãºng tráº£i nghiá»‡m thá»±c táº¿.</span>
            <Button
              type="primary"
              onClick={onSubmitReview}
              loading={reviewSubmitting}
              disabled={!isAuthenticated}
              className="rounded-full! px-5! font-semibold!"
            >
              Gá»­i bÃ¬nh luáº­n
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {recentReviews.length > 0 ? (
          recentReviews.slice(0, 3).map((review) => (
            <article key={review.id} className="pdpv2-review-item">
              <div className="pdpv2-review-item-head">
                <div>
                  <p className="pdpv2-review-user">{review.user?.fullName || "KhÃ¡ch hÃ ng Ä‘Ã£ mua"}</p>
                  <p className="pdpv2-review-date">{formatReviewDate(review.createdAt)}</p>
                </div>
                <Rate disabled value={review.rating} className="text-xs!" />
              </div>
              <p className="m-0 mt-2 text-sm text-slate-600">{review.body}</p>
              {review.adminReply?.body ? (
                <div className="pdpv2-review-reply">
                  <span className="font-semibold text-slate-700">Pháº£n há»“i tá»« shop:</span>{" "}
                  {review.adminReply.body}
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <p className="m-0 text-sm text-slate-500">ChÆ°a cÃ³ Ä‘Ã¡nh giÃ¡ chi tiáº¿t cho sáº£n pháº©m nÃ y.</p>
        )}
      </div>
    </section>
  );
}


