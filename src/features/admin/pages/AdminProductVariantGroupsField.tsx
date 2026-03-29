import { CopyOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { AutoComplete, Button, Card, Form, Input, InputNumber, Space, Switch, Upload } from "antd";
import type { FormInstance } from "antd/es/form";
import type { UploadProps } from "antd/es/upload";
import {
  REQUIRED_RULE,
  VARIANT_SIZE_OPTIONS,
  defaultVariantGroup,
  defaultVariantSize,
  type ProductFormValues,
  type VariantGroupFormValue,
  type VariantImageFormValue,
  type VariantSizeFormValue,
  Text,
  Title,
} from "./adminProductsShared";

type AdminProductVariantGroupsFieldProps = {
  form: FormInstance<ProductFormValues>;
  variantSkuPreviewMatrix: string[][];
  appendSizesForGroup: (groupIndex: number) => void;
  handleVariantGroupUpload: (groupFieldName: number) => UploadProps["customRequest"];
  beforeUpload: UploadProps["beforeUpload"];
  unregisterPendingFile: (pendingFileId?: string) => void;
  handleCopy: (value: string, label: string) => Promise<void>;
};

export function AdminProductVariantGroupsField({
  form,
  variantSkuPreviewMatrix,
  appendSizesForGroup,
  handleVariantGroupUpload,
  beforeUpload,
  unregisterPendingFile,
  handleCopy,
}: AdminProductVariantGroupsFieldProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Title level={5} className="mb-0! mt-0!">
          Màu sắc & size
        </Title>
        <Button
          type="dashed"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => {
            const currentGroups = ((form.getFieldValue("variantGroups") ?? []) as VariantGroupFormValue[]);
            form.setFieldValue("variantGroups", [...currentGroups, defaultVariantGroup()]);
          }}
        >
          Thêm màu
        </Button>
      </div>

      <Form.List name="variantGroups">
        {(groupFields, { remove: removeGroup }) => (
          <div className="space-y-3">
            {groupFields.map((groupField, groupIndex) => (
              <Card
                key={groupField.key}
                size="small"
                title={`Màu #${groupIndex + 1}`}
                extra={
                  <Button
                    size="small"
                    danger
                    onClick={() => {
                      const groupImages = (form.getFieldValue([
                        "variantGroups",
                        groupField.name,
                        "imageItems",
                      ]) ?? []) as VariantImageFormValue[];
                      groupImages.forEach((imageItem) =>
                        unregisterPendingFile(imageItem.pendingFileId),
                      );
                      removeGroup(groupField.name);
                    }}
                  >
                    Xóa
                  </Button>
                }
              >
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-start">
                  <div className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <Form.Item
                        label="Tên màu"
                        name={[groupField.name, "colorName"]}
                        rules={REQUIRED_RULE}
                      >
                        <Input placeholder="VD: Đen" />
                      </Form.Item>
                      <Form.Item label="Mã màu HEX" name={[groupField.name, "colorHex"]}>
                        <Input placeholder="#000000" />
                      </Form.Item>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <Text strong>Danh sách size</Text>
                        <Button
                          size="small"
                          type="dashed"
                          icon={<PlusOutlined />}
                          onClick={() => {
                            const currentSizes = ((form.getFieldValue([
                              "variantGroups",
                              groupField.name,
                              "sizes",
                            ]) ?? []) as VariantSizeFormValue[]);
                            form.setFieldValue(["variantGroups", groupField.name, "sizes"], [
                              ...currentSizes,
                              defaultVariantSize("M"),
                            ]);
                          }}
                        >
                          Thêm size
                        </Button>
                      </div>

                      <Form.List name={[groupField.name, "sizes"]}>
                        {(sizeFields, { remove: removeSize }) => (
                          <div className="space-y-2">
                            <div className="hidden gap-2 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_72px_40px]">
                              <span>Kích thước</span>
                              <span>Nhãn size</span>
                              <span>Tồn kho</span>
                              <span>Giá cộng</span>
                              <span>Hoạt động</span>
                              <span>Xóa</span>
                            </div>
                            {sizeFields.map((sizeField) => (
                              <div
                                key={sizeField.key}
                                className="grid gap-2 rounded-md border border-slate-200 p-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_72px_40px]"
                              >
                                <Form.Item
                                  name={[sizeField.name, "size"]}
                                  rules={REQUIRED_RULE}
                                  className="mb-0!"
                                >
                                  <AutoComplete
                                    options={VARIANT_SIZE_OPTIONS}
                                    placeholder="Ví dụ: M"
                                    filterOption={(inputValue, option) =>
                                      String(option?.value ?? "")
                                        .toLowerCase()
                                        .includes(inputValue.toLowerCase())
                                    }
                                  />
                                </Form.Item>
                                <Form.Item name={[sizeField.name, "sizeLabel"]} className="mb-0!">
                                  <Input placeholder="Ví dụ: M" />
                                </Form.Item>
                                <Form.Item
                                  name={[sizeField.name, "stock"]}
                                  rules={REQUIRED_RULE}
                                  className="mb-0!"
                                >
                                  <InputNumber min={0} className="w-full!" placeholder="0" />
                                </Form.Item>
                                <Form.Item
                                  name={[sizeField.name, "additionalPrice"]}
                                  className="mb-0!"
                                >
                                  <InputNumber min={0} className="w-full!" placeholder="0" />
                                </Form.Item>
                                <Form.Item
                                  name={[sizeField.name, "isActive"]}
                                  valuePropName="checked"
                                  className="mb-0!"
                                >
                                  <Switch />
                                </Form.Item>
                                <Button
                                  danger
                                  icon={<DeleteOutlined />}
                                  className="h-8 w-10 min-w-0 sm:justify-self-start lg:justify-self-end"
                                  onClick={() => removeSize(sizeField.name)}
                                />
                                <div className="sm:col-span-2 lg:col-span-6">
                                  <Text className="text-xs text-slate-500">SKU biến thể</Text>
                                  <Space.Compact className="mt-1 w-full">
                                    <Input
                                      readOnly
                                      value={variantSkuPreviewMatrix[groupField.name]?.[sizeField.name] ?? ""}
                                      placeholder="SKU sẽ tự sinh"
                                    />
                                    <Button
                                      icon={<CopyOutlined />}
                                      onClick={() =>
                                        void handleCopy(
                                          variantSkuPreviewMatrix[groupField.name]?.[sizeField.name] ?? "",
                                          "SKU biến thể",
                                        )
                                      }
                                    >
                                      Copy
                                    </Button>
                                  </Space.Compact>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </Form.List>

                      <div className="mt-2">
                        <Text className="mb-1 block">Tạo nhanh size</Text>
                        <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-start">
                          <Form.Item
                            name={[groupField.name, "bulkSizesText"]}
                            extra="VD: S:5, M:8, L:3"
                            className="mb-0!"
                          >
                            <Input placeholder="Nhập size nhanh" />
                          </Form.Item>
                          <Button
                            className="self-start"
                            onClick={() => appendSizesForGroup(groupField.name)}
                          >
                            Áp dụng
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                    <Text className="text-sm" strong>
                      Ảnh theo màu
                    </Text>
                    <div className="mt-2">
                      <Upload
                        accept="image/*"
                        multiple
                        showUploadList={false}
                        customRequest={handleVariantGroupUpload(groupField.name)}
                        beforeUpload={beforeUpload}
                      >
                        <Button size="small" icon={<PlusOutlined />} block>
                          Thêm ảnh
                        </Button>
                      </Upload>
                    </div>
                    <Form.List name={[groupField.name, "imageItems"]}>
                      {(imageFields, { remove: removeImage }) => (
                        <div className="mt-2 space-y-2">
                          {imageFields.map((imageField) => (
                            <div key={imageField.key} className="grid gap-2 grid-cols-[1fr_32px]">
                              <Form.Item
                                name={[imageField.name, "url"]}
                                rules={REQUIRED_RULE}
                                className="mb-0!"
                              >
                                <Input size="small" placeholder="URL ảnh màu" />
                              </Form.Item>
                              <Button
                                size="small"
                                danger
                                className="w-8"
                                icon={<DeleteOutlined />}
                                onClick={() => {
                                  const imageItem = form.getFieldValue([
                                    "variantGroups",
                                    groupField.name,
                                    "imageItems",
                                    imageField.name,
                                  ]) as VariantImageFormValue | undefined;
                                  unregisterPendingFile(imageItem?.pendingFileId);
                                  removeImage(imageField.name);
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </Form.List>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Form.List>
    </div>
  );
}
