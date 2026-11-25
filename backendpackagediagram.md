# Backend package diagram — cấu trúc theo code

> Diagram trực quan: [docs/backend_package_diagram.html](docs/backend_package_diagram.html)

| Layer | Thư mục / trách nhiệm |
|---|---|
| App | `backend/src/app.js`: cấu hình Express, middleware toàn cục, mount 17 route modules |
| Routes | `routes/*Routes.js`: khai báo endpoint và middleware theo module |
| Controllers | `controllers/*Controller.js`: xử lý request/response, gọi model hoặc service |
| Models | `models/*.js`: Sequelize entities, associations và các query helper nghiệp vụ |
| Services | `services/mailService.js` và `cloudinaryService.js`: tích hợp Gmail/Nodemailer và Cloudinary |
| Database | `config/sequelize.js` kết nối MySQL; schema quản lý tại `database/init.sql` |

Luồng: route → middleware → controller → model/helper → Sequelize → MySQL. Dự án không có repository layer, message queue hoặc cache riêng.
