import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getCategoryById,
  updateCategory,
  getCategoryTree,
} from "../../../services/category.service";
import { message } from "antd";
import CategoryForm from "../../../components/admin/category/CategoryForm";
import type { ICategory } from "../../../types/category.type";

const UpdateCategory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState<unknown>(null);
  const [categories, setCategories] = useState<ICategory[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (id) {
        const cat = await getCategoryById(id);
        setCategory(cat);
      }
      try {
        const tree = await getCategoryTree();
        const flatten = (nodes: ICategory[]): ICategory[] =>
          nodes.reduce<ICategory[]>((acc, cur) => {
            acc.push(cur);
            if ((cur as any).children) {
              acc.push(...flatten((cur as any).children));
            }
            return acc;
          }, []);
        setCategories(flatten(tree));
      } catch { /* empty */ }
    };

    loadData();
  }, [id]);

  const handleUpdate = async (formData: FormData) => {
    if (!id) return;
    try {
      await updateCategory(id, formData);
      message.success("Cập nhật thành công");
      navigate("/admin/categories");
    } catch (err: any) {
      console.error(err);
      message.error(
        err?.response?.data?.message || "Lỗi khi cập nhật danh mục",
      );
    }
  };

  if (!category) return <p>Loading...</p>;

  return (
    <div>
      <h2>Sửa danh mục</h2>
      <CategoryForm
        defaultValues={category}
        categories={categories}
        onSubmit={handleUpdate}
      />
    </div>
  );
};

export default UpdateCategory;
