# Quy ước base của project

Áp dụng cho tất cả người/AI viết code trong repo này. Base: **Node.js/Express + Sequelize (ORM) + ReactJS/Vite + MySQL + Cloudinary + Gmail (Nodemailer)**, chạy 100% bằng Docker.

## 1. Cấu trúc thư mục backend (bắt buộc theo MVC)

```
backend/src/
├── config/        # kết nối hạ tầng ngoài (sequelize.js, cloudinary.js) — KHÔNG chứa logic nghiệp vụ
├── controllers/   # nhận req/res, gọi model + service, KHÔNG viết query/SQL trực tiếp ở đây
├── models/        # Sequelize model + các hàm truy vấn (createX, findXByY...) nằm ở đây, KHÔNG viết query ở controller
├── routes/        # chỉ khai báo route + middleware, KHÔNG chứa logic
├── middlewares/   # upload, auth, validate, traceId.js, errorHandler.js...
├── services/      # gọi bên thứ 3 (mailService.js, cloudinaryService.js)
├── utils/         # hàm thuần (validators.js, problemDetails.js, successResponse.js, ApiError.js...), PHẢI test được độc lập, không phụ thuộc DB/network
└── app.js         # khởi tạo express app, KHÔNG gọi app.listen() ở đây (tách khỏi server.js để dễ test)
```

Quy tắc cứng:
- Resource mới (vd "product") luôn tạo đủ bộ: `models/productModel.js`, `controllers/productController.js`, `routes/productRoutes.js`, gắn vào `app.js` theo pattern `app.use('/api/products', productRoutes)`.
- Không viết SQL/query Sequelize trong controller (controller chỉ gọi hàm export của model). Không gọi `cloudinary`/`nodemailer` trực tiếp trong controller — luôn qua `services/`.
- Logic thuần (validate, format, tính toán) tách ra `utils/` để dễ unit test.
- Controller KHÔNG tự trả response lỗi (`res.status(4xx).json(...)`). Khi lỗi, `throw new ApiError(status, detail)` rồi `next(err)`; việc format response lỗi do `middlewares/errorHandler.js` đảm nhiệm (xem mục 5).

## 2. Cấu trúc thư mục frontend

```
frontend/src/
├── components/    # UI tái sử dụng, không tự gọi API trực tiếp
├── pages/         # 1 page = 1 màn hình, được phép gọi services/api.js
├── services/      # api.js (axios instance), mọi lời gọi HTTP tập trung ở đây
├── hooks/         # custom hooks dùng chung
├── context/       # React Context (auth, theme...)
├── app/           # Router (ownerrouter...)
```

Quy tắc cứng:
- Không gọi `axios`/`fetch` trực tiếp trong component/page — luôn qua `src/services/api.js` (đã cấu hình `VITE_API_BASE_URL`).
- Khi gọi API thành công, đọc dữ liệu từ `response.data.data` (và `response.data.meta` nếu có phân trang); thông báo từ `response.data.message` (xem mục 5.1).
- Khi xử lý lỗi từ API, đọc `error.response.data.detail` để hiển thị cho người dùng và `traceId` để báo lỗi/debug (xem mục 5.2).

## 2b. Database & Sequelize (ORM)
- Dùng `sequelize@^6` + `mysql2` (dialect `mysql`). Instance duy nhất nằm ở `backend/src/config/sequelize.js`, mọi model import instance này, không tự tạo kết nối mới.
- **Schema do `database/init.sql` quản lý.** KHÔNG dùng `sequelize.sync()` (đặc biệt `force`/`alter`) vì có thể xoá hoặc đổi bảng ngoài ý muốn. Thêm/sửa bảng → sửa `init.sql` và ghi rõ cách áp dụng (xoá volume hoặc chạy migration thủ công).
- Model map đúng tên bảng/cột thực tế: bảng số nhiều snake_case, dùng `underscored: true` hoặc `field:` (vd `avatarUrl` -> `avatar_url`).
- Model phải export các hàm nghiệp vụ có tên rõ ràng (`createUser`, `findUserByEmail`, `getAllUsers`...) để controller và test không phụ thuộc chi tiết Sequelize.
- Không import `mysql2` trực tiếp trong code; chỉ cần package được cài, Sequelize tự dùng.
- Kết nối lúc khởi động dùng `testSequelizeConnection()` có retry (MySQL container có thể restart sau khi chạy `init.sql`).

