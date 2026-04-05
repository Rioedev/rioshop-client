import type { Category } from "../../services/categoryService";
import type { Collection } from "../../services/collectionService";
import { resolveStoreImageUrl } from "../../features/store/utils/storeFormatting";

export type StoreMenuItem = {
  label: string;
  category: string;
};

export const defaultMenuItems: StoreMenuItem[] = [
  { label: "Áo polo", category: "ao-polo" },
  { label: "Áo sơ mi", category: "ao-so-mi" },
  { label: "Quần jeans", category: "quan-jeans" },
  { label: "Đồ thể thao", category: "do-the-thao" },
];

export const policyItems = [
  "Miễn phí đổi trả 60 ngày",
  "Miễn phí ship từ 499K",
  "Kiểm tra hàng trước khi nhận",
  "Hotline 1900 8888",
];

export const utilityLinks = [
  { label: "Hệ thống cửa hàng", href: "/products" },
  { label: "Flash Sale", href: "/flash-sales" },
  { label: "Tra cứu đơn hàng", href: "/orders" },
  { label: "Rio Member", href: "/account" },
];

export type MegaLeaf = {
  key: string;
  label: string;
  href: string;
};

export type MegaItem = {
  key: string;
  label: string;
  href: string;
  image?: string;
  children: MegaLeaf[];
};

export type MegaColumn = {
  key: "men" | "women" | "kids";
  title: string;
  items: MegaItem[];
};

export type MegaCollectionCard = {
  key: string;
  title: string;
  href: string;
  image: string;
};

const stripDiacritics = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const toCategoryHref = (slug?: string) =>
  slug ? `/products?category=${encodeURIComponent(slug)}` : "/products";

const toCollectionHref = (slug?: string, id?: string) => {
  const value = slug || id;
  return value
    ? `/products?collection=${encodeURIComponent(value)}`
    : "/products";
};

const flattenCategoryTree = (nodes: Category[]): Category[] =>
  nodes.reduce<Category[]>((acc, node) => {
    acc.push(node);
    if (node.children && node.children.length > 0) {
      acc.push(...flattenCategoryTree(node.children));
    }
    return acc;
  }, []);

const toMegaItem = (node: Category): MegaItem => ({
  key: node._id,
  label: node.name,
  href: toCategoryHref(node.slug),
  image: resolveStoreImageUrl(node.image),
  children: (node.children ?? [])
    .filter((child) => Boolean(child.slug))
    .slice(0, 8)
    .map((child) => ({
      key: child._id,
      label: child.name,
      href: toCategoryHref(child.slug),
    })),
});

export const buildMegaColumns = (categoryTree: Category[]): MegaColumn[] => {
  const rootNodes = categoryTree.filter((node) => Boolean(node.slug));
  const allNodes = flattenCategoryTree(categoryTree).filter((node) =>
    Boolean(node.slug),
  );
  const usedNodeIds = new Set<string>();

  const groupConfigs: Array<{
    key: MegaColumn["key"];
    title: string;
    keywords: string[];
  }> = [
    { key: "men", title: "NAM", keywords: ["nam", "men"] },
    { key: "women", title: "NỮ", keywords: ["nu", "women", "female"] },
    {
      key: "kids",
      title: "TRẺ EM",
      keywords: ["tre em", "kid", "kids", "baby", "be"],
    },
  ];

  const columns = groupConfigs.map((group) => {
    const groupRoot = rootNodes.find((node) => {
      const normalized = stripDiacritics(node.name);
      return group.keywords.some(
        (keyword) =>
          normalized === keyword ||
          normalized.startsWith(`${keyword} `) ||
          normalized.endsWith(` ${keyword}`) ||
          normalized.includes(keyword),
      );
    });

    const sourceNodes = groupRoot
      ? (groupRoot.children ?? []).length > 0
        ? (groupRoot.children ?? [])
        : [groupRoot]
      : allNodes.filter((node) => {
          const normalized = stripDiacritics(node.name);
          return group.keywords.some((keyword) => normalized.includes(keyword));
        });

    const primaryItems = sourceNodes
      .filter((node) => Boolean(node.slug) && !usedNodeIds.has(node._id))
      .slice(0, 8)
      .map((node) => {
        usedNodeIds.add(node._id);
        return toMegaItem(node);
      });

    return {
      key: group.key,
      title: group.title,
      items: primaryItems,
    };
  });

  const remaining = allNodes.filter((node) => !usedNodeIds.has(node._id));
  let remainingIndex = 0;

  columns.forEach((column) => {
    while (column.items.length < 8 && remainingIndex < remaining.length) {
      const candidate = remaining[remainingIndex];
      remainingIndex += 1;
      if (!candidate.slug) continue;
      column.items.push(toMegaItem(candidate));
    }
  });

  return columns;
};

export const buildMegaCollectionCards = (
  collections: Collection[],
): MegaCollectionCard[] => {
  return collections
    .filter((item) => item.isActive !== false)
    .map((item) => ({
      key: item._id,
      title: item.name,
      href: toCollectionHref(item.slug, item._id),
      image: resolveStoreImageUrl(item.image || item.bannerImage),
      position: Number.isFinite(item.position) ? item.position : 0,
    }))
    .filter((item) => Boolean(item.image))
    .sort((a, b) => a.position - b.position)
    .slice(0, 3)
    .map(({ key, title, href, image }) => ({
      key,
      title,
      href,
      image: image as string,
    }));
};
