# SYSTEM ARCHITECTURE - FS-SIMS (Furniture Sales & Inventory Management System)

> 📌 **Tài liệu Kiến trúc Hệ thống chuẩn hóa** cho dự án **FS-SIMS** (Hệ thống Quản lý Bán hàng & Kho Xưởng Nội thất).
> Mọi thông tin dưới đây phản ánh **chính xác 100% codebase thực tế** của dự án, được dùng làm căn cứ kỹ thuật để thiết kế Component Diagram, Package Diagram và Sequence Diagram.

---

## 1. TỔNG QUAN TECH STACK

| Thành phần | Công nghệ thực tế | Ghi chú & Cấu hình |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Vite 5 + Tailwind CSS + Axios | - Dev: Chạy port `5173` (`http://localhost:5173`)<br>- Prod: Chạy port `80` (Nginx static build)<br>- Quản lý định tuyến: `react-router-dom` v6 |
| **Backend** | Node.js + Express 4 (Kiến trúc MVC) | - Chạy port `5000`<br>- Entry point API: `http://localhost:5000/api`<br>- Kiến trúc: `routes` -> `controllers` -> `models` (Sequelize) + `services` + `middlewares` |
| **Entry Point** | Nginx (Reverse Proxy / Static Web Server) | - Prod: `http://localhost` qua Nginx<br>- Dev: Frontend Vite `http://localhost:5173` & Backend API `http://localhost:5000/api`<br>- Quản trị DB: `http://localhost:8080` (phpMyAdmin) |
| **Database chính** | MySQL 8 (`db_2026_fssims`) | - Port `3306`<br>- ORM: Sequelize 6.37 + `mysql2`<br>- Quản lý schema & seed: `database/init.sql` (không dùng `sequelize.sync()`) |
| **Message Queue** | **Không có** | Dự án xử lý đồng bộ trực tiếp qua HTTP RESTful API, không dùng RabbitMQ/Kafka. |
| **Cache** | **Không có** | Không sử dụng Redis hay Memcached; truy vấn trực tiếp từ MySQL Database. |
| **File / Media Storage** | Cloudinary API | - Lưu trữ avatar người dùng, hình ảnh sản phẩm, bản vẽ thiết kế 2D/3D yêu cầu đặt hàng, ảnh gia công xưởng.<br>- Thư viện: `cloudinary` + `multer-storage-cloudinary`. |
| **Email Service** | Gmail SMTP (Nodemailer) | - Gửi email xác thực, cấp lại mật khẩu và thông báo.<br>- Thư viện: `nodemailer` qua Gmail App Password. |

---

## 2. BẢNG MAPPING NHÓM CHỨC NĂNG & CÔNG NGHỆ THỰC TẾ