## 3. Naming convention
- File JS: `camelCase.js` (vd `userController.js`); class dùng làm module (vd `ApiError.js`) đặt `PascalCase.js`; React component: `PascalCase.jsx` (vd `CreateUserPage.jsx`).
- Route path: số nhiều, lowercase (`/api/users`, không phải `/api/User`).
- Bảng MySQL: số nhiều, snake_case (`users`, `order_items`). Sequelize model: số ít, PascalCase (`User`, `OrderItem`), file `xxxModel.js`.
- Biến môi trường: `UPPER_SNAKE_CASE`, luôn khai báo trong `.env.example` tương ứng khi thêm mới.

## 4. Environment variables & secrets
- KHÔNG BAO GIỜ commit file `.env` thật (đã có trong `.gitignore`). Chỉ commit `.env.example`.
- Thêm biến môi trường mới → thêm ngay dòng tương ứng vào `.env.example`, kèm comment ngắn.
- Backend đọc qua `process.env.TEN_BIEN` (dùng `dotenv`); frontend đọc qua `import.meta.env.VITE_TEN_BIEN` (bắt buộc tiền tố `VITE_`).
- Biến dùng cho response lỗi: `ERROR_TYPE_BASE_URL` (base URL của field `type`, vd `https://api.example.com`).

## 5. Response format API (backend)

### 5.1 Thành công — cùng "họ" với response lỗi
Mọi response thành công trả `Content-Type: application/json` với đúng các field sau:

```json
{
  "status": 201,
  "message": "Tạo user thành công",
  "data": { "id": 1, "email": "a@example.com" },
  "instance": "/api/users",
  "traceId": "3f1c9e0a-7b52-4c1e-9d2a-5a8f0c1b2e44",
  "timestamp": "2026-11-12T16:00:00.000Z"
}
```

| Field | Kiểu | Ý nghĩa |
|---|---|---|
| `status` | number | HTTP status code (200, 201...) |
| `message` | string | Mô tả ngắn kết quả |
| `data` | object \| array \| null | Dữ liệu trả về. LUÔN dùng key `data` cho mọi resource (không dùng `user`, `users`, `product`... nữa). Không có dữ liệu thì `null` |
| `instance` | string | Đường dẫn request (`req.originalUrl`) |
| `traceId` | string | Cùng giá trị với response lỗi (header `x-trace-id`) |
| `timestamp` | string | ISO 8601 UTC |

Danh sách có phân trang thêm field `meta` (cùng cấp với `data`):
```json
{
  "status": 200,
  "message": "Lấy danh sách user thành công",
  "data": [ ... ],
  "meta": { "page": 1, "limit": 20, "total": 135, "totalPages": 7 },
  "instance": "/api/users?page=1&limit=20",
  "traceId": "...",
  "timestamp": "..."
}
```

Quy tắc:
- Chỉ build body thành công bằng `utils/successResponse.js` (`buildSuccessResponse`) và gửi qua `res.success(...)`/helper trong `middlewares/traceId.js`; controller không tự viết tay JSON thành công.
- Ví dụ trong controller: `res.status(201).json(buildSuccessResponse({ status: 201, message: 'Tạo user thành công', data: user, req }))`.
- Response 204 (xoá không trả nội dung) không có body, không áp dụng format này.

### 5.2 Lỗi — theo chuẩn RFC 7807 (Problem Details)
Mọi response lỗi trả `Content-Type: application/problem+json` với đúng 7 field sau:

```json
{
  "type": "https://api.example.com/errors/conflict",
  "title": "Conflict",
  "status": 409,
  "detail": "Email đã tồn tại",
  "instance": "/api/users",
  "traceId": "3f1c9e0a-7b52-4c1e-9d2a-5a8f0c1b2e44",
  "timestamp": "2026-11-12T15:46:00.000Z"
}
```

