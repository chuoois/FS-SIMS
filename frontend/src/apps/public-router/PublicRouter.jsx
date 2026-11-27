import { redirect } from "react-router-dom";
import { lazyNamed } from "../../utils/lazyNamed";
import { HomeLayout } from "../../components/layouts/home-layout/HomeLayout";
import { ProtectedRoute } from "../../components/auth/ProtectedRoute";
import { ROLES } from "../../constants/roles";

const LoginPage = lazyNamed(() => import("../../pages/public-pages/LoginPage"), "LoginPage");
const RegisterPage = lazyNamed(() => import("../../pages/public-pages/RegisterPage"), "RegisterPage");
const ForgotPasswordPage = lazyNamed(
  () => import("../../pages/public-pages/ForgotpasswordPage"),
  "ForgotPasswordPage"
);
const HomePage = lazyNamed(() => import("../../pages/public-pages/HomePage"), "HomePage");
const InteriorDesignPage = lazyNamed(
  () => import("../../pages/public-pages/InteriorDesignPage"),
  "InteriorDesignPage"
);
const ProductPage = lazyNamed(() => import("../../pages/public-pages/ProductPage"), "ProductPage");
const ProductDetailPage = lazyNamed(
  () => import("../../pages/public-pages/ProductDetailPage"),
  "ProductDetailPage"
);
const AboutPage = lazyNamed(() => import("../../pages/public-pages/InfoPages"), "AboutPage");
const ContactPage = lazyNamed(() => import("../../pages/public-pages/InfoPages"), "ContactPage");
const CartPage = lazyNamed(() => import("../../pages/public-pages/Cartpage"), "CartPage");
const ProfilePage = lazyNamed(() => import("../../pages/public-pages/Profilepage"), "ProfilePage");
const CustomerOrdersPage = lazyNamed(
  () => import("../../pages/public-pages/CustomerOrdersPage"),
  "CustomerOrdersPage"
);
const CustomerOrderDetailPage = lazyNamed(
  () => import("../../pages/public-pages/CustomerOrderDetailPage"),
  "CustomerOrderDetailPage"
);

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
          path: "my-orders/requests/:requestId",
          element: <CustomerOrderDetailPage />,
        },
        {
          path: "my-orders/:id",
          element: <CustomerOrderDetailPage />,
        },
      ],
    },
  ],
};