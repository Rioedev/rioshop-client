import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Form, InputNumber, Select, Space, Typography } from "antd";
import type { FormInstance } from "antd";
import { useMemo, useState } from "react";
import type { Product } from "../../../services/productService";
import {
  OBJECT_ID_PATTERN,
  createDefaultSlot,
  type FlashSaleFormValues,
} from "../shared/flashSales";
import { AdminFlashSaleProductPicker } from "./AdminFlashSaleProductPicker";

const { Text } = Typography;

type SelectOption = {
  label: string;
  value: string;
};

type AdminFlashSaleSlotsFieldProps = {
  form: FormInstance<FlashSaleFormValues>;
  productById: Map<string, Product>;
  productLoading: boolean;
  productSelectOptions: SelectOption[];
  getVariantOptionsByProductId: (productId?: string) => SelectOption[];
  handleSlotProductChange: (rowIndex: number | string, productId: string) => void;
};

const roundToThousand = (value: number) => Math.max(0, Math.round(value / 1000) * 1000);

const computeSalePrice = (basePrice: number, percent: number) =>
  basePrice > 0 ? roundToThousand(basePrice * (1 - percent / 100)) : 0;

const computeDiscountPercent = (basePrice: number, salePrice: number) =>
  basePrice > 0 ? Math.max(0, Math.min(99, Math.round((1 - salePrice / basePrice) * 100))) : 0;

