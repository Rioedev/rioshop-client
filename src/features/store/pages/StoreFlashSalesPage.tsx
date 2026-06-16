import { Button, Input, Select, Slider } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { StoreProductGridCard } from "../components/StoreProductGridCard";
import {
  StoreEmptyState,
  StoreMetricGrid,
  StorePageShell,
  StoreHeroSection,
  StorePanelFrame,
  StoreSectionHeader,
  storeButtonClassNames,
} from "../components/StorePageChrome";
import { flashSaleService, type FlashSale, type FlashSaleSlot } from "../../../services/flashSaleService";
import {
  STORE_PRODUCT_PLACEHOLDER,
  formatStoreCurrency,
  resolveStoreImageUrl,
  resolveStoreProductThumbnail,
} from "../utils/storeFormatting";

type CustomerSalePhase = "running" | "upcoming";
type FlashSaleSort = "discount_desc" | "price_asc" | "price_desc" | "sold_desc";

type AppliedProductFilters = {
  keyword: string;
  category: string;
  collection: string;
  sort: FlashSaleSort;
  minPrice: number;
  maxPrice: number;
  colors: string[];
  sizes: string[];
};

type FlashSaleDeal = {
  key: string;
  sale: FlashSale;
  slot: FlashSaleSlot;
};

type ProductColorSwatch = {
  key: string;
  label: string;
  hex?: string;
  imageUrl?: string;
};

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

  if (Number.isNaN(startsAt) || Number.isNaN(endsAt) || endsAt < now) {
    return "ended" as const;
  }

  return startsAt > now ? ("upcoming" as const) : ("running" as const);
};

const getReferencePrice = (slot: FlashSaleSlot) => {
  const pricing = slot.product?.pricing;
  return Number(pricing?.regularPrice || pricing?.salePrice || pricing?.basePrice || slot.salePrice);
};

const getDiscountPercent = (slot: FlashSaleSlot) => {
  const referencePrice = getReferencePrice(slot);
  if (referencePrice <= slot.salePrice || referencePrice <= 0) {
    return 0;
  }

  return Math.round(((referencePrice - slot.salePrice) / referencePrice) * 100);
};

const normalizeFilterValue = (value?: string) => (value ?? "").trim().toLocaleLowerCase("vi-VN");

const toColorSwatches = (slot: FlashSaleSlot): ProductColorSwatch[] => {
  const swatches = new Map<string, ProductColorSwatch>();

  (slot.product?.variants ?? []).forEach((variant) => {
    if (variant.isActive === false) {
      return;
    }

    const label = variant.color?.name?.trim() || "Mặc định";
    const hex = variant.color?.hex?.trim();
    const key = `${label.toLocaleLowerCase("vi-VN")}::${hex || "default"}`;
    if (swatches.has(key)) {
      return;
    }

    swatches.set(key, {
      key,
      label,
      hex,
      imageUrl: resolveStoreImageUrl(variant.color?.imageUrl || variant.images?.[0]),
    });
  });

  return Array.from(swatches.values()).slice(0, 5);
};

