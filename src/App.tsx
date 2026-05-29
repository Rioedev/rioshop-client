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

function AppBootFallback() {
  return (
    <div className="store-boot-loader">
      <div className="store-boot-loader__brand">R</div>
      <div className="store-boot-loader__dots" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <p className="store-boot-loader__label">Đang chuẩn bị Rioshop</p>
    </div>
  );
}

function App() {
  return (
    <ConfigProvider locale={viVN} form={{ validateMessages: FORM_VALIDATE_MESSAGES }}>
      <AuthBootstrap />
      <Suspense fallback={<AppBootFallback />}>
        <RouterProvider router={appRouter} />
      </Suspense>
    </ConfigProvider>
  );
}

export default App;