| STT | Nhóm Chức Năng | Database thực tế (MySQL `db_2026_fssims`) | Message Queue / Cache | External API | Tài liệu chi tiết |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **2.1** | **Xác thực & Phân quyền (Authentication & Authorization)**<br>*(Đăng ký, Đăng nhập KH & NV, Refresh Token, Đổi mật khẩu)* | Dùng chung DB chính:<br>`user_role`, `user_account`, `refresh_token` | Không có | **Gmail SMTP**<br>*(Nodemailer - gửi OTP/Link reset mật khẩu)* | [2.1-authentication.md](file:///d:/DoA/FS-SIMS/docs/use-cases/2.1-authentication-and-authorization.md) |
| **2.2** | **Quản lý Hồ sơ & Tài khoản (User & Staff Profile Management)**<br>*(Thông tin cá nhân, cập nhật avatar, quản lý tài khoản nhân viên Sales/Leader/Owner)* | Dùng chung DB chính:<br>`user_account`, `user_role` | Không có | **Cloudinary API**<br>*(Upload ảnh đại diện Avatar)* | [2.2-user-and-staff.md](file:///d:/DoA/FS-SIMS/docs/use-cases/2.2-user-and-staff-management.md) |
| **2.3** | **Quản lý Sản phẩm & Danh mục (Product & Catalog Management)**<br>*(Danh mục, phòng trưng bày, chất liệu, màu sắc, sản phẩm đơn/bộ)* | Dùng chung DB chính:<br>`product`, `product_category`, `product_room`, `product_material`, `product_color`, `product_set_item` | Không có | **Cloudinary API**<br>*(Upload hình ảnh sản phẩm)* | [2.3-product-catalog.md](file:///d:/DoA/FS-SIMS/docs/use-cases/2.3-product-and-catalog-management.md) |
| **2.4** | **Giỏ hàng trực tuyến (Shopping Cart)**<br>*(Thêm/sửa/xóa sản phẩm trong giỏ, đồng bộ giỏ hàng cá nhân)* | Dùng chung DB chính:<br>`cart`, `cart_item` | Không có | Không có | [2.4-shopping-cart.md](file:///d:/DoA/FS-SIMS/docs/use-cases/2.4-shopping-cart.md) |
| **2.5** | **Yêu cầu Đặt hàng & Thiết kế (Order Requests - Custom & Ready)**<br>*(Gửi yêu cầu thiết kế riêng kèm ảnh mẫu hoặc yêu cầu từ giỏ hàng, Sale/Owner thẩm định & duyệt)* | Dùng chung DB chính:<br>`order_request`, `order_request_item`, `order_request_image` | Không có | **Cloudinary API**<br>*(Upload bản vẽ thiết kế / ảnh ý tưởng mẫu)* | [2.5-order-requests.md](file:///d:/DoA/FS-SIMS/docs/use-cases/2.5-order-requests-management.md) |
| **2.6** | **Quản lý Hợp đồng Bán hàng (Sales Contract Management)**<br>*(Lập hợp đồng trực tiếp tại cửa hàng hoặc từ yêu cầu online, ký kết hợp đồng)* | Dùng chung DB chính:<br>`contract`, `contract_item` | Không có | Không có | [2.6-sales-contracts.md](file:///d:/DoA/FS-SIMS/docs/use-cases/2.6-sales-contract-management.md) |
| **2.7** | **Quản lý Đơn hàng Bán (Customer Orders Management)**<br>*(Tạo đơn hàng từ hợp đồng đã ký, quản lý trạng thái đơn, tiến độ gia công & giao hàng)* | Dùng chung DB chính:<br>`customer_order`, `customer_order_item`, `customer_order_image` | Không có | **Cloudinary API**<br>*(Upload ảnh hiện trạng hoàn thiện/giao nhận)* | [2.7-customer-orders.md](file:///d:/DoA/FS-SIMS/docs/use-cases/2.7-customer-orders-management.md) |
| **2.8** | **Quản lý Nhà cung cấp (Supplier Management)**<br>*(Danh sách nhà cung cấp gỗ, vải, kim loại, vật tư phụ trợ)* | Dùng chung DB chính:<br>`supplier` | Không có | Không có | [2.8-suppliers.md](file:///d:/DoA/FS-SIMS/docs/use-cases/2.8-supplier-management.md) |
| **2.9** | **Quản lý Nguyên vật liệu & Tồn kho (Raw Materials Inventory)**<br>*(Danh mục nguyên vật liệu, đơn vị tính, số lượng tồn kho `quantity_on_hand`)* | Dùng chung DB chính:<br>`raw_material` | Không có | Không có | [2.9-raw-materials.md](file:///d:/DoA/FS-SIMS/docs/use-cases/2.9-raw-materials-inventory.md) |
| **2.10** | **Nhập kho Nguyên vật liệu / Mua hàng (Material Purchase & Receipt)**<br>*(Lập phiếu nhập kho NVL từ nhà cung cấp, cập nhật tăng tồn kho NVL)* | Dùng chung DB chính:<br>`material_receipt`, `material_receipt_item` | Không có | Không có | [2.10-purchase-receipts.md](file:///d:/DoA/FS-SIMS/docs/use-cases/2.10-purchase-receipts-management.md) |
| **2.11** | **Lệnh Sản xuất & Gia công (Production Orders Management)**<br>*(Tạo lệnh đóng đồ nội thất theo đơn custom hoặc lưu kho, phân công Leader/xưởng)* | Dùng chung DB chính:<br>`production_order`, `production_order_item`, `production_order_image` | Không có | **Cloudinary API**<br>*(Upload bản vẽ kỹ thuật thi công)* | [2.11-production-orders.md](file:///d:/DoA/FS-SIMS/docs/use-cases/2.11-production-orders-management.md) |
| **2.12** | **Xuất kho Nguyên vật liệu (Material Export / Issue)**<br>*(Xuất vật tư cho xưởng gia công theo lệnh sản xuất, giảm tồn kho NVL)* | Dùng chung DB chính:<br>`material_issue`, `material_issue_item` | Không có | Không có | [2.12-material-exports.md](file:///d:/DoA/FS-SIMS/docs/use-cases/2.12-material-exports-management.md) |
| **2.13** | **Nhập kho Thành phẩm (Finished Goods Receipt)**<br>*(Nghiệm thu thành phẩm từ xưởng sản xuất, nhập kho và tăng tồn kho sản phẩm `stock_quantity`)* | Dùng chung DB chính:<br>`finished_goods_receipt`, `finished_goods_receipt_item` | Không có | Không có | [2.13-finished-goods.md](file:///d:/DoA/FS-SIMS/docs/use-cases/2.13-finished-goods-inspection-receipt.md) |
| **2.14** | **Báo cáo Tài chính & Doanh thu (Financial Reports & Dashboard)**<br>*(Thống kê doanh thu bán hàng, chi phí nhập NVL, chi phí xuất sản xuất, xuất báo cáo)* | Dùng chung DB chính:<br>Truy vấn tổng hợp từ `customer_order`, `material_receipt`, `material_issue` | Không có | Không có | [2.14-financial-reports.md](file:///d:/DoA/FS-SIMS/docs/use-cases/2.14-financial-reports-dashboard.md) |

---

## 3. QUY TẮC CẦN TUÂN THỦ KHI VẼ SEQUENCE DIAGRAM CHO DỰ ÁN

Khi vẽ biểu đồ tuần tự (Sequence Diagram) cho bất kỳ ca sử dụng (Use Case) nào thuộc hệ thống FS-SIMS:

1. **Participants chuẩn xác**:
   - **Actor**: `Customer`, `Sales`, `LeaderStaff`, hoặc `Owner` (tùy theo use case).
   - **Frontend UI**: `Client (React/Vite)` hoặc Component/Page tương ứng (ví dụ: `CartPage`, `OrdersPage`, `ManageMaterialsPage`).
   - **API Controller / Router**: `Express Backend API` (ví dụ: `orderRequestController`, `materialExportController`).
   - **Service / Third-Party (nếu có)**: Chỉ thêm khi nhóm chức năng đó **thực sự có sử dụng**:
     - Thêm `Cloudinary Service` nếu có thao tác upload/lưu hình ảnh (2.2, 2.3, 2.5, 2.7, 2.11).
     - Thêm `Gmail / Mail Service` nếu có gửi email (2.1).
   - **Database**: `MySQL Database (db_2026_fssims)` tương tác thông qua Sequelize Models.
2. **Tuyệt đối KHÔNG vẽ**:
   - **Không vẽ** `Message Queue` (RabbitMQ, Kafka...) vì dự án **không sử dụng**.
   - **Không vẽ** `Cache` (Redis...) vì dự án **không sử dụng**.
   - **Không vẽ** `External Payment Gateway` (VNPay, Momo, Stripe...) vì nghiệp vụ thanh toán của dự án quản lý thông qua hợp đồng và hóa đơn bán hàng trực tiếp/chuyển khoản đối soát nội bộ.
3. **Luồng nghiệp vụ cốt lõi**:
   - **Online**: `Giỏ hàng` -> `Yêu cầu đặt hàng (Order Request)` -> `Sale duyệt` -> `Lập hợp đồng (Contract)` -> `Ký hợp đồng` -> `Đơn hàng (Customer Order)`.
   - **Offline**: Khách đến cửa hàng -> `Sale lập hợp đồng trực tiếp` -> `Ký hợp đồng` -> `Tạo đơn hàng`.
   - **Kho & Xưởng**: `Nhập NVL (Material Receipt)` -> `Lập lệnh sản xuất (Production Order)` -> `Xuất NVL (Material Issue)` -> `Xưởng gia công` -> `Nhập kho thành phẩm (Finished Goods Receipt)`.