| Field | Kiểu | Ý nghĩa |
|---|---|---|
| `type` | string | URI định danh loại lỗi = `ERROR_TYPE_BASE_URL` + `/errors/<slug>` (vd `/errors/validation-error`) |
| `title` | string | Tên ngắn, cố định theo loại lỗi (không đổi giữa các request) |
| `status` | number | HTTP status code |
| `detail` | string | Mô tả cụ thể lần lỗi này. Với lỗi 500 KHÔNG lộ chi tiết nội bộ (stack, SQL...) |
| `instance` | string | Đường dẫn request gây lỗi (`req.originalUrl`) |
| `traceId` | string | Lấy từ header `x-trace-id` nếu client gửi, không thì sinh UUID; luôn trả lại ở response header `x-trace-id` và log kèm khi lỗi 500 |
| `timestamp` | string | Thời điểm lỗi, ISO 8601 UTC |

Quy tắc:
- Chỉ build body lỗi bằng `utils/problemDetails.js` (`buildProblemDetails`) — không tự viết tay JSON lỗi ở nơi khác.
- Throw lỗi nghiệp vụ bằng `utils/ApiError.js`: `throw new ApiError(409, 'Email đã tồn tại')`, rồi `next(err)`.
- `middlewares/traceId.js` phải đăng ký TRƯỚC mọi route; `notFoundHandler` và `errorHandler` đăng ký SAU mọi route, `errorHandler` là middleware cuối cùng trong `app.js`.
- Route không tồn tại trả 404 cùng format.

Status code: 200 (GET ok), 201 (tạo mới), 400 (input sai/thiếu), 401 (chưa xác thực), 403 (không có quyền), 404 (không tìm thấy), 409 (conflict, vd email trùng), 500 (lỗi server).

| Status | slug (`type`) | `title` |
|---|---|---|
| 400 | `bad-request` | Bad Request |
| 401 | `unauthorized` | Unauthorized |
| 403 | `forbidden` | Forbidden |
| 404 | `not-found` | Not Found |
| 409 | `conflict` | Conflict |
| 500 | `internal-server-error` | Internal Server Error |

## 6. Docker & môi trường
- `docker-compose.yml` = cấu hình **production** (build target: production).
- `docker-compose.override.yml` = tự động merge khi chạy `docker-compose up`, chuyển sang **development** (hot-reload, mount volume, nodemon/vite dev server). Không xoá file này trừ khi cố tình build production.
- Service mới có dependency (vd DB) → phải có `healthcheck` + `depends_on: condition: service_healthy` theo mẫu service `mysql`.
- Không hardcode host/port — luôn qua biến môi trường (`DB_HOST=mysql` là tên service Docker, không phải `localhost`).

## 7. Thêm dependency mới
- Backend: thêm vào `backend/package.json` (sửa file, không chạy npm trên máy host). Đã có sẵn `express`, `mysql2`, `sequelize` — không cài trùng, không đổi major version. Nếu có xung đột peer dependency, xử lý bằng `--legacy-peer-deps` trong Dockerfile kèm comment lý do (đã áp dụng cho `cloudinary` v2 + `multer-storage-cloudinary` v4).
- **Sau khi đổi `package.json`**, phải chạy: `docker-compose down` rồi `docker-compose up --build -V` (`-V` renew volume ẩn `/app/node_modules`, thiếu cờ này container vẫn dùng node_modules cũ và báo `Cannot find module`). KHÔNG dùng `down -v` vì sẽ xoá data MySQL.
- Frontend: thêm vào `frontend/package.json`, ưu tiên lib đã có sẵn (`axios`, `vitest`, `@testing-library/*`) trước khi thêm lib mới.
- Format lỗi RFC 7807 dùng module có sẵn của Node (`crypto.randomUUID`), không cần thêm thư viện.

## 8. Checklist trước khi coi 1 thay đổi là "xong"
1. Đúng thư mục/naming theo mục 1–3.
2. Env var mới (nếu có) đã vào `.env.example`.
3. Không có `sequelize.sync()`; schema thay đổi (nếu có) đã cập nhật `database/init.sql`.
4. Có unit test cho logic quan trọng (xem `docs/TESTING_AND_DEBUGGING.md`), gồm test `utils/problemDetails.js` và `utils/successResponse.js` khi đụng tới format response.
5. Mọi response thành công đúng format mục 5.1 (đủ field, dữ liệu luôn nằm trong `data`) và mọi response lỗi đúng format mục 5.2 (đủ 7 field, đúng `title`/`type` theo status, controller dùng `ApiError` + `next(err)`).
6. `docker-compose up --build` chạy được, không lỗi.