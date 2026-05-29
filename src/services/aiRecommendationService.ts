import { apiClient } from "./apiClient";
import { type ApiResponse } from "./apiTypes";
import { type Product } from "./productService";

export type AiRecommendationIntent = {
  gender?: {
    value: string;
    label: string;
  } | null;
  categories: Array<{
    key: string;
    label: string;
  }>;
  colors: Array<{
    key: string;
    label: string;
  }>;
  useCases: Array<{
    key: string;
    label: string;
  }>;
  sizes: string[];
  minPrice?: number | null;
  maxPrice?: number | null;
};

export type AiProductRecommendation = {
  product: Product;
  score: number;
  reason: string;
  matchedSignals: string[];
};

export type AiProductRecommendationResult = {
  query: string;
  summary: string;
  provider?: "gemini" | "rules";
  intent: AiRecommendationIntent;
  items: AiProductRecommendation[];
};

export type AiRecommendationContext = {
  categoryId?: string;
  collectionId?: string;
  path?: string;
};

export type AiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiShoppingChatResult = {
  message: string;
  reply: string;
  provider?: "gemini" | "rules";
  recommendationSummary?: string;
  items: AiProductRecommendation[];
  suggestedQuestions: string[];
};

export const aiRecommendationService = {
  async recommendProducts(payload: {
    message: string;
    limit?: number;
    context?: AiRecommendationContext;
  }): Promise<AiProductRecommendationResult> {
    const response = await apiClient.post<ApiResponse<AiProductRecommendationResult>>(
      "/api/ai/recommend-products",
      payload,
    );

    return response.data.data;
  },

  async chat(payload: {
    message: string;
    history?: AiChatMessage[];
    context?: AiRecommendationContext;
  }): Promise<AiShoppingChatResult> {
    const response = await apiClient.post<ApiResponse<AiShoppingChatResult>>(
      "/api/ai/chat",
      payload,
    );

    return response.data.data;
  },
};
