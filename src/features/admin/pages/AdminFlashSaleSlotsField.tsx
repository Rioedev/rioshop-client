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
              throw new Error("Vui lòng thêm ít nhất 1 slot.");
            }
          },
        },
      ]}
    >
      {(fields, { add, remove }, { errors }) => (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Text strong>Danh sách slot flash sale</Text>
            <Button type="dashed" onClick={() => add(createDefaultSlot())}>
              Thêm slot
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
                    Xóa slot
                  </Button>
                </div>

                <Row gutter={[12, 12]}>
                  <Col xs={24} md={14}>
                    <Form.Item
                      label="Sản phẩm"
                      name={[field.name, "productId"]}
                      rules={[
                        { required: true, message: "Vui lòng chọn sản phẩm." },
                        {
                          pattern: OBJECT_ID_PATTERN,
                          message: "productId không hợp lệ.",
                        },
                      ]}
                    >
                      <Select
                        showSearch
                        loading={productLoading}
                        placeholder="Chọn sản phẩm"
                        options={productSelectOptions}
                        optionFilterProp="label"
                        onChange={(value) => handleSlotProductChange(field.name, value)}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={10}>
                    <Form.Item label="Biến thể (SKU)" name={[field.name, "variantSku"]}>
                      <Select
                        showSearch
                        allowClear
                        placeholder={
                          selectedProduct
                            ? variantOptions.length > 0
                              ? "Chọn SKU biến thể"
                              : "Sản phẩm không có biến thể"
                            : "Chọn sản phẩm trước"
                        }
                        options={variantOptions}
                        optionFilterProp="label"
                        disabled={!selectedProduct}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Giá flash sale"
                      name={[field.name, "salePrice"]}
                      rules={[{ required: true, message: "Nhập giá flash sale." }]}
                    >
                      <InputNumber min={0} step={1000} className="w-full" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Giới hạn bán"
                      name={[field.name, "stockLimit"]}
                      rules={[{ required: true, message: "Nhập giới hạn bán." }]}
                    >
                      <InputNumber min={0} className="w-full" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Đã bán"
                      name={[field.name, "sold"]}
                      rules={[{ required: true, message: "Nhập số lượng đã bán." }]}
                    >
                      <InputNumber min={0} className="w-full" />
                    </Form.Item>
                  </Col>
                </Row>

                <Text type="secondary">
                  Giá gốc hiện tại:{" "}
                  {selectedProduct ? Number(selectedProduct.pricing.salePrice || 0).toLocaleString("vi-VN") : 0}đ
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


