import type { InventoryRecord } from "../../../services/inventoryService";

export type InventoryAlertLevel = "out_of_stock" | "critical" | "low" | "normal";

export type InventoryAlertInfo = {
  level: InventoryAlertLevel;
  label: string;
  color: string;
  priority: number;
};

const NORMAL_ALERT: InventoryAlertInfo = {
  level: "normal",
  label: "Bình thường",
  color: "default",
  priority: 0,
};

export const getInventoryAlertInfo = (
  item: Pick<InventoryRecord, "available" | "reorderPoint">,
): InventoryAlertInfo => {
  const available = Math.max(0, Number(item.available || 0));
  const reorderPoint = item.reorderPoint === null || item.reorderPoint === undefined
    ? null
    : Math.max(0, Number(item.reorderPoint || 0));

  if (reorderPoint === null) {
    return NORMAL_ALERT;
  }

  if (available <= 0) {
    return {
      level: "out_of_stock",
      label: "Hết hàng",
      color: "red",
      priority: 3,
    };
  }

  const criticalPoint = Math.max(1, Math.floor(reorderPoint / 2));
  if (available <= criticalPoint) {
    return {
      level: "critical",
      label: "Cần nhập gấp",
      color: "volcano",
      priority: 2,
    };
  }

  if (available <= reorderPoint) {
    return {
      level: "low",
      label: "Sắp hết",
      color: "orange",
      priority: 1,
    };
  }

  return NORMAL_ALERT;
};

export const isInventoryAlertActive = (item: Pick<InventoryRecord, "available" | "reorderPoint">) =>
  getInventoryAlertInfo(item).level !== "normal";
