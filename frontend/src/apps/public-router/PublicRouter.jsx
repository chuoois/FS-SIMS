import { redirect } from "react-router-dom";
import { HomeLayout } from "../../components/layouts/home-layout/HomeLayout";
import { LoginPage } from "../../pages/public-pages/LoginPage";
import { RegisterPage } from "../../pages/public-pages/RegisterPage";
import { ForgotPasswordPage } from "../../pages/public-pages/ForgotpasswordPage";
import { HomePage } from "../../pages/public-pages/HomePage";
import { InteriorDesignPage } from "../../pages/public-pages/InteriorDesignPage";
import { ProductPage } from "../../pages/public-pages/ProductPage";
import { ProductDetailPage } from "../../pages/public-pages/ProductDetailPage";
import { AboutPage, ContactPage } from "../../pages/public-pages/InfoPages";
import { CartPage } from "../../pages/public-pages/Cartpage";
import { ProductFavoritePage } from "../../pages/public-pages/ProductFavoritePage";
import { ProfilePage } from "../../pages/public-pages/Profilepage";
import { CustomerOrdersPage } from "../../pages/public-pages/CustomerOrdersPage";
import { CustomerOrderDetailPage } from "../../pages/public-pages/CustomerOrderDetailPage";
import { ProtectedRoute } from "../../components/auth/ProtectedRoute";
import { ROLES } from "../../constants/roles";

export const PublicRouter = {
  path: "/",
  element: <HomeLayout />,
  children: [
    // "/" -> "/home"
    {
      index: true,
      loader: () => redirect("/home"),
    },
    {
      path: "home",
      element: <HomePage />,
    },
    {
      path: "login",
      element: <LoginPage />,
    },
    {
      path: "register",
      element: <RegisterPage />,
    },
    {
      path: "forgot-password",
      element: <ForgotPasswordPage />,
    },
    {
      path: "interior-design",
      element: <InteriorDesignPage />,
    },
    {
      path: "products",
      element: <ProductPage />,
    },
    {
      path: "products/:id",
      element: <ProductDetailPage />,
    },
    {
      path: "san-pham/:id",
      element: <ProductDetailPage />,
    },
    {
      path: "about",
      element: <AboutPage />,
    },
    {
      path: "contact",
      element: <ContactPage />,
    },
    {
      path: "my-cart",
      element: <CartPage />,
    },
    {
      path: "my-favorites",
      element: <ProductFavoritePage />,
    },

    // ── Routes yêu cầu đăng nhập (mọi role) ─────────────────
    {
      element: <ProtectedRoute />,
      children: [
        {
          path: "profile",
          element: <ProfilePage />,
        },
      ],
    },
    {
      element: <ProtectedRoute roles={[ROLES.CUSTOMER]} />,
      children: [
        {
          path: "my-orders",
          element: <CustomerOrdersPage />,
        },
        {
          path: "my-orders/:id",
          element: <CustomerOrderDetailPage />,
        },
      ],
    },
  ],
};