import {
  CloseOutlined,
  MessageOutlined,
  RobotOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { Button, Input, Tooltip } from "antd";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Link, useLocation } from "react-router-dom";
import {
  aiRecommendationService,
  type AiChatMessage,
  type AiProductRecommendation,
} from "../../../services/aiRecommendationService";
import {
  formatStoreCurrency,
  resolveStoreImageUrl,
  resolveStoreProductThumbnail,
} from "../utils/storeFormatting";
import { type Product, type ProductVariant } from "../../../services/productService";
import { getErrorMessage } from "../../../utils/errorMessage";

type StoreAiChatMessage = AiChatMessage & {
  id: string;
  recommendations?: AiProductRecommendation[];
};

const INITIAL_MESSAGES: StoreAiChatMessage[] = [
  {
    id: "assistant-welcome",
    role: "assistant",
    content:
      "Mình có thể gợi ý sản phẩm theo nhu cầu, ngân sách, màu và size bạn muốn.",
  },
];

const INITIAL_SUGGESTIONS = [
  "Áo đi làm dưới 500k",
  "Đồ đi chơi cuối tuần",
  "Sản phẩm màu đen size M",
];

const createMessageId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const toChatHistory = (messages: StoreAiChatMessage[]): AiChatMessage[] =>
  messages
    .map((item) => ({
      role: item.role,
      content: item.content,
    }))
    .slice(-8);

const normalizeMatchText = (value = "") =>
  value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9#\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeColorHex = (value?: string) => {
  const hex = (value ?? "").trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex) ? hex.toLowerCase() : "";
};

const firstVariantImage = (variant?: ProductVariant) => {
  const images = Array.isArray(variant?.images) ? variant.images : [];
  return images.find((item) => item?.trim());
};

const extractMatchedSignalValue = (
  recommendation: AiProductRecommendation,
  signalPrefix: string,
) => {
  const normalizedPrefix = normalizeMatchText(signalPrefix);
  const signal = recommendation.matchedSignals.find((item) =>
    normalizeMatchText(item).startsWith(normalizedPrefix),
  );

  if (!signal) {
    return "";
  }

  return normalizeMatchText(signal).replace(normalizedPrefix, "").trim();
};

const productVariantMatchesColor = (variant: ProductVariant, colorValue: string) => {
  if (!colorValue) {
    return true;
  }

  const colorName = normalizeMatchText(variant.color?.name);
  const colorHex = normalizeColorHex(variant.color?.hex);

  return colorName === colorValue || colorName.includes(colorValue) || colorHex === colorValue;
};

const productVariantMatchesSize = (variant: ProductVariant, sizeValue: string) => {
  if (!sizeValue) {
    return true;
  }

  const sizes = [variant.size, variant.sizeLabel]
    .map((item) => normalizeMatchText(item))
    .filter(Boolean);

  return sizes.includes(sizeValue);
};

const findMediaColorImage = (product: Product, variant?: ProductVariant) => {
  const colorName = normalizeMatchText(variant?.color?.name);
  const colorHex = normalizeColorHex(variant?.color?.hex);
  const expectedRefs = new Set(
    [colorName, colorHex, colorHex.replace("#", "")]
      .map((item) => item.trim())
      .filter(Boolean),
  );

  if (expectedRefs.size === 0) {
    return undefined;
  }

  const match = product.media?.find((mediaItem) => {
    if (!mediaItem?.url || mediaItem.type !== "image") {
      return false;
    }

    return expectedRefs.has(normalizeMatchText(mediaItem.colorRef));
  });

  return resolveStoreImageUrl(match?.url);
};

const resolveRecommendedProductThumbnail = (recommendation: AiProductRecommendation) => {
  const product = recommendation.product;
  const colorValue = extractMatchedSignalValue(recommendation, "Màu");
  const sizeValue = extractMatchedSignalValue(recommendation, "Size");
  const activeVariants = (product.variants ?? []).filter((variant) => variant.isActive !== false);

  const matchedVariant =
    activeVariants.find(
      (variant) =>
        productVariantMatchesColor(variant, colorValue) &&
        productVariantMatchesSize(variant, sizeValue),
    ) ??
    activeVariants.find((variant) => productVariantMatchesColor(variant, colorValue)) ??
    activeVariants.find((variant) => productVariantMatchesSize(variant, sizeValue));

  return (
    resolveStoreImageUrl(matchedVariant?.color?.imageUrl) ??
    resolveStoreImageUrl(firstVariantImage(matchedVariant)) ??
    findMediaColorImage(product, matchedVariant) ??
    resolveStoreProductThumbnail(product)
  );
};

