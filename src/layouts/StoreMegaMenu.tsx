import { DownOutlined } from "@ant-design/icons";
import type { RefObject } from "react";
import { Link } from "react-router-dom";
import type {
  MegaCollectionCard,
  MegaColumn,
} from "./shared/storeLayout";

type StoreMegaMenuProps = {
  megaMenuRef: RefObject<HTMLDivElement | null>;
  isMegaMenuOpen: boolean;
  megaColumns: MegaColumn[];
  normalizedActiveMegaItemKeys: Partial<Record<MegaColumn["key"], string>>;
  megaCollectionCards: MegaCollectionCard[];
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onToggleMenu: () => void;
  onCloseMenuNow: () => void;
  onToggleMegaChildren: (
    columnKey: MegaColumn["key"],
    itemKey: string,
  ) => void;
};

export function StoreMegaMenu({
  megaMenuRef,
  isMegaMenuOpen,
  megaColumns,
  normalizedActiveMegaItemKeys,
  megaCollectionCards,
  onOpenMenu,
  onCloseMenu,
  onToggleMenu,
  onCloseMenuNow,
  onToggleMegaChildren,
}: StoreMegaMenuProps) {
  return (
    <div
      ref={megaMenuRef}
      className={`store-nav-mega ${isMegaMenuOpen ? "is-open" : ""}`}
      onMouseEnter={onOpenMenu}
      onMouseLeave={onCloseMenu}
    >
      <button
        type="button"
        className="store-nav-pill store-nav-pill--mega"
        aria-expanded={isMegaMenuOpen}
        onClick={onToggleMenu}
      >
        Danh mục
        <DownOutlined />
      </button>

      <div className="store-mega-panel">
        <div className="store-mega-grid">
          {megaColumns.map((column) => {
            const activeItemKey = normalizedActiveMegaItemKeys[column.key];
            return (
              <section key={column.key} className="store-mega-col">
                <h4 className="store-mega-heading">{column.title} ↗</h4>
                <div className="store-mega-list">
                  {column.items.map((item) => {
                    const isOpen = item.key === activeItemKey;
                    return (
                      <article
                        key={item.key}
                        className={`store-mega-item ${isOpen ? "is-open" : ""}`}
                      >
                        <div className="store-mega-item-trigger">
                          <Link
                            to={item.href}
                            className="store-mega-item-main"
                            onClick={onCloseMenuNow}
                          >
                            <span className="store-mega-thumb">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.label}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span>{item.label.slice(0, 1).toUpperCase()}</span>
                              )}
                            </span>
                            <span className="store-mega-item-label">
                              {item.label}
                            </span>
                          </Link>
                          {item.children.length > 0 ? (
                            <button
                              type="button"
                              className="store-mega-toggle"
                              aria-expanded={isOpen}
                              onClick={() =>
                                onToggleMegaChildren(column.key, item.key)
                              }
                            >
                              <DownOutlined className="store-mega-chevron" />
                            </button>
                          ) : null}
                        </div>
                        {isOpen && item.children.length > 0 ? (
                          <div className="store-mega-children">
                            {item.children.map((child) => (
                              <Link
                                key={child.key}
                                to={child.href}
                                onClick={onCloseMenuNow}
                              >
                                {child.label}
                              </Link>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <section className="store-mega-col store-mega-col--collection">
            <h4 className="store-mega-heading">BỘ SƯU TẬP</h4>
            <div className="store-mega-collection-list">
              {megaCollectionCards.map((card) => (
                <Link
                  key={card.key}
                  to={card.href}
                  className="store-mega-collection-card"
                  onClick={onCloseMenuNow}
                >
                  <div className="store-mega-collection-media">
                    <img
                      src={card.image}
                      alt={card.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p>{card.title}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
        <div className="store-mega-foot">
          <button type="button" onClick={onCloseMenuNow}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}


