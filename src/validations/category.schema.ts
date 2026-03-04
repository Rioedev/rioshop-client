// validations/category.schema.ts

import * as yup from "yup";

export const categorySchema = yup.object({
  name: yup
    .string()
    .required("Tên danh mục là bắt buộc")
    .min(3, "Tối thiểu 3 ký tự")
    .defined(),

  description: yup
    .string()
    .max(500, "Tối đa 500 ký tự")
    .optional(),

  sortOrder: yup
    .number()
    .typeError("Phải là số")
    .required("Thứ tự là bắt buộc")
    .default(0)
    .defined(),

  status: yup
    .string()
    .oneOf(["active", "inactive"])
    .required("Trạng thái là bắt buộc")
    .default("active")
    .defined(),

  // root category có thể không có cha
  parentId: yup
    .string()
    .nullable()
    .optional(),
});