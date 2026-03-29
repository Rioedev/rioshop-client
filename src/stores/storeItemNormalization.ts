export const FALLBACK_PRODUCT_NAME = "San pham";

export const toTrimmedOrNull = (value?: string | null) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
};

export const toTrimmedOrUndefined = (value?: string | null) => {
  const normalized = toTrimmedOrNull(value);
  return normalized ?? undefined;
};

export const toNormalizedSlug = (value?: string | null) => toTrimmedOrNull(value) ?? "";

export const toNormalizedProductName = (value?: string | null) =>
  toTrimmedOrNull(value) ?? FALLBACK_PRODUCT_NAME;

export const toNormalizedPrice = (value?: number | null) => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
};