export function StoreFlashSalesPage() {
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhase, setActivePhase] = useState<CustomerSalePhase>("running");
  const [selectedSaleId, setSelectedSaleId] = useState("all");
  const [keywordInput, setKeywordInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("all");
  const [collectionInput, setCollectionInput] = useState("all");
  const [sortInput, setSortInput] = useState<FlashSaleSort>("discount_desc");
  const [priceRangeInput, setPriceRangeInput] = useState<[number, number]>([0, 0]);
  const [colorFilterInput, setColorFilterInput] = useState<string[]>([]);
  const [sizeFilterInput, setSizeFilterInput] = useState<string[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<AppliedProductFilters>({
    keyword: "",
    category: "all",
    collection: "all",
    sort: "discount_desc",
    minPrice: 0,
    maxPrice: Number.MAX_SAFE_INTEGER,
    colors: [],
    sizes: [],
  });

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

        const customerSales = result.docs.filter((sale) => getSalePhase(sale) !== "ended");
        setSales(customerSales);
        if (!customerSales.some((sale) => getSalePhase(sale) === "running")) {
          setActivePhase("upcoming");
        }
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

  const runningSales = useMemo(
    () => sales.filter((sale) => getSalePhase(sale) === "running"),
    [sales],
  );
  const upcomingSales = useMemo(
    () => sales.filter((sale) => getSalePhase(sale) === "upcoming"),
    [sales],
  );
  const visibleCampaigns = activePhase === "running" ? runningSales : upcomingSales;

  useEffect(() => {
    if (selectedSaleId !== "all" && !visibleCampaigns.some((sale) => sale.id === selectedSaleId)) {
      setSelectedSaleId("all");
    }
  }, [selectedSaleId, visibleCampaigns]);

  const summary = useMemo(() => ({
    running: runningSales.length,
    upcoming: upcomingSales.length,
    totalSlots: sales.reduce((sum, sale) => sum + sale.slots.length, 0),
  }), [runningSales.length, sales, upcomingSales.length]);

  const campaignDeals = useMemo<FlashSaleDeal[]>(() => {
    return visibleCampaigns.flatMap((sale) => {
      if (selectedSaleId !== "all" && sale.id !== selectedSaleId) {
        return [];
      }

      return sale.slots
        .filter((slot) => !slot.product?.status || slot.product.status === "active")
        .map((slot, index) => ({
          key: `${sale.id}-${slot.productId}-${slot.variantSku || index}`,
          sale,
          slot,
        }));
    });
  }, [selectedSaleId, visibleCampaigns]);

  const categoryOptions = useMemo(() => {
    const options = new Map<string, string>();
    campaignDeals.forEach(({ slot }) => {
      const category = slot.product?.category;
      const value = category?.slug || category?._id || "";
      if (value && category?.name) {
        options.set(value, category.name);
      }
    });
    return [
      { value: "all", label: "Tất cả danh mục" },
      ...Array.from(options, ([value, label]) => ({ value, label })),
    ];
  }, [campaignDeals]);

  const collectionOptions = useMemo(() => {
    const options = new Map<string, string>();
    campaignDeals.forEach(({ slot }) => {
      (slot.product?.collections ?? []).forEach((collection) => {
        const value = collection.slug || collection._id || "";
        if (value && collection.name) {
          options.set(value, collection.name);
        }
      });
    });
    return [
      { value: "all", label: "Tất cả bộ sưu tập" },
      ...Array.from(options, ([value, label]) => ({ value, label })),
    ];
  }, [campaignDeals]);

  const colorOptions = useMemo(() => {
    const options = new Map<string, string>();
    campaignDeals.forEach(({ slot }) => {
      (slot.product?.variants ?? []).forEach((variant) => {
        if (variant.isActive === false) return;
        const label = variant.color?.name?.trim();
        const value = normalizeFilterValue(label || variant.color?.hex);
        if (value) options.set(value, label || variant.color?.hex || value);
      });
    });
    return Array.from(options, ([value, label]) => ({ value, label }));
  }, [campaignDeals]);

  const sizeOptions = useMemo(() => {
    const options = new Map<string, string>();
    campaignDeals.forEach(({ slot }) => {
      (slot.product?.variants ?? []).forEach((variant) => {
        if (variant.isActive === false) return;
        const label = (variant.sizeLabel || variant.size || "").trim();
        const value = normalizeFilterValue(label);
        if (value) options.set(value, label);
      });
    });
    return Array.from(options, ([value, label]) => ({ value, label }));
  }, [campaignDeals]);

  const priceBounds = useMemo(() => {
    const prices = campaignDeals.map(({ slot }) => Number(slot.salePrice || 0)).filter((price) => price >= 0);
    if (prices.length === 0) return { min: 0, max: 0, step: 10000 };
    const min = Math.floor(Math.min(...prices) / 10000) * 10000;
    const max = Math.ceil(Math.max(...prices) / 10000) * 10000;
    return { min, max: Math.max(min, max), step: 10000 };
  }, [campaignDeals]);

  useEffect(() => {
    setPriceRangeInput([priceBounds.min, priceBounds.max]);
    setAppliedFilters((current) => ({
      ...current,
      minPrice: priceBounds.min,
      maxPrice: priceBounds.max,
    }));
  }, [priceBounds.max, priceBounds.min]);

  const deals = useMemo<FlashSaleDeal[]>(() => {
    const filtered = campaignDeals.filter(({ sale, slot }) => {
      const product = slot.product;
      const searchableText = [product?.name, product?.brand, product?.category?.name, sale.name, slot.variantSku]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("vi-VN");
      if (appliedFilters.keyword && !searchableText.includes(normalizeFilterValue(appliedFilters.keyword))) {
        return false;
      }

      const categoryValue = product?.category?.slug || product?.category?._id || "";
      if (appliedFilters.category !== "all" && categoryValue !== appliedFilters.category) return false;

      const collectionValues = (product?.collections ?? []).map((item) => item.slug || item._id || "");
      if (appliedFilters.collection !== "all" && !collectionValues.includes(appliedFilters.collection)) return false;

      if (slot.salePrice < appliedFilters.minPrice || slot.salePrice > appliedFilters.maxPrice) return false;

      const variants = (product?.variants ?? []).filter((variant) => variant.isActive !== false);
      if (appliedFilters.colors.length > 0) {
        const productColors = variants.map((variant) => normalizeFilterValue(variant.color?.name || variant.color?.hex));
        if (!appliedFilters.colors.some((color) => productColors.includes(color))) return false;
      }

      if (appliedFilters.sizes.length > 0) {
        const productSizes = variants.map((variant) => normalizeFilterValue(variant.sizeLabel || variant.size));
        if (!appliedFilters.sizes.some((size) => productSizes.includes(size))) return false;
      }

      return true;
    });

    return filtered.sort((left, right) => {
      if (appliedFilters.sort === "price_asc") return left.slot.salePrice - right.slot.salePrice;
      if (appliedFilters.sort === "price_desc") return right.slot.salePrice - left.slot.salePrice;
      if (appliedFilters.sort === "sold_desc") return right.slot.sold - left.slot.sold;
      return getDiscountPercent(right.slot) - getDiscountPercent(left.slot);
    });
  }, [appliedFilters, campaignDeals]);

  const resetProductFilters = () => {
    setKeywordInput("");
    setCategoryInput("all");
    setCollectionInput("all");
    setSortInput("discount_desc");
    setPriceRangeInput([priceBounds.min, priceBounds.max]);
    setColorFilterInput([]);
    setSizeFilterInput([]);
    setAppliedFilters({
      keyword: "",
      category: "all",
      collection: "all",
      sort: "discount_desc",
      minPrice: priceBounds.min,
      maxPrice: priceBounds.max,
      colors: [],
      sizes: [],
    });
  };

  const applyProductFilters = () => {
    setAppliedFilters({
      keyword: keywordInput.trim(),
      category: categoryInput,
      collection: collectionInput,
      sort: sortInput,
      minPrice: priceRangeInput[0],
      maxPrice: priceRangeInput[1],
      colors: colorFilterInput,
      sizes: sizeFilterInput,
    });
  };

  const showAllDeals = () => {
    setSelectedSaleId("all");
    resetProductFilters();
    window.requestAnimationFrame(() => {
      document.getElementById("flash-sale-products")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const changePhase = (phase: CustomerSalePhase) => {
    setActivePhase(phase);
    setSelectedSaleId("all");
    resetProductFilters();
  };

  if (!loading && sales.length === 0) {
    return (
      <StoreEmptyState
        kicker="Flash Sale"
        title="Hiện chưa có chương trình flash sale"
        description="Các chiến dịch mới sẽ xuất hiện tại đây ngay khi được kích hoạt."
        action={
          <Link to="/products">
            <Button type="primary" className={storeButtonClassNames.primary}>Xem sản phẩm</Button>
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
        description="Chọn chương trình đang diễn ra hoặc xem trước deal sắp mở."
        action={
          <Button className={storeButtonClassNames.secondary} onClick={showAllDeals}>
            Xem tất cả deal Flash Sale
          </Button>
        }
      >
        <StoreMetricGrid
          items={[
            { label: "Đang diễn ra", value: summary.running, description: "Chương trình đang mở bán." },
            { label: "Sắp diễn ra", value: summary.upcoming, description: "Chương trình chuẩn bị mở." },
            { label: "Sản phẩm ưu đãi", value: summary.totalSlots, description: "Tổng slot Flash Sale còn hiển thị." },
          ]}
        />
      </StoreHeroSection>

      <StorePanelFrame className="flash-sale-campaign-panel">
        <StoreSectionHeader kicker="Lịch Flash Sale" title="Chọn chương trình" />

        <div className="flash-sale-phase-tabs" role="tablist" aria-label="Trạng thái Flash Sale">
          <button
            type="button"
            className={activePhase === "running" ? "is-active" : ""}
            onClick={() => changePhase("running")}
            disabled={runningSales.length === 0}
          >
            Đang diễn ra <span>{runningSales.length}</span>
          </button>
          <button
            type="button"
            className={activePhase === "upcoming" ? "is-active" : ""}
            onClick={() => changePhase("upcoming")}
            disabled={upcomingSales.length === 0}
          >
            Sắp diễn ra <span>{upcomingSales.length}</span>
          </button>
        </div>

        <div className="flash-sale-banner-grid">
          {visibleCampaigns.map((sale) => {
            const isSelected = selectedSaleId === sale.id;
            const banner = resolveStoreImageUrl(sale.banner) || STORE_PRODUCT_PLACEHOLDER;
            return (
              <button
                key={sale.id}
                type="button"
                className={`flash-sale-banner-card ${isSelected ? "is-selected" : ""}`}
                style={{ backgroundImage: `linear-gradient(90deg, rgba(2, 6, 23, 0.82), rgba(15, 23, 42, 0.2)), url(${banner})` }}
                onClick={() => {
                  setSelectedSaleId(isSelected ? "all" : sale.id);
                  resetProductFilters();
                }}
              >
                <span>{activePhase === "running" ? "Đang diễn ra" : "Sắp diễn ra"}</span>
                <strong>{sale.name}</strong>
                <small>
                  {activePhase === "running" ? "Kết thúc" : "Bắt đầu"}: {formatDateTime(activePhase === "running" ? sale.endsAt : sale.startsAt)}
                </small>
                <em>{sale.slots.length} sản phẩm</em>
              </button>
            );
          })}
        </div>
      </StorePanelFrame>

      <div id="flash-sale-products" className="flash-sale-catalog-layout scroll-mt-24">
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <StorePanelFrame>
            <h2 className="m-0 mb-4 text-lg font-black uppercase tracking-[0.14em] text-[#082a5c]">Bộ lọc</h2>
            <div className="flex flex-col gap-4">
              <div>
                <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Tìm kiếm</p>
                <Input
                  allowClear
                  value={keywordInput}
                  onChange={(event) => setKeywordInput(event.target.value)}
                  onPressEnter={applyProductFilters}
                  placeholder="Tên sản phẩm, thương hiệu..."
                />
              </div>
              <div>
                <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Danh mục</p>
                <Select
                  className="w-full"
                  value={categoryInput}
                  onChange={setCategoryInput}
                  options={categoryOptions}
                />
              </div>
              <div>
                <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Bộ sưu tập</p>
                <Select
                  className="w-full"
                  value={collectionInput}
                  onChange={setCollectionInput}
                  options={collectionOptions}
                />
              </div>
              <div>
                <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Sắp xếp</p>
                <Select<FlashSaleSort>
                  className="w-full"
                  value={sortInput}
                  onChange={setSortInput}
                  options={[
                    { value: "discount_desc", label: "Giảm nhiều nhất" },
                    { value: "sold_desc", label: "Bán chạy nhất" },
                    { value: "price_asc", label: "Giá thấp đến cao" },
                    { value: "price_desc", label: "Giá cao đến thấp" },
                  ]}
                />
              </div>
              <div>
                <p className="m-0 mb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Khoảng giá</p>
                <p className="m-0 mb-2 text-xs font-semibold text-slate-700">
                  {formatStoreCurrency(priceRangeInput[0])} – {formatStoreCurrency(priceRangeInput[1])}
                </p>
                <Slider
                  range
                  min={priceBounds.min}
                  max={priceBounds.max}
                  step={priceBounds.step}
                  value={priceRangeInput}
                  onChange={(value) => {
                    if (Array.isArray(value) && value.length === 2) {
                      setPriceRangeInput([Number(value[0]), Number(value[1])]);
                    }
                  }}
                  tooltip={{ formatter: (value) => formatStoreCurrency(Number(value ?? 0)) }}
                />
              </div>
              <div>
                <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Màu sắc</p>
                <Select
                  mode="multiple"
                  allowClear
                  className="w-full"
                  value={colorFilterInput}
                  onChange={setColorFilterInput}
                  options={colorOptions}
                  optionFilterProp="label"
                  maxTagCount="responsive"
                  placeholder="Chọn màu"
                />
              </div>
              <div>
                <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Size</p>
                <Select
                  mode="multiple"
                  allowClear
                  className="w-full"
                  value={sizeFilterInput}
                  onChange={setSizeFilterInput}
                  options={sizeOptions}
                  optionFilterProp="label"
                  maxTagCount="responsive"
                  placeholder="Chọn size"
                />
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <Button type="primary" block className={storeButtonClassNames.primary} onClick={applyProductFilters}>
                  Áp dụng bộ lọc
                </Button>
                <Button block className={storeButtonClassNames.secondary} onClick={resetProductFilters}>
                  Đặt lại
                </Button>
              </div>
            </div>
          </StorePanelFrame>
        </aside>

        <StorePanelFrame>
          <StoreSectionHeader
            kicker={activePhase === "running" ? "Deal đang mở" : "Deal sắp mở"}
            title={loading ? "Đang tải sản phẩm..." : `${deals.length} sản phẩm Flash Sale`}
          />

          {deals.length > 0 ? (
            <div className="flash-sale-product-grid">
              {deals.map(({ key, sale, slot }) => {
                const image = resolveStoreProductThumbnail(slot.product) || STORE_PRODUCT_PLACEHOLDER;
                const referencePrice = getReferencePrice(slot);
                const discountPercent = getDiscountPercent(slot);
                const soldPercent = Math.min(100, Math.round((slot.sold / Math.max(1, slot.stockLimit)) * 100));
                const remaining = Math.max(0, slot.stockLimit - slot.sold);
                const isUpcoming = activePhase === "upcoming";

                return (
                  <StoreProductGridCard
                    key={key}
                    href={slot.product?.slug ? `/products/${slot.product.slug}` : "/flash-sales"}
                    imageUrl={image}
                    name={slot.product?.name || "Sản phẩm Flash Sale"}
                    price={formatStoreCurrency(slot.salePrice)}
                    originalPrice={referencePrice > slot.salePrice ? formatStoreCurrency(referencePrice) : undefined}
                    categoryLabel={slot.product?.category?.name || "Flash Sale"}
                    badge={discountPercent > 0 ? `-${discountPercent}%` : undefined}
                    colorSwatches={toColorSwatches(slot)}
                    footer={
                      <div className="flash-sale-card-extra">
                        <p className="flash-sale-card-campaign">{sale.name}</p>
                        <div className="flash-sale-stock-head">
                          <span>{isUpcoming ? `Giới hạn ${slot.stockLimit}` : `Đã bán ${slot.sold}`}</span>
                          <span>{isUpcoming ? "Sắp mở" : `Còn ${remaining}`}</span>
                        </div>
                        {!isUpcoming ? (
                          <div className="flash-sale-stock-bar" aria-label={`Đã bán ${soldPercent}%`}>
                            <span style={{ width: `${soldPercent}%` }} />
                          </div>
                        ) : null}
                        <div className="flash-sale-time-row">
                          <span>{isUpcoming ? "Bắt đầu" : "Kết thúc"}</span>
                          <strong>{formatDateTime(isUpcoming ? sale.startsAt : sale.endsAt)}</strong>
                        </div>
                      </div>
                    }
                  />
                );
              })}
            </div>
          ) : !loading ? (
            <StoreEmptyState
              kicker="Không có kết quả"
              title="Không tìm thấy deal phù hợp"
              description="Hãy thử chọn chương trình khác hoặc xóa từ khóa tìm kiếm."
              action={<Button className={storeButtonClassNames.secondary} onClick={showAllDeals}>Xóa bộ lọc</Button>}
            />
          ) : null}
        </StorePanelFrame>
      </div>
    </StorePageShell>
  );
}
