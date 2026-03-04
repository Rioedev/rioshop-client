import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { categorySchema } from "../../../validations/category.schema";
import type { ICategory } from "../../../types/category.type";
import type { InferType } from "yup";

import { useState } from "react";
import {
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Row,
  Col,
  Upload,
  Typography,
  message,
  Divider,
} from "antd";
import {
  UploadOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import type { UploadProps } from "antd";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

export type CategoryFormValues = InferType<typeof categorySchema>;

interface Props {
  defaultValues?: Partial<ICategory>;
  categories?: ICategory[];
  onSubmit: (data: FormData) => void;
}

const CategoryForm = ({ defaultValues, categories = [], onSubmit }: Props) => {
  const navigate = useNavigate();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(categorySchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      sortOrder: defaultValues?.sortOrder ?? 0,
      status: defaultValues?.status ?? "active",
      parentId:
        typeof defaultValues?.parentId === "string"
          ? defaultValues.parentId
          : (defaultValues?.parentId?._id ?? null),
    },
  });

  const [preview, setPreview] = useState<string | null>(
    defaultValues?.image?.url || null,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const submitHandler = (data: CategoryFormValues) => {
    // image must be provided either selected now or already exists (when editing)
    if (!selectedFile && !defaultValues?.image?.url) {
      message.error("Ảnh danh mục là bắt buộc");
      return;
    }

    const formData = new FormData();

    formData.append("name", data.name);
    formData.append("description", data.description || "");
    formData.append("sortOrder", String(data.sortOrder));
    formData.append("status", data.status);

    if (data.parentId) {
      formData.append("parentId", data.parentId);
    }

    if (selectedFile) {
      formData.append("image", selectedFile);
    }

    onSubmit(formData);
  };

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      return false;
    },
    showUploadList: false,
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Title level={2} className="!mb-2">
          {defaultValues ? "Cập nhật danh mục" : "Thêm danh mục mới"}
        </Title>
        <Text type="secondary" className="text-base">
          {defaultValues
            ? "Cập nhật thông tin danh mục sản phẩm"
            : "Tạo một danh mục mới cho cửa hàng của bạn"}
        </Text>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">
        <Form layout="vertical" onFinish={handleSubmit(submitHandler)}>
          <Row gutter={[32, 24]}>
            {/* LEFT COLUMN - Main Info */}
            <Col xs={24} md={14}>
              <div className="space-y-6">
                {/* Section Title */}
                <div>
                  <Title level={4} className="!mb-4">
                    Thông tin cơ bản
                  </Title>
                </div>

                {/* Tên danh mục */}
                <Form.Item
                  label={
                    <span className="font-semibold text-gray-900">
                      Tên danh mục
                    </span>
                  }
                  validateStatus={errors.name ? "error" : ""}
                  help={errors.name?.message}
                  className="!mb-0"
                >
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        size="large"
                        placeholder="Nhập tên danh mục"
                        className="!rounded-lg"
                      />
                    )}
                  />
                </Form.Item>

                {/* Mô tả */}
                <Form.Item
                  label={
                    <span className="font-semibold text-gray-900">Mô tả</span>
                  }
                  validateStatus={errors.description ? "error" : ""}
                  help={errors.description?.message}
                  className="!mb-0"
                >
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <Input.TextArea
                        {...field}
                        rows={4}
                        placeholder="Nhập mô tả chi tiết về danh mục..."
                        className="!rounded-lg"
                      />
                    )}
                  />
                </Form.Item>

                <Divider className="!my-6" />

                {/* Section Title */}
                <div>
                  <Title level={4} className="!mb-4">
                    Cấu hình thêm
                  </Title>
                </div>

                <Row gutter={[16, 16]}>
                  {/* Thứ tự hiển thị */}
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label={
                        <span className="font-semibold text-gray-900">
                          Thứ tự hiển thị
                        </span>
                      }
                      validateStatus={errors.sortOrder ? "error" : ""}
                      help={errors.sortOrder?.message}
                      className="!mb-0"
                    >
                      <Controller
                        name="sortOrder"
                        control={control}
                        render={({ field }) => (
                          <InputNumber
                            {...field}
                            size="large"
                            className="!w-full !rounded-lg"
                            min={0}
                            placeholder="0"
                          />
                        )}
                      />
                    </Form.Item>
                  </Col>

                  {/* Trạng thái */}
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label={
                        <span className="font-semibold text-gray-900">
                          Trạng thái
                        </span>
                      }
                      className="!mb-0"
                    >
                      <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                          <Select
                            {...field}
                            size="large"
                            className="!rounded-lg"
                            optionLabelProp="label"
                          >
                            <Select.Option
                              value="active"
                              label={
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                  Hoạt động
                                </span>
                              }
                            >
                              Hoạt động
                            </Select.Option>
                            <Select.Option
                              value="inactive"
                              label={
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                  Không hoạt động
                                </span>
                              }
                            >
                              Không hoạt động
                            </Select.Option>
                          </Select>
                        )}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* Danh mục cha */}
                <Form.Item
                  label={
                    <span className="font-semibold text-gray-900">
                      Danh mục cha
                    </span>
                  }
                  className="!mb-0"
                >
                  <Controller
                    name="parentId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        allowClear
                        size="large"
                        placeholder="-- Chọn danh mục cha (tuỳ chọn) --"
                        className="!rounded-lg"
                      >
                        {categories
                          .filter((c) => c._id !== defaultValues?._id)
                          .map((cat) => (
                            <Select.Option key={cat._id} value={cat._id}>
                              {cat.name}
                            </Select.Option>
                          ))}
                      </Select>
                    )}
                  />
                </Form.Item>
              </div>
            </Col>

            {/* RIGHT COLUMN - Image */}
            <Col xs={24} md={10}>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200">
                <div>
                  <Title level={4} className="!mb-4">
                    Ảnh danh mục
                  </Title>
                  <Text type="secondary" className="text-sm">
                    Tải lên ảnh đại diện cho danh mục này
                  </Text>
                </div>

                <div className="mt-6">
                  {preview ? (
                    <div className="relative">
                      <img
                        src={preview}
                        alt="preview"
                        className="w-full h-64 object-cover rounded-xl border-2 border-dashed border-indigo-300 shadow-md"
                      />
                      <Upload
                        {...uploadProps}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      >
                        <div></div>
                      </Upload>
                      <Button
                        type="text"
                        size="small"
                        className="mt-3 !text-indigo-600"
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.click();
                        }}
                      >
                        Chọn ảnh khác
                      </Button>
                    </div>
                  ) : (
                    <Upload {...uploadProps}>
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-indigo-400 transition-colors cursor-pointer">
                        <UploadOutlined className="text-4xl text-gray-300 mb-4 block" />
                        <Text className="block text-gray-600 font-medium">
                          Nhấp để chọn ảnh
                        </Text>
                        <Text type="secondary" className="text-sm">
                          hoặc kéo thả ảnh vào đây
                        </Text>
                      </div>
                    </Upload>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <Text type="secondary" className="text-xs">
                    ✓ Định dạng: JPG, PNG, GIF
                    <br />✓ Kích thước tối đa: 5MB
                    <br />✓ Khuyên dùng: 800x600px hoặc lớn hơn
                  </Text>
                </div>
              </div>
            </Col>
          </Row>

          {/* Actions */}
          <Divider className="!my-8" />
          <div className="flex justify-end gap-3">
            <Button
              size="large"
              onClick={() => navigate("/admin/categories")}
              className="!rounded-lg"
            >
              Huỷ
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              icon={<SaveOutlined />}
              className="!bg-indigo-600 hover:!bg-indigo-700 !border-none !rounded-lg !font-semibold"
            >
              {defaultValues ? "Cập nhật danh mục" : "Tạo danh mục"}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default CategoryForm;
