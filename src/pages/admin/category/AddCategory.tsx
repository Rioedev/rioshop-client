import {
  createCategory,
  getCategoryTree,
} from "../../../services/category.service";
import CategoryForm from "../../../components/admin/category/CategoryForm";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { message } from "antd";
import type { ICategory } from "../../../types/category.type";

const AddCategory = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ICategory[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const tree = await getCategoryTree();
        // flatten tree to simple list for select options
        const flatten = (nodes: ICategory[]): ICategory[] =>
          nodes.reduce<ICategory[]>((acc, cur) => {
            acc.push(cur);
            if ((cur as any).children) {
              acc.push(...flatten((cur as any).children));
            }
            return acc;
          }, []);
        setCategories(flatten(tree));
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  const handleCreate = async (formData: FormData) => {
    try {
      await createCategory(formData);
      message.success("Thêm danh mục thành công");
      navigate("/admin/categories");
    } catch (err: any) {
      console.error(err);
      message.error(err?.response?.data?.message || "Lỗi khi thêm danh mục");
    }
  };

  return (
    <div>
      <CategoryForm categories={categories} onSubmit={handleCreate} />
    </div>
  );
};

export default AddCategory;
