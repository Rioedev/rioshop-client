import type { Category } from "../../services/categoryService";
import { resolveStoreImageUrl } from "../../features/store/utils/storeFormatting";

export type StoreMenuItem = {
  label: string;
  category: string;
};

export const defaultMenuItems: StoreMenuItem[] = [
  { label: "Ão polo", category: "ao-polo" },
  { label: "Ão sÆ¡ mi", category: "ao-so-mi" },
  { label: "Quáº§n jeans", category: "quan-jeans" },
  { label: "Äá»“ thá»ƒ thao", category: "do-the-thao" },
];

export const policyItems = [
  "Miá»…n phÃ­ Ä‘á»•i tráº£ 60 ngÃ y",
  "Miá»…n phÃ­ ship tá»« 499K",
  "Kiá»ƒm tra hÃ ng trÆ°á»›c khi nháº­n",
  "Hotline 1900 8888",
];

export const utilityLinks = [
  { label: "Há»‡ thá»‘ng cá»­a hÃ ng", href: "/products" },
  { label: "Flash Sale", href: "/flash-sales" },
  { label: "Tra cá»©u Ä‘Æ¡n hÃ ng", href: "/orders" },
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
    { key: "women", title: "Ná»®", keywords: ["nu", "women", "female"] },
    {
      key: "kids",
      title: "TRáºº EM",
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

const fallbackCollectionImages = [
  "https://dummyimage.com/960x420/e2e8f0/0f172a&text=BST+M%E1%BB%9Bi",
  "https://dummyimage.com/960x420/fde2e4/7f1d1d&text=BST+Hot",
  "https://dummyimage.com/960x420/fee2e2/991b1b&text=BST+Flash",
];

export const buildMegaCollectionCards = (
  categoryTree: Category[],
): MegaCollectionCard[] => {
  const imageNodes = flattenCategoryTree(categoryTree)
    .filter((node) => Boolean(node.slug))
    .map((node) => ({
      ...node,
      image: resolveStoreImageUrl(node.image),
    }))
    .filter((node) => Boolean(node.image))
    .slice(0, 3);

  if (imageNodes.length > 0) {
    const cards = imageNodes.map((node, index) => ({
      key: node._id,
      title: `BST ${node.name}`,
      href: toCategoryHref(node.slug),
      image:
        node.image ||
        fallbackCollectionImages[index % fallbackCollectionImages.length],
    }));

    while (cards.length < 3) {
      const index = cards.length;
      cards.push({
        key: `fallback-${index}`,
        title: `BST ná»•i báº­t ${index + 1}`,
        href: "/products",
        image:
          fallbackCollectionImages[index % fallbackCollectionImages.length],
      });
    }

    return cards;
  }

  return fallbackCollectionImages.map((image, index) => ({
    key: `fallback-${index}`,
    title: `BST ná»•i báº­t ${index + 1}`,
    href: "/products",
    image,
  }));
};




