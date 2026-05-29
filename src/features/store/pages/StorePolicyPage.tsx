import { LeftOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { Button, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  StoreEmptyState,
  StorePageShell,
  StorePanelFrame,
  storeButtonClassNames,
} from "../components/StorePageChrome";
import { policyService, type Policy } from "../../../services/policyService";
import { sanitizeProductHtml } from "../shared/productDetail";
import { ProductDetailSkeleton } from "../components/StoreSkeletons";

const { Title } = Typography;

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(date);
};

export function StorePolicyPage() {
  const { slug } = useParams<{ slug: string }>();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [allPages, setAllPages] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotFound(false);

    Promise.all([
      policyService.getActivePageBySlug(slug).catch(() => null),
      policyService.listActiveByKind("page").catch(() => [] as Policy[]),
    ]).then(([detail, list]) => {
      if (!active) return;
      if (!detail) {
        setNotFound(true);
        setPolicy(null);
      } else {
        setPolicy(detail);
      }
      setAllPages(list);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [slug]);

  const sanitizedHtml = useMemo(
    () => sanitizeProductHtml(policy?.content),
    [policy?.content],
  );

  if (loading) {
    return (
      <StorePageShell>
        <ProductDetailSkeleton />
      </StorePageShell>
    );
  }

  if (notFound || !policy) {
    return (
      <StoreEmptyState
        kicker="Chính sách"
        title="Không tìm thấy trang chính sách"
        description="Trang bạn đang truy cập có thể đã được gỡ bỏ hoặc đường dẫn không đúng."
        action={
          <Link to="/">
            <Button type="primary" className={storeButtonClassNames.primary}>
              Về trang chủ
            </Button>
          </Link>
        }
      />
    );
  }

  const otherPolicies = allPages.filter((item) => item.slug !== policy.slug);

  return (
    <StorePageShell>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article>
          <StorePanelFrame>
            <Link to="/" className="inline-flex items-center gap-1 text-sm font-semibold text-[#0f4fa8] hover:underline">
              <LeftOutlined /> Về trang chủ
            </Link>
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#eaf1fa] text-[#0f4fa8]">
                <SafetyCertificateOutlined />
              </span>
              <p className="m-0 text-xs font-bold uppercase tracking-[0.16em] text-[#0f4fa8]">
                Chính sách Rioshop
              </p>
            </div>
            <Title level={1} className="m-0! mt-3! text-[#082a5c]!">
              {policy.title}
            </Title>
            {policy.summary ? (
              <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
                {policy.summary}
              </p>
            ) : null}
            {policy.updatedAt ? (
              <p className="mt-3 text-xs text-slate-500">
                Cập nhật lần cuối: {formatDate(policy.updatedAt)}
              </p>
            ) : null}

            <div
              className="store-policy-content mt-6"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          </StorePanelFrame>
        </article>

        {otherPolicies.length > 0 ? (
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <StorePanelFrame>
              <p className="m-0 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Chính sách khác
              </p>
              <ul className="m-0 mt-3 flex list-none flex-col gap-1 p-0">
                {otherPolicies.map((item) => (
                  <li key={item._id}>
                    <Link
                      to={`/chinh-sach/${item.slug}`}
                      className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-[#f2f6fb] hover:text-[#0f4fa8]"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </StorePanelFrame>
          </aside>
        ) : null}
      </div>
    </StorePageShell>
  );
}