export function StoreAiChatbot() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<StoreAiChatMessage[]>(INITIAL_MESSAGES);
  const [suggestedQuestions, setSuggestedQuestions] = useState(INITIAL_SUGGESTIONS);
  const [loading, setLoading] = useState(false);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [loading, messages, open]);

  const submitMessage = async (rawMessage = inputValue) => {
    const prompt = rawMessage.trim();
    if (!prompt || loading) {
      return;
    }

    const userMessage: StoreAiChatMessage = {
      id: createMessageId(),
      role: "user",
      content: prompt,
    };
    const history = toChatHistory(messages);

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setLoading(true);

    try {
      const result = await aiRecommendationService.chat({
        message: prompt,
        history,
        context: {
          path: `${location.pathname}${location.search}`,
        },
      });

      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: "assistant",
          content: result.reply,
          recommendations: result.items,
        },
      ]);

      if (result.suggestedQuestions.length > 0) {
        setSuggestedQuestions(result.suggestedQuestions);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: "assistant",
          content: getErrorMessage(
            error,
            "Không thể tạo phản hồi tư vấn. Vui lòng thử lại sau.",
          ),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    void submitMessage();
  };

  return (
    <div className="store-ai-chatbot">
      {open ? (
        <section className="store-ai-chatbot__panel" aria-label="Chatbot tư vấn mua hàng">
          <header className="store-ai-chatbot__header">
            <div className="store-ai-chatbot__avatar">
              <RobotOutlined />
              <span className="store-ai-chatbot__avatar-dot" aria-hidden />
            </div>
            <div className="min-w-0">
              <p>Tư vấn mua hàng</p>
              <span>RioShop AI · Đang hoạt động</span>
            </div>
            <Tooltip title="Đóng chatbot">
              <Button
                type="text"
                shape="circle"
                icon={<CloseOutlined />}
                aria-label="Đóng chatbot"
                onClick={() => setOpen(false)}
              />
            </Tooltip>
          </header>

          <div className="store-ai-chatbot__messages">
            {messages.map((item) => (
              <article
                key={item.id}
                className={`store-ai-chatbot__message store-ai-chatbot__message--${item.role}`}
              >
                <div className="store-ai-chatbot__bubble">{item.content}</div>

                {item.recommendations?.length ? (
                  <div className="store-ai-chatbot__products">
                    {item.recommendations.slice(0, 4).map((recommendation) => {
                      const product = recommendation.product;
                      const image = resolveRecommendedProductThumbnail(recommendation);

                      return (
                        <Link
                          key={product._id}
                          to={`/products/${product.slug}`}
                          className="store-ai-chatbot__product"
                        >
                          <div className="store-ai-chatbot__product-image">
                            {image ? (
                              <img src={image} alt={product.name} />
                            ) : (
                              <span>RIO</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p>{product.name}</p>
                            <strong>{formatStoreCurrency(product.pricing.regularPrice ?? product.pricing.salePrice)}</strong>
                            <span>{recommendation.reason}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </article>
            ))}

            {loading ? (
              <div className="store-ai-chatbot__typing" aria-live="polite">
                <span />
                <span />
                <span />
              </div>
            ) : null}
            <div ref={messageEndRef} />
          </div>

          <div className="store-ai-chatbot__suggestions">
            <p className="store-ai-chatbot__suggestions-label">Gợi ý nhanh</p>
            <div className="store-ai-chatbot__suggestions-list">
              {suggestedQuestions.slice(0, 3).map((question) => (
                <button
                  key={question}
                  type="button"
                  disabled={loading}
                  onClick={() => void submitMessage(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          <form
            className="store-ai-chatbot__composer"
            onSubmit={(event) => {
              event.preventDefault();
              void submitMessage();
            }}
          >
            <Input.TextArea
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={onInputKeyDown}
              autoSize={{ minRows: 1, maxRows: 3 }}
              maxLength={500}
              placeholder="Bạn cần tìm sản phẩm như thế nào?"
              disabled={loading}
            />
            <Tooltip title="Gửi tin nhắn">
              <Button
                htmlType="submit"
                type="primary"
                shape="circle"
                icon={<SendOutlined />}
                loading={loading}
                aria-label="Gửi tin nhắn"
              />
            </Tooltip>
          </form>
        </section>
      ) : (
        <Tooltip title="Tư vấn mua hàng">
          <button
            type="button"
            className="store-ai-chatbot__launcher"
            aria-label="Mở chatbot tư vấn mua hàng"
            onClick={() => setOpen(true)}
          >
            <MessageOutlined />
          </button>
        </Tooltip>
      )}
    </div>
  );
}
