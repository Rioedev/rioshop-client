import { Suspense } from "react";
import { RouterProvider } from "react-router-dom";
import { appRouter } from "./app/router";
import { AuthBootstrap } from "./app/AuthBootstrap";

function App() {
  return (
    <>
      <AuthBootstrap />
      <Suspense fallback={<div className="p-4 text-sm text-slate-500">Đang tải trang...</div>}>
        <RouterProvider router={appRouter} />
      </Suspense>
    </>
  );
}

export default App;
