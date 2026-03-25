import { Empty, Pagination, Skeleton, Typography } from "antd";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { blogService, type BlogPost } from "../../../services/blogService";
import { getErrorMessage } from "../../../utils/errorMessage";
import { resolveStoreImageUrl as resolveImageUrl } from "../utils/storeFormatting";

const { Paragraph, Title } = Typography;

const FALLBACK_BLOG_IMAGES = [
  "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1622470953794-aa9c70b0fb9d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=1200&q=80",
];

const formatBlogDate = (value?: string) => {
  if (!value) return "Cập nhật gần đây";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Cập nhật gần đây";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const stripHtmlToText = (value?: string) =>
  (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

export function StoreBlogsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(9);
  const [total, setTotal] = useState(0);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    let active = true;

    const loadBlogs = async () => {
      setLoading(true);
      setErrorText("");
      try {
        const result = await blogService.getBlogs({
          page,
          limit: pageSize,
          isPublished: true,
        });
        if (!active) return;
        setPosts(result.docs);
        setTotal(result.totalDocs);
      } catch (error) {
        if (!active) return;
        setErrorText(getErrorMessage(error));
        setPosts([]);
        setTotal(0);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadBlogs();
    return () => {
      active = false;
    };
  }, [page, pageSize]);

  return (
    <section className="mx-auto w-full max-w-[1220px] px-4 py-8 md:px-6 md:py-10">
      <div className="mb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Blog RioShop
        </p>
        <Title level={2} className="mb-2! mt-0!">
          Bài viết mới nhất
        </Title>
        <Paragraph className="mb-0! text-slate-500">
          Cập nhật xu hướng, mẹo phối đồ và kinh nghiệm mua sắm thực tế mỗi tuần.
        </Paragraph>
      </div>

      {loading ? (
        <div className="store-blog-list-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton
              key={`blog-skeleton-${index}`}
              active
              className="rounded-xl border border-slate-200 p-4"
            />
          ))}
        </div>
      ) : null}

      {!loading && errorText ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorText}
        </div>
      ) : null}

      {!loading && !errorText && posts.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <Empty description="Chưa có bài viết nào để hiển thị." />
        </div>
      ) : null}

      {!loading && !errorText && posts.length > 0 ? (
        <>
          <div className="store-blog-list-grid">
            {posts.map((post, index) => {
              const image =
                resolveImageUrl(post.coverImage) ||
                FALLBACK_BLOG_IMAGES[index % FALLBACK_BLOG_IMAGES.length];
              const excerpt =
                post.excerpt?.trim() || stripHtmlToText(post.content).slice(0, 170);

              return (
                <article key={post._id} className="store-blog-list-card">
                  <Link
                    to={`/blog/${encodeURIComponent(post.slug)}`}
                    className="store-blog-list-media"
                  >
                    <img
                      src={image}
                      alt={post.title}
                      className="h-full w-full object-cover transition duration-300 hover:scale-[1.04]"
                    />
                  </Link>
                  <div className="store-blog-list-body">
                    <p className="store-blog-list-date">
                      Ngày đăng: {formatBlogDate(post.publishedAt || post.createdAt)}
                    </p>
                    <Link
                      to={`/blog/${encodeURIComponent(post.slug)}`}
                      className="store-blog-list-title"
                    >
                      {post.title}
                    </Link>
                    <p className="store-blog-list-excerpt">
                      {excerpt || "Nội dung đang được cập nhật."}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-6 flex justify-center">
            <Pagination
              current={page}
              pageSize={pageSize}
              total={total}
              onChange={(nextPage) => setPage(nextPage)}
              showSizeChanger={false}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}
