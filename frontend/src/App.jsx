import { Suspense } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./apps/AppRouter";
import { RouteLoadingFallback } from "./components/common/RouteLoadingFallback";
import { Toaster } from "react-hot-toast";

export const App = () => {
  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <Suspense fallback={<RouteLoadingFallback />}>
        <RouterProvider router={router} />
      </Suspense>
    </>
  );
};