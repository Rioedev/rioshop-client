import type { ReactNode } from "react";

const joinClassNames = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

export const storeButtonClassNames = {
  primary: "store-home-v3-primary-btn h-11! rounded-full! px-6! font-bold! shadow-none!",
  secondary: "store-home-v3-secondary-ghost h-11! rounded-full! px-6! font-bold!",
  ghost: "store-home-v3-primary-ghost h-11! rounded-full! px-6! font-bold!",
  danger: "store-home-v3-primary-ghost h-11! rounded-full! px-6! font-bold! text-rose-600!",
  primaryCompact: "store-home-v3-primary-btn rounded-full! px-4! font-bold! shadow-none!",
  secondaryCompact: "store-home-v3-secondary-ghost rounded-full! px-4! font-bold!",
  ghostCompact: "store-home-v3-primary-ghost rounded-full! px-5! font-bold!",
  dangerCompact: "store-home-v3-primary-ghost rounded-full! px-4! font-bold! text-rose-600!",
};

type StoreLayoutProps = {
  children: ReactNode;
  className?: string;
};

type StoreSectionHeaderProps = {
  kicker: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export type StoreMetricItem = {
  label: string;
  value: ReactNode;
  description: string;
};

export type StoreInfoItem = {
  label: string;
  value: ReactNode;
  description: string;
};

type StoreEmptyStateProps = {
  kicker: string;
  title: string;
  description: string;
  action?: ReactNode;
};

type StoreInlineNoteProps = {
  title: string;
  description: string;
  tone?: "default" | "warning";
};

type StoreStatusPillProps = {
  status?: string;
  label: string;
};

export function StorePageShell({ children, className }: StoreLayoutProps) {
  return <div className={joinClassNames("store-page-shell", className)}>{children}</div>;
}

export function StoreHeroFrame({ children, className }: StoreLayoutProps) {
  return <section className={joinClassNames("store-page-hero", className)}>{children}</section>;
}

export function StorePanelFrame({ children, className }: StoreLayoutProps) {
  return <section className={joinClassNames("store-page-panel", className)}>{children}</section>;
}

export function StoreSectionHeader({ kicker, title, description, action }: StoreSectionHeaderProps) {
  return (
    <>
      <div className="store-page-head">
        <div className="store-page-head-copy">
          <p>{kicker}</p>
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {description ? <p className="store-page-subtext">{description}</p> : null}
    </>
  );
}

export function StoreHeroSection({ children, className, ...headerProps }: StoreLayoutProps & StoreSectionHeaderProps) {
  return (
    <StoreHeroFrame className={className}>
      <StoreSectionHeader {...headerProps} />
      {children}
    </StoreHeroFrame>
  );
}

export function StorePanelSection({ children, className, ...headerProps }: StoreLayoutProps & StoreSectionHeaderProps) {
  return (
    <StorePanelFrame className={className}>
      <StoreSectionHeader {...headerProps} />
      {children}
    </StorePanelFrame>
  );
}

export function StoreEmptyState({ kicker, title, description, action }: StoreEmptyStateProps) {
  return (
    <section className="store-empty-state">
      <p className="store-page-kicker">{kicker}</p>
      <h1 className="store-page-title">{title}</h1>
      <p className="store-page-text">{description}</p>
      {action ? <div className="store-page-actions">{action}</div> : null}
    </section>
  );
}

export function StoreMetricGrid({ items }: { items: StoreMetricItem[] }) {
  return (
    <div className="store-page-metric-grid">
      {items.map((item) => (
        <article key={item.label} className="store-page-metric-card">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <p>{item.description}</p>
        </article>
      ))}
    </div>
  );
}

export function StoreInfoGrid({ items }: { items: StoreInfoItem[] }) {
  return (
    <div className="store-page-info-grid">
      {items.map((item) => (
        <article key={item.label} className="store-page-info-card">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <p>{item.description}</p>
        </article>
      ))}
    </div>
  );
}

export function StoreInlineNote({ title, description, tone = "default" }: StoreInlineNoteProps) {
  return (
    <div className={joinClassNames("store-inline-note", tone === "warning" && "is-warning")}>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function StoreStatusPill({ status, label }: StoreStatusPillProps) {
  return <span className={joinClassNames("store-status-pill", status && `is-${status}`)}>{label}</span>;
}
