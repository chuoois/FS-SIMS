import { createBrowserRouter, Navigate } from "react-router-dom";
import { PublicRouter } from "../apps/public-router/PublicRouter";
import { OwnerRouter } from "../apps/dasboard-router/OwnerRouter";


export const router = createBrowserRouter([
    PublicRouter,
    OwnerRouter
]);