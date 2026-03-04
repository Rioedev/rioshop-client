import axiosInstance from "./axiosInstance";
import type { ICategory } from "../types/category.type";

/**
 * Kiểu dữ liệu trả về từ mongoose-paginate-v2
 */
export interface IPaginatedCategory {
  docs: ICategory[];
  totalDocs: number;
  limit: number;
  page?: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Lấy danh sách category (có phân trang)
 */
export const getCategories = async (
  page = 1,
  limit = 10,
  status?: "active" | "inactive",
  search?: string,
): Promise<IPaginatedCategory> => {
  const { data } = await axiosInstance.get("/categories", {
    params: {
      page,
      limit,
      ...(status && { status }),
      ...(search && { search }),
    },
  });

  return data;
};
/**
 * Lấy cây category (tree)
 */
export const getCategoryTree = async (): Promise<ICategory[]> => {
  const { data } = await axiosInstance.get("/categories/tree");
  return data;
};

/**
 * Lấy chi tiết category
 */
export const getCategoryById = async (id: string): Promise<ICategory> => {
  const { data } = await axiosInstance.get(`/categories/${id}`);
  return data;
};

/**
 * Tạo category (có thể có ảnh → dùng FormData)
 */
export const createCategory = async (payload: FormData): Promise<ICategory> => {
  // backend expects `/categories/add` for creation
  const { data } = await axiosInstance.post("/categories/add", payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  // API returns { message, category }
  return data.category;
};

/**
 * Cập nhật category
 */
export const updateCategory = async (
  id: string,
  payload: FormData,
): Promise<ICategory> => {
  const { data } = await axiosInstance.put(`/categories/${id}`, payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  // response: { message, category }
  return data.category;
};

/**
 * Soft delete category
 */
export const deleteCategory = async (id: string) => {
  const { data } = await axiosInstance.patch(`/categories/${id}/soft-delete`);
  return data;
};
