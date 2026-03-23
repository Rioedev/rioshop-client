import { Button, Tag } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  StoreEmptyState,
  StoreMetricGrid,
  StorePageShell,
  StoreHeroSection,
  StorePanelFrame,
  StoreSectionHeader,
  storeButtonClassNames,
} from "../components/StorePageChrome";
import { flashSaleService, type FlashSale } from "../../../services/flashSaleService";
import { formatStoreCurrency } from "../utils/storeFormatting";

const formatDateTime = (value?: string) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const getSalePhase = (sale: FlashSale) => {
  const now = Date.now();
  const startsAt = new Date(sale.startsAt).getTime();
  const endsAt = new Date(sale.endsAt).getTime();

  if (Number.isNaN(startsAt) || Number.isNaN(endsAt)) {
    return { label: "Không xác định", color: "default" as const };
  }

  if (startsAt > now) {
    return { label: "Sắp diễn ra", color: "blue" as const };
  }

  if (endsAt < now) {
    return { label: "Đã kết thúc", color: "default" as const };
  }

  return { label: "Đang diễn ra", color: "green" as const };
};

const fallbackBanner = "https://dummyimage.com/1280x520/e2e8f0/0f172a&text=Flash+Sale";

export function StoreFlashSalesPage() {
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadSales = async () => {
      setLoading(true);
      try {
        const result = await flashSaleService.getFlashSales({
          page: 1,
          limit: 24,
          isActive: true,
        });

        if (!active) {
          return;
        }

        setSales(result.docs);
      } catch {
        if (active) {
          setSales([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSales();

    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const running = sales.filter((sale) => getSalePhase(sale).label === "Đang diễn ra").length;
    const upcoming = sales.filter((sale) => getSalePhase(sale).label === "Sắp diễn ra").length;
    const totalSlots = sales.reduce((sum, sale) => sum + sale.slots.length, 0);
    return { running, upcoming, totalSlots };
  }, [sales]);

  if (!loading && sales.length === 0) {
    return (
      <StoreEmptyState
        kicker="Flash Sale"
        title="Hiện chưa có chương trình flash sale"
        description="Các chiến dịch mới sẽ xuất hiện tại đây ngay khi được kích hoạt."
        action={
          <Link to="/products">
            <Button type="primary" className={storeButtonClassNames.primary}>
              Xem sản phẩm
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <StorePageShell>
      <StoreHeroSection
        kicker="Flash Sale"
        title="Chương trình giảm giá chớp nhoáng"
        description="Theo dõi danh sách chương trình đang chạy và sắp mở để săn deal đúng thời điểm."
        action={
          <Link to="/products">
            <Button className={storeButtonClassNames.secondary}>Xem toàn bộ sản phẩm</Button>
          </Link>
        }
      >
        <StoreMetricGrid
          items={[
            {
              label: "Đang diễn ra",
              value: summary.running,
              description: "Số chương trình đang mở bán ngay lúc này.",
            },
            {
              label: "Sắp diễn ra",
              value: summary.upcoming,
              description: "Số chương trình chuẩn bị mở trong thời gian tới.",
            },
            {
              label: "Tổng slot",
              value: summary.totalSlots,
              description: "Tổng số sản phẩm tham gia flash sale.",
            },
          ]}
        />
      </StoreHeroSection>

      <StorePanelFrame>
        <StoreSectionHeader
          kicker="Danh sách chương trình"
          title={loading ? "Đang tải..." : `${sales.length} chương trình đang bật`}
          description="Mỗi chương trình hiển thị mốc thời gian và các slot sản phẩm nổi bật."
        />

        <div className="space-y-4">
          {sales.map((sale) => {
            const phase = getSalePhase(sale);
            const sold = sale.slots.reduce((sum, slot) => sum + slot.sold, 0);
            const stockLimit = sale.slots.reduce((sum, slot) => sum + slot.stockLimit, 0);

            return (
              <article key={sale.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <div
                  className="h-40 bg-cover bg-center"
                  style={{
                    backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.78), rgba(15, 79, 168, 0.44)), url(${sale.banner || fallbackBanner})`,
                  }}
                >
                  <div className="flex h-full items-end justify-between p-5 text-white">
                    <div>
                      <p className="m-0 text-xs font-bold uppercase tracking-[0.16em] text-slate-200">Flash Sale</p>
                      <h3 className="m-0 mt-2 text-xl font-extrabold">{sale.name}</h3>
                    </div>
                    <Tag color={phase.color}>{phase.label}</Tag>
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                    <span>Bắt đầu: {formatDateTime(sale.startsAt)}</span>
                    <span>Kết thúc: {formatDateTime(sale.endsAt)}</span>
                    <span>
                      Đã bán/Tổng slot: {sold}/{stockLimit}
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {sale.slots.slice(0, 6).map((slot, index) => (
                      <div key={`${sale.id}-${slot.productId}-${index}`} className="rounded-2xl border border-slate-200 p-3">
                        <p className="m-0 text-sm font-semibold text-slate-900">
                          {slot.product?.name || "Sản phẩm flash sale"}
                        </p>
                        <p className="m-0 mt-2 text-sm text-slate-600">
                          Giá flash: <strong className="text-slate-900">{formatStoreCurrency(slot.salePrice)}</strong>
                        </p>
                        <p className="m-0 mt-1 text-xs text-slate-500">
                          Đã bán {slot.sold}/{slot.stockLimit}
                        </p>
                        {slot.product?.slug ? (
                          <Link to={`/products/${slot.product.slug}`} className="mt-2 inline-block text-xs font-semibold text-sky-700">
                            Xem sản phẩm
                          </Link>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </StorePanelFrame>
    </StorePageShell>
  );
}
