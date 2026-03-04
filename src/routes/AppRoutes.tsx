import { Routes, Route } from "react-router-dom";
import AdminLayout from "../components/layouts/AdminLayout";
import ClientLayout from "../components/layouts/ClientLayout";
import Home from "../pages/client/Home";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import Dashboard from "../pages/admin/dashboard";
import ListCategory from "../pages/admin/category/ListCategory";
import AddCategory from "../pages/admin/category/AddCategory";
import UpdateCategory from "../pages/admin/category/UpdateCategory";
import DetailCategory from "../pages/admin/category/DetailCategory";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      {/* Client */}
      <Route path="/" element={<ClientLayout />}>
        <Route index element={<Home />} />
      </Route>

      {/* Admin */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="/admin/categories" element={<ListCategory />} />
        <Route path="/admin/category/detail/:id" element={<DetailCategory />} />
        <Route path="/admin/categories/create" element={<AddCategory />} />
        <Route path="/admin/categories/edit/:id" element={<UpdateCategory />} />  
      </Route>
    </Routes>
  );
};

export default AppRoutes;
