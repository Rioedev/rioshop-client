import type { AnalyticsEventType } from "./analyticsEventService";
import { apiClient } from "./apiClient";

type DeviceInfo = {
  type?: string;
  os?: string;
  browser?: string;
};

type UtmInfo = {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
};

type TrackEventPayload = {
  event: AnalyticsEventType;
  userId?: string | null;
  productId?: string;
  orderId?: string;
  properties?: Record<string, unknown>;
  utm?: UtmInfo;
};

type AnalyticsTrackRequest = {
  event: AnalyticsEventType;
  sessionId: string;
  userId?: string;
  productId?: string;
  orderId?: string;
  properties?: Record<string, unknown>;
  device?: DeviceInfo;
  utm?: UtmInfo;
};

const SESSION_STORAGE_KEY = "rioshop_analytics_session_id";
const UTM_STORAGE_KEY = "rioshop_analytics_utm";
const RECENT_EVENT_WINDOW_MS = 1800;
const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const isBrowser = typeof window !== "undefined";
const recentEventCache = new Map<string, number>();
const dedupeEventTypes = new Set<AnalyticsEventType>(["page_view", "product_view"]);

const safeTrim = (value?: string | null) => value?.trim() || "";

const getUrlSearch = () => {
  if (!isBrowser) {
    return "";
  }
  return window.location.search || "";
};

const getSessionId = () => {
  if (!isBrowser) {
    return "server-session";
  }

  const existing = safeTrim(window.localStorage.getItem(SESSION_STORAGE_KEY));
  if (existing) {
    return existing;
  }

  const generated =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(SESSION_STORAGE_KEY, generated);
  return generated;
};

const parseStoredUtm = (): UtmInfo => {
  if (!isBrowser) {
    return {};
  }

  const raw = safeTrim(window.localStorage.getItem(UTM_STORAGE_KEY));
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as UtmInfo;
    return {
      source: safeTrim(parsed.source) || undefined,
      medium: safeTrim(parsed.medium) || undefined,
      campaign: safeTrim(parsed.campaign) || undefined,
      term: safeTrim(parsed.term) || undefined,
      content: safeTrim(parsed.content) || undefined,
    };
  } catch {
    return {};
  }
};

const writeStoredUtm = (utm: UtmInfo) => {
  if (!isBrowser) {
    return;
  }
  window.localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
};

const mergeUtm = (source: UtmInfo, fallback: UtmInfo): UtmInfo => ({
  source: safeTrim(source.source) || safeTrim(fallback.source) || undefined,
  medium: safeTrim(source.medium) || safeTrim(fallback.medium) || undefined,
  campaign: safeTrim(source.campaign) || safeTrim(fallback.campaign) || undefined,
  term: safeTrim(source.term) || safeTrim(fallback.term) || undefined,
  content: safeTrim(source.content) || safeTrim(fallback.content) || undefined,
});

const normalizeUtm = (utm?: UtmInfo): UtmInfo | undefined => {
  if (!utm) {
    return undefined;
  }

  const next = {
    source: safeTrim(utm.source) || undefined,
    medium: safeTrim(utm.medium) || undefined,
    campaign: safeTrim(utm.campaign) || undefined,
    term: safeTrim(utm.term) || undefined,
    content: safeTrim(utm.content) || undefined,
  };

  if (!next.source && !next.medium && !next.campaign && !next.term && !next.content) {
    return undefined;
  }

  return next;
};

const getDeviceInfo = (): DeviceInfo => {
  if (!isBrowser) {
    return {};
  }

  const ua = window.navigator.userAgent || "";
  const lowered = ua.toLowerCase();

  const type = /mobile|iphone|android/i.test(lowered) ? "mobile" : /tablet|ipad/i.test(lowered) ? "tablet" : "desktop";

  const os = /windows/i.test(lowered)
    ? "Windows"
    : /mac os/i.test(lowered)
      ? "MacOS"
      : /android/i.test(lowered)
        ? "Android"
        : /iphone|ipad|ios/i.test(lowered)
          ? "iOS"
          : /linux/i.test(lowered)
            ? "Linux"
            : "Unknown";

  const browser = /edg/i.test(lowered)
    ? "Edge"
    : /opr|opera/i.test(lowered)
      ? "Opera"
      : /chrome/i.test(lowered)
        ? "Chrome"
        : /firefox/i.test(lowered)
          ? "Firefox"
          : /safari/i.test(lowered)
            ? "Safari"
            : "Unknown";

  return { type, os, browser };
};

const rememberUtmFromSearch = (search = getUrlSearch()) => {
  if (!isBrowser) {
    return;
  }

  const params = new URLSearchParams(search);
  const incoming: UtmInfo = {
    source: safeTrim(params.get("utm_source")) || undefined,
    medium: safeTrim(params.get("utm_medium")) || undefined,
    campaign: safeTrim(params.get("utm_campaign")) || undefined,
    term: safeTrim(params.get("utm_term")) || undefined,
    content: safeTrim(params.get("utm_content")) || undefined,
  };

  const normalizedIncoming = normalizeUtm(incoming);
  if (!normalizedIncoming) {
    return;
  }

  const stored = parseStoredUtm();
  const merged = mergeUtm(normalizedIncoming, stored);
  writeStoredUtm(merged);
};

const cleanRecentEventCache = (now: number) => {
  for (const [key, timestamp] of recentEventCache.entries()) {
    if (now - timestamp > RECENT_EVENT_WINDOW_MS) {
      recentEventCache.delete(key);
    }
  }
};

const shouldSkipDuplicate = (signature: string) => {
  const now = Date.now();
  cleanRecentEventCache(now);

  const previous = recentEventCache.get(signature);
  if (previous && now - previous <= RECENT_EVENT_WINDOW_MS) {
    return true;
  }

  recentEventCache.set(signature, now);
  return false;
};

const toObjectIdOrUndefined = (value?: string | null) => {
  const normalized = safeTrim(value);
  if (!normalized || !objectIdPattern.test(normalized)) {
    return undefined;
  }
  return normalized;
};

const buildEventSignature = (payload: AnalyticsTrackRequest) => {
  const path = payload.properties?.path;
  const query = payload.properties?.query;
  return [
    payload.event,
    payload.userId || "",
    payload.productId || "",
    payload.orderId || "",
    payload.sessionId,
    typeof path === "string" ? path : "",
    typeof query === "string" ? query : "",
  ].join("|");
};

export const analyticsTracker = {
  captureUtmFromSearch(search?: string) {
    rememberUtmFromSearch(search);
  },

  async track(payload: TrackEventPayload) {
    const sessionId = getSessionId();
    const storedUtm = parseStoredUtm();
    const mergedUtm = normalizeUtm(mergeUtm(payload.utm ?? {}, storedUtm));

    const requestPayload: AnalyticsTrackRequest = {
      event: payload.event,
      sessionId,
      userId: toObjectIdOrUndefined(payload.userId),
      productId: toObjectIdOrUndefined(payload.productId),
      orderId: toObjectIdOrUndefined(payload.orderId),
      properties: payload.properties,
      device: getDeviceInfo(),
      utm: mergedUtm,
    };

    const signature = buildEventSignature(requestPayload);
    if (dedupeEventTypes.has(requestPayload.event) && shouldSkipDuplicate(signature)) {
      return;
    }

    try {
      await apiClient.post("/api/analytics/track", requestPayload);
    } catch {
      // Tracking failures should never block user flows.
    }
  },
};