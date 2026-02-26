import { Routes, Route } from "react-router-dom";
import AdminLayout from "../components/layouts/AdminLayout";
import ClientLayout from "../components/layouts/ClientLayout";

// import Dashboard from "../pages/admin/Dashboard";
// import ProductManager from "../pages/admin/ProductManager";

import Home from "../pages/client/Home";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

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
        {/* <Route index element={<Dashboard />} />
        <Route path="products" element={<ProductManager />} /> */}
      </Route>
    </Routes>
  );
};

export default AppRoutes;