export function AdminFlashSaleSlotsField({
  form,
  productById,
  productLoading,
  productSelectOptions,
  getVariantOptionsByProductId,
  handleSlotProductChange,
}: AdminFlashSaleSlotsFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [bulkDiscount, setBulkDiscount] = useState<number>(30);
  const watchedSlots = (Form.useWatch("slots", form) || []) as FlashSaleFormValues["slots"];

  const allProducts = useMemo(() => Array.from(productById.values()), [productById]);

  const excludedProductIds = useMemo(() => {
    const set = new Set<string>();
    watchedSlots.forEach((slot) => {
      if (slot?.productId) set.add(slot.productId);
    });
    return set;
  }, [watchedSlots]);

  const applyBulkDiscount = (percent: number) => {
    const slots = (form.getFieldValue("slots") || []) as FlashSaleFormValues["slots"];
    const next = slots.map((slot) => {
      const product = productById.get(slot.productId);
      const basePrice = Number(product?.pricing?.salePrice || 0);
      if (basePrice <= 0) return slot;
      return { ...slot, salePrice: computeSalePrice(basePrice, percent) };
    });
    form.setFieldsValue({ slots: next });
  };

  const handleBulkAddProducts = (productIds: string[], defaultDiscount: number) => {
    const existing = (form.getFieldValue("slots") || []) as FlashSaleFormValues["slots"];
    const existingIds = new Set(existing.map((s) => s.productId));

    const newSlots = productIds
      .filter((id) => !existingIds.has(id))
      .map((id) => {
        const product = productById.get(id);
        const basePrice = Number(product?.pricing?.salePrice || 0);
        const totalStock = (product?.variants || []).reduce(
          (sum, v) => sum + Math.max(0, Number(v.stock || 0)),
          0,
        );
        return {
          productId: id,
          variantSku: undefined,
          salePrice: computeSalePrice(basePrice, defaultDiscount),
          stockLimit: totalStock || 100,
          sold: 0,
        };
      });

    form.setFieldsValue({ slots: [...existing, ...newSlots] });
    setPickerOpen(false);
  };

  return (
    <Form.List
      name="slots"
      rules={[
        {
          validator: async (_, value) => {
            if (!value || value.length < 1) {
              throw new Error("Vui lòng thêm ít nhất 1 slot.");
            }
          },
        },
      ]}
    >
      {(fields, { add, remove }, { errors }) => (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Text strong>Slot flash sale ({fields.length})</Text>
              <Text type="secondary" className="ml-2 text-xs!">
                Bấm "Thêm SP" để chọn nhiều cùng lúc.
              </Text>
            </div>
            <Space wrap>
              <InputNumber
                min={0}
                max={99}
                value={bulkDiscount}
                onChange={(value) => setBulkDiscount(Number(value) || 0)}
                addonAfter="%"
                style={{ width: 110 }}
                placeholder="% giảm"
              />
              <Button onClick={() => applyBulkDiscount(bulkDiscount)} disabled={fields.length === 0}>
                Áp dụng cho tất cả
              </Button>
              <Button type="dashed" onClick={() => add(createDefaultSlot())}>
                Thêm slot trống
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setPickerOpen(true)}>
                Thêm SP
              </Button>
            </Space>
          </div>

          {fields.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="w-10 px-2 py-2">#</th>
                    <th className="px-2 py-2">Sản phẩm</th>
                    <th className="w-44 px-2 py-2">Variant</th>
                    <th className="w-28 px-2 py-2 text-right">Giá gốc</th>
                    <th className="w-24 px-2 py-2">% giảm</th>
                    <th className="w-32 px-2 py-2">Giá sale</th>
                    <th className="w-24 px-2 py-2">Stock</th>
                    <th className="w-20 px-2 py-2">Đã bán</th>
                    <th className="w-10 px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => {
                    const slotValue = watchedSlots[field.name] || {};
                    const selectedProductId = slotValue.productId || "";
                    const selectedProduct = productById.get(selectedProductId.trim());
                    const basePrice = Number(selectedProduct?.pricing?.salePrice || 0);
                    const variantOptions = getVariantOptionsByProductId(selectedProductId);
                    const currentSalePrice = Number(slotValue.salePrice || 0);
                    const currentPercent = computeDiscountPercent(basePrice, currentSalePrice);

                    return (
                      <tr
                        key={field.key}
                        className="border-b border-slate-100 transition hover:bg-slate-50"
                      >
                        <td className="px-2 py-2 text-xs text-slate-400">{index + 1}</td>
                        <td className="px-2 py-2">
                          <Form.Item
                            name={[field.name, "productId"]}
                            noStyle
                            rules={[
                              { required: true, message: "Bắt buộc" },
                              { pattern: OBJECT_ID_PATTERN, message: "ID không hợp lệ" },
                            ]}
                          >
                            <Select
                              showSearch
                              loading={productLoading}
                              placeholder="Chọn sản phẩm"
                              options={productSelectOptions}
                              optionFilterProp="label"
                              onChange={(value) => handleSlotProductChange(field.name, value)}
                              size="small"
                              className="w-full"
                            />
                          </Form.Item>
                        </td>
                        <td className="px-2 py-2">
                          <Form.Item name={[field.name, "variantSku"]} noStyle>
                            <Select
                              showSearch
                              allowClear
                              placeholder={
                                selectedProduct
                                  ? variantOptions.length > 0
                                    ? "Mặc định (tất cả)"
                                    : "Không có biến thể"
                                  : "—"
                              }
                              options={variantOptions}
                              optionFilterProp="label"
                              disabled={!selectedProduct}
                              size="small"
                              className="w-full"
                            />
                          </Form.Item>
                        </td>
                        <td className="px-2 py-2 text-right text-sm text-slate-600">
                          {basePrice > 0 ? `${basePrice.toLocaleString("vi-VN")}đ` : "—"}
                        </td>
                        <td className="px-2 py-2">
                          <InputNumber
                            min={0}
                            max={99}
                            value={currentPercent}
                            onChange={(value) => {
                              const percent = Number(value);
                              if (!Number.isFinite(percent) || basePrice <= 0) return;
                              const newSale = computeSalePrice(basePrice, percent);
                              const slots = (form.getFieldValue(
                                "slots",
                              ) || []) as FlashSaleFormValues["slots"];
                              const next = [...slots];
                              next[field.name] = { ...next[field.name], salePrice: newSale };
                              form.setFieldsValue({ slots: next });
                            }}
                            addonAfter="%"
                            size="small"
                            className="w-full"
                            disabled={basePrice <= 0}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Form.Item
                            name={[field.name, "salePrice"]}
                            noStyle
                            rules={[{ required: true, message: "Bắt buộc" }]}
                          >
                            <InputNumber
                              min={0}
                              step={1000}
                              size="small"
                              className="w-full"
                              formatter={(value) =>
                                value !== undefined && value !== null
                                  ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                                  : ""
                              }
                              parser={(value) => Number((value || "").replace(/[^0-9]/g, ""))}
                            />
                          </Form.Item>
                        </td>
                        <td className="px-2 py-2">
                          <Form.Item
                            name={[field.name, "stockLimit"]}
                            noStyle
                            rules={[{ required: true, message: "Bắt buộc" }]}
                          >
                            <InputNumber min={0} size="small" className="w-full" />
                          </Form.Item>
                        </td>
                        <td className="px-2 py-2">
                          <Form.Item
                            name={[field.name, "sold"]}
                            noStyle
                            rules={[{ required: true, message: "Bắt buộc" }]}
                          >
                            <InputNumber min={0} size="small" className="w-full" />
                          </Form.Item>
                        </td>
                        <td className="px-2 py-2 text-right">
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => remove(field.name)}
                            aria-label="Xóa slot"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 py-8 text-center text-sm text-slate-500">
              Chưa có sản phẩm trong flash sale. Bấm <strong>"Thêm SP"</strong> để chọn nhiều sản phẩm cùng lúc.
            </div>
          )}

          <Form.ErrorList errors={errors} />

          <AdminFlashSaleProductPicker
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            products={allProducts}
            excludedProductIds={excludedProductIds}
            onConfirm={handleBulkAddProducts}
          />
        </div>
      )}
    </Form.List>
  );
}
