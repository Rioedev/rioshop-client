import type { ClipboardEvent, KeyboardEvent } from "react";

const CONTROL_KEYS = new Set([
  "Backspace",
  "Delete",
  "Tab",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "Enter",
  "Escape",
]);

const toInteger = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.floor(parsed);
};

export const getSafeMaxQuantity = (value: unknown, fallback = 1) => {
  const parsed = toInteger(value);
  if (parsed === null || parsed < fallback) {
    return fallback;
  }
  return parsed;
};

export const clampQuantityByStock = (quantity: unknown, maxQuantity: unknown, minimum = 1) => {
  const normalizedMax = getSafeMaxQuantity(maxQuantity, minimum);
  const parsedQuantity = toInteger(quantity);

  if (parsedQuantity === null) {
    return minimum;
  }

  return Math.min(normalizedMax, Math.max(minimum, parsedQuantity));
};

export const blockNonNumericAndOverflowKey = (
  event: KeyboardEvent<HTMLInputElement>,
  maxQuantity: unknown,
) => {
  const normalizedMax = getSafeMaxQuantity(maxQuantity, 1);

  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  if (CONTROL_KEYS.has(event.key)) {
    return;
  }

  if (!/^\d$/.test(event.key)) {
    event.preventDefault();
    return;
  }

  const input = event.currentTarget;
  const currentRaw = input.value || "";
  const selectionStart = input.selectionStart ?? currentRaw.length;
  const selectionEnd = input.selectionEnd ?? currentRaw.length;
  const nextRaw = `${currentRaw.slice(0, selectionStart)}${event.key}${currentRaw.slice(selectionEnd)}`;
  const nextValue = Number(nextRaw);

  if (!Number.isFinite(nextValue) || nextValue > normalizedMax) {
    event.preventDefault();
  }
};

export const blockOverflowPaste = (
  event: ClipboardEvent<HTMLInputElement>,
  maxQuantity: unknown,
) => {
  const normalizedMax = getSafeMaxQuantity(maxQuantity, 1);
  const pastedRaw = (event.clipboardData.getData("text") || "").replace(/\D/g, "");

  if (!pastedRaw) {
    event.preventDefault();
    return;
  }

  const input = event.currentTarget;
  const currentRaw = input.value || "";
  const selectionStart = input.selectionStart ?? currentRaw.length;
  const selectionEnd = input.selectionEnd ?? currentRaw.length;
  const nextRaw = `${currentRaw.slice(0, selectionStart)}${pastedRaw}${currentRaw.slice(selectionEnd)}`;
  const nextValue = Number(nextRaw);

  if (!Number.isFinite(nextValue) || nextValue > normalizedMax) {
    event.preventDefault();
  }
};
