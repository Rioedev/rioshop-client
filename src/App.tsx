import { RouterProvider } from "react-router-dom";
import { appRouter } from "./app/router";
import { AuthBootstrap } from "./app/AuthBootstrap";

function App() {
  return (
    <>
      <AuthBootstrap />
      <RouterProvider router={appRouter} />
    </>
  );
}

export default App;
