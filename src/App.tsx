import { Suspense } from "react";
import { ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import { RouterProvider } from "react-router-dom";
import { appRouter } from "./app/router";
import { AuthBootstrap } from "./app/AuthBootstrap";

const FORM_VALIDATE_MESSAGES = {
  default: "Giá trị không hợp lệ.",
  required: "${label} là bắt buộc.",
  types: {
    email: "${label} không đúng định dạng email.",
    number: "${label} phải là số.",
    integer: "${label} phải là số nguyên.",
    url: "${label} phải là URL hợp lệ.",
  },
  string: {
    min: "${label} phải có ít nhất ${min} ký tự.",
    max: "${label} không được vượt quá ${max} ký tự.",
    range: "${label} phải có từ ${min} đến ${max} ký tự.",
  },
  number: {
    min: "${label} phải lớn hơn hoặc bằng ${min}.",
    max: "${label} phải nhỏ hơn hoặc bằng ${max}.",
    range: "${label} phải nằm trong khoảng từ ${min} đến ${max}.",
  },
};

function App() {
  return (
    <ConfigProvider locale={viVN} form={{ validateMessages: FORM_VALIDATE_MESSAGES }}>
      <AuthBootstrap />
      <Suspense fallback={<div className="p-4 text-sm text-slate-500">Đang tải trang...</div>}>
        <RouterProvider router={appRouter} />
      </Suspense>
    </ConfigProvider>
  );
}

export default App;
