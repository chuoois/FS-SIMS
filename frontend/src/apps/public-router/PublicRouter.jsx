import { HomeLayout } from "../../components/layouts/home-layout/HomeLayout";
import { LoginPage } from "../../pages/public-pages/LoginPage";
import { RegisterPage } from "../../pages/public-pages/RegisterPage";
import { ForgotPasswordPage } from "../../pages/public-pages/ForgotpasswordPage";
import { HomePage } from "../../pages/public-pages/HomePage";
import { InteriorDesignPage } from "../../pages/public-pages/InteriorDesignPage";
import { ProductPage } from "../../pages/public-pages/ProductPage";
import { AboutPage, ContactPage } from "../../pages/public-pages/InfoPages";
import { CartPage } from "../../pages/public-pages/Cartpage";
import { ProductFavoritePage } from "../../pages/public-pages/ProductFavoritePage";
import { ProfilePage } from "../../pages/public-pages/Profilepage";
import { ProtectedRoute } from "../../components/auth/ProtectedRoute";

export const PublicRouter = {
  path: "/",
  element: <HomeLayout />,
  children: [
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
      path: 'about',
      element: <AboutPage />
    },
    {
      path: 'contact',
      element: <ContactPage />
    },
    {
      path: 'my-cart',
      element: <CartPage />
    },
    {
      path: 'my-favorites',
      element: <ProductFavoritePage />
    },

    // ── Routes yêu cầu đăng nhập (mọi role) ─────────────────
    {
      element: <ProtectedRoute />,
      children: [
        {
          path: 'profile',
          element: <ProfilePage />,
        },
      ],
    },
  ],
};
