# Frontend package diagram — cấu trúc theo code

> Diagram trực quan: [docs/frontend_package_diagram.html](docs/frontend_package_diagram.html)

| Khu vực | Đường dẫn / nội dung thực tế |
|---|---|
| Entry & định tuyến | `frontend/src/apps/AppRouter.jsx`; `public-router/PublicRouter.jsx`; `dasboard-router/OwnerRouter.jsx`, `SaleRouter.jsx`, `StaffLeaderRouter.jsx` |
| UI | `pages/` (public, owner, sale, staff); `components/`; `ProtectedRoute` |
| Dùng chung | `services/api.js` (Axios), `context/`, `hooks/`, `constants/`, `utils/` |
| Kết nối backend | React gọi REST API qua `services/api.js`; base URL cấu hình bằng `VITE_API_BASE_URL` |

Không có `AdminRouter` hoặc app frontend riêng cho từng role. Owner, Sales và LeaderStaff được phân quyền bằng `ProtectedRoute` trong cùng ứng dụng React.
