import { Button, Card, Col, Form, InputNumber, Row, Select, Typography } from "antd";
import type { FormInstance } from "antd";
import type { Product } from "../../../services/productService";
import {
  OBJECT_ID_PATTERN,
  createDefaultSlot,
  type FlashSaleFormValues,
} from "../shared/flashSales";

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

export function AdminFlashSaleSlotsField({
  form,
  productById,
  productLoading,
  productSelectOptions,
  getVariantOptionsByProductId,
  handleSlotProductChange,
}: AdminFlashSaleSlotsFieldProps) {
  return (
    <Form.List
      name="slots"
      rules={[
        {
          validator: async (_, value) => {
            if (!value || value.length < 1) {
              throw new Error("Vui lÃ²ng thÃªm Ã­t nháº¥t 1 slot.");
            }
          },
        },
      ]}
    >
      {(fields, { add, remove }, { errors }) => (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Text strong>Danh sÃ¡ch slot flash sale</Text>
            <Button type="dashed" onClick={() => add(createDefaultSlot())}>
              ThÃªm slot
            </Button>
          </div>

          {fields.map((field, index) => {
            const selectedProductId = form.getFieldValue(["slots", field.name, "productId"]) as string | undefined;
            const variantOptions = getVariantOptionsByProductId(selectedProductId);
            const selectedProduct = productById.get((selectedProductId || "").trim());

            return (
              <Card key={field.key} size="small" className="border-slate-200">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <Text strong>Slot #{index + 1}</Text>
                  <Button danger size="small" onClick={() => remove(field.name)}>
                    XÃ³a slot
                  </Button>
                </div>

                <Row gutter={[12, 12]}>
                  <Col xs={24} md={14}>
                    <Form.Item
                      label="Sáº£n pháº©m"
                      name={[field.name, "productId"]}
                      rules={[
                        { required: true, message: "Vui lÃ²ng chá»n sáº£n pháº©m." },
                        {
                          pattern: OBJECT_ID_PATTERN,
                          message: "productId khÃ´ng há»£p lá»‡.",
                        },
                      ]}
                    >
                      <Select
                        showSearch
                        loading={productLoading}
                        placeholder="Chá»n sáº£n pháº©m"
                        options={productSelectOptions}
                        optionFilterProp="label"
                        onChange={(value) => handleSlotProductChange(field.name, value)}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={10}>
                    <Form.Item label="Biáº¿n thá»ƒ (SKU)" name={[field.name, "variantSku"]}>
                      <Select
                        showSearch
                        allowClear
                        placeholder={
                          selectedProduct
                            ? variantOptions.length > 0
                              ? "Chá»n SKU biáº¿n thá»ƒ"
                              : "Sáº£n pháº©m khÃ´ng cÃ³ biáº¿n thá»ƒ"
                            : "Chá»n sáº£n pháº©m trÆ°á»›c"
                        }
                        options={variantOptions}
                        optionFilterProp="label"
                        disabled={!selectedProduct}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      label="GiÃ¡ flash sale"
                      name={[field.name, "salePrice"]}
                      rules={[{ required: true, message: "Nháº­p giÃ¡ flash sale." }]}
                    >
                      <InputNumber min={0} step={1000} className="w-full" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Giá»›i háº¡n bÃ¡n"
                      name={[field.name, "stockLimit"]}
                      rules={[{ required: true, message: "Nháº­p giá»›i háº¡n bÃ¡n." }]}
                    >
                      <InputNumber min={0} className="w-full" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      label="ÄÃ£ bÃ¡n"
                      name={[field.name, "sold"]}
                      rules={[{ required: true, message: "Nháº­p sá»‘ lÆ°á»£ng Ä‘Ã£ bÃ¡n." }]}
                    >
                      <InputNumber min={0} className="w-full" />
                    </Form.Item>
                  </Col>
                </Row>

                <Text type="secondary">
                  GiÃ¡ gá»‘c hiá»‡n táº¡i:{" "}
                  {selectedProduct ? Number(selectedProduct.pricing.salePrice || 0).toLocaleString("vi-VN") : 0}Ä‘
                </Text>
              </Card>
            );
          })}

          <Form.ErrorList errors={errors} />
        </div>
      )}
    </Form.List>
  );
}

