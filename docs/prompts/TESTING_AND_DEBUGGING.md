# Debug & Testing Guide

Áp dụng cho mọi AI/người khi fix bug hoặc viết test trong repo này.

## Nguyên tắc chung khi debug
1. **Xác định lớp lỗi trước khi sửa**: Frontend (UI/React) → gọi API (network/CORS) → Backend (controller/route) → Model (Sequelize/SQL) → Service bên thứ 3 (Cloudinary/Gmail) → Docker/env (biến môi trường, healthcheck).
2. Luôn xem log đúng container: `docker logs app_backend`, `docker logs app_frontend`, `docker logs app_mysql`.
3. Không sửa nhiều lớp cùng lúc — cô lập lỗi ở 1 lớp, xác nhận bằng log/test rồi mới sửa lớp tiếp theo.

## Các lỗi thường gặp & cách nhận diện nhanh

| Triệu chứng | Nguyên nhân thường gặp | Cách kiểm tra |
|---|---|---|
| `ECONNREFUSED` tới MySQL lúc backend vừa start | MySQL container đang restart sau khi chạy `init.sql` lần đầu (bình thường, không phải lỗi thật) | Xem `db.js` đã có retry logic; nếu vẫn lỗi sau khi retry hết → kiểm tra `DB_HOST` có đúng là tên service `mysql` không (không phải `localhost`) |
| Upload ảnh lỗi 401/Invalid Signature | Sai `CLOUDINARY_API_KEY`/`SECRET` hoặc chưa set trong `backend/.env` | `docker exec -it app_backend printenv | grep CLOUDINARY` |
| Gửi mail không nhận được / lỗi auth | Dùng mật khẩu Gmail thường thay vì App Password, hoặc chưa bật 2FA cho tài khoản Gmail | Kiểm tra `MAIL_USER`/`MAIL_PASS` trong `backend/.env`, tạo lại App Password |
| Frontend gọi API bị CORS / Network Error | `VITE_API_BASE_URL` sai, hoặc backend chưa chạy | Kiểm tra `frontend/.env`, `docker ps` xem `app_backend` có Up không |
| `Cannot find module 'sequelize'` (hoặc package mới) dù đã thêm vào package.json | Volume ẩn `/app/node_modules` trong override còn giữ bản cũ | `docker-compose down` rồi `docker-compose up --build -V` (không dùng `down -v` vì mất data MySQL) |
| `SequelizeConnectionRefusedError` / `ECONNREFUSED` lúc backend vừa start | MySQL đang restart sau `init.sql` lần đầu | Kiểm tra `testSequelizeConnection()` có retry; nếu vẫn lỗi kiểm tra `DB_HOST=mysql` |
| `Unknown column 'xxx'` / `Table doesn't exist` | Model map sai tên cột/bảng so với `init.sql` | Đối chiếu `field:`/`underscored`/`tableName` với `database/init.sql`; không dùng `sync()` để "chữa cháy" |
| `npm install` lỗi ERESOLVE trong Docker build | Xung đột peer dependency (vd cloudinary v2 vs multer-storage-cloudinary v4) | Dùng `--legacy-peer-deps`, đã áp dụng sẵn trong `backend/Dockerfile` |

## Nguyên tắc viết test (bắt buộc theo pattern có sẵn)

### Backend — Jest + Supertest (`backend/tests/`)
- **KHÔNG** để test gọi MySQL/Cloudinary/Gmail thật. Luôn `jest.mock(...)` các module sau khi cần:
  - `../src/models/xxxModel` (mock các hàm export như `findUserByEmail`, `createUser`; test route/controller KHÔNG được chạm Sequelize hay DB thật)
  - `../src/services/mailService` (mock `sendWelcomeEmail`, `sendMail`)
  - `../src/middlewares/uploadMiddleware` (mock thành middleware `(req,res,next)=>next()` để không gọi Cloudinary thật)
- Test 3 tầng cho mỗi controller mới:
  1. Unit test cho hàm thuần liên quan (nếu có) trong `utils/` — xem `validators.test.js` làm mẫu.
  2. Test route qua `supertest` cho từng nhánh: input thiếu/sai (400), input hợp lệ nhưng conflict (409 nếu có), input hợp lệ thành công (201/200) — xem `user.routes.test.js` làm mẫu.
  3. Test riêng cho model (nếu cần): `jest.mock('../src/config/sequelize')` để giả lập instance Sequelize, kiểm tra model gọi đúng hàm (`findOne`, `create`, `findAll`) với đúng tham số. Không kết nối MySQL thật.
  4. Không cần test lại `config/` (kết nối thật) — đã loại trừ trong `jest.config.js` (`collectCoverageFrom` bỏ qua `src/config/**`).
- Chạy: `cd backend && npm test` (hoặc `docker exec -it app_backend npm test`).

### Frontend — Vitest + React Testing Library (`frontend/src/tests/`)
- Mock `services/api.js` bằng `vi.mock('../services/api', ...)` — không gọi backend thật trong test.
- Test tối thiểu cho mỗi page/component có form hoặc gọi API:
  1. Render đúng — các field/label/button hiển thị.
  2. Luồng thành công — mock API resolve, kiểm tra thông báo/kết quả hiển thị đúng.
  3. Luồng lỗi — mock API reject, kiểm tra thông báo lỗi hiển thị đúng.
- Xem `CreateUserPage.test.jsx` làm mẫu khi thêm test cho page/component mới.
- Chạy: `cd frontend && npm test` (hoặc `docker exec -it app_frontend npm test`).

## Khi thêm 1 tính năng mới — checklist test
- [ ] Có unit test cho logic thuần (validate, tính toán...) nếu có, đặt ở `utils/` + test tương ứng.
- [ ] Có test route cho ít nhất: case lỗi input, case thành công (theo mẫu `user.routes.test.js`).
- [ ] Nếu có UI mới liên quan, có test render + luồng thành công/lỗi (theo mẫu `CreateUserPage.test.jsx`).
- [ ] `npm test` pass ở cả `backend/` và `frontend/` trước khi coi là xong.
