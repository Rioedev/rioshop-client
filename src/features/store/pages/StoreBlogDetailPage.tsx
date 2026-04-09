import { LeftOutlined } from "@ant-design/icons";
import { Button, Empty, Skeleton, Tag, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { blogService, type BlogPost } from "../../../services/blogService";
import { getErrorMessage } from "../../../utils/errorMessage";
import { resolveStoreImageUrl as resolveImageUrl } from "../utils/storeFormatting";

const { Paragraph, Title } = Typography;

const formatBlogDate = (value?: string) => {
  if (!value) return "Cập nhật gần đây";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Cập nhật gần đây";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const sanitizeBlogHtml = (html?: string) => {
  if (!html) {
    return "";
  }

  if (typeof window === "undefined") {
    return html;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    doc.querySelectorAll("script, style, iframe, object, embed, link, meta").forEach((node) => node.remove());

    doc.body.querySelectorAll("*").forEach((node) => {
      Array.from(node.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value;

        if (name.startsWith("on")) {
          node.removeAttribute(attribute.name);
          return;
        }

        if ((name === "href" || name === "src") && /^\s*javascript:/i.test(value)) {
          node.removeAttribute(attribute.name);
          return;
        }
      });
    });

    return doc.body.innerHTML;
  } catch {
    return html;
  }
};

export function StoreBlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (!slug) {
      setErrorText("Không tìm thấy bài viết.");
      setPost(null);
      setLoading(false);
      return;
    }

    let active = true;

    const loadPost = async () => {
      setLoading(true);
      setErrorText("");
      try {
        const result = await blogService.getBlogBySlug(slug);
        if (!active) return;
        setPost(result);
      } catch (error) {
        if (!active) return;
        setPost(null);
        setErrorText(getErrorMessage(error));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadPost();
    return () => {
      active = false;
    };
  }, [slug]);

  const sanitizedContent = useMemo(
    () => sanitizeBlogHtml(post?.content),
    [post?.content],
  );

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-245 px-4 py-8 md:px-6 md:py-10">
        <Skeleton active paragraph={{ rows: 8 }} />
      </section>
    );
  }

  if (errorText || !post) {
    return (
      <section className="mx-auto w-full max-w-245 px-4 py-8 md:px-6 md:py-10">
        <div className="mb-5">
          <Link to="/blog">
            <Button icon={<LeftOutlined />}>Quay lại Blog</Button>
          </Link>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <Empty description={errorText || "Không tìm thấy bài viết."} />
        </div>
      </section>
    );
  }

  return (
    <article className="mx-auto w-full max-w-245 px-4 py-8 md:px-6 md:py-10">
      <div className="mb-5">
        <Link to="/blog">
          <Button icon={<LeftOutlined />}>Quay lại Blog</Button>
        </Link>
      </div>

      <header className="mb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Blog RioShop
        </p>
        <Title level={1} className="mb-2! mt-0! text-3xl! leading-tight! md:text-4xl!">
          {post.title}
        </Title>
        <Paragraph className="mb-3! text-slate-500">
          Đăng lúc {formatBlogDate(post.publishedAt || post.createdAt)}
          {post.authorName ? ` • ${post.authorName}` : ""}
        </Paragraph>
        {post.tags?.length ? (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        ) : null}
      </header>

      {post.coverImage ? (
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200">
          <img
            src={resolveImageUrl(post.coverImage)}
            alt={post.title}
            className="max-h-130 w-full object-cover"
          />
        </div>
      ) : null}

      {post.excerpt ? (
        <Paragraph className="mb-6 rounded-xl border border-sky-100 bg-sky-50 p-4 text-base leading-7 text-slate-700">
          {post.excerpt}
        </Paragraph>
      ) : null}

      <div
        className="blog-detail-content max-w-none leading-7 text-slate-800"
        dangerouslySetInnerHTML={{ __html: sanitizedContent || "<p>Nội dung đang được cập nhật.</p>" }}
      />
    </article>
  );
}
