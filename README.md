# Project Base: Node.js/Express + React (Vite) + MySQL + Cloudinary + Gmail

Base project full-stack, chạy hoàn toàn bằng Docker.

## Tech stack
- **Backend**: Node.js + Express (MVC: routes/controllers/models/middlewares/services)
- **Frontend**: ReactJS + Vite
- **Database**: MySQL 8
- **Upload ảnh**: Cloudinary
- **Gửi mail**: Nodemailer qua Gmail (App Password)
- **Quản trị DB**: phpMyAdmin (tuỳ chọn, http://localhost:8080)

## Cấu trúc thư mục
```
project-root/
├── backend/          # Node.js + Express API
├── frontend/          # ReactJS + Vite
├── database/          # init.sql - script tạo DB/table ban đầu
├── docker-compose.yml            # cấu hình chính (dùng cho production)
├── docker-compose.override.yml   # tự động merge khi dev, bật hot-reload
└── .env.example
```

## Chuẩn bị trước khi chạy

### 1. Clone & tạo file .env
```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Cấu hình backend/.env
- `DB_HOST=mysql` (tên service trong docker-compose, KHÔNG đổi thành localhost)
- `MAIL_USER` / `MAIL_PASS`: dùng **Gmail App Password**, tạo tại https://myaccount.google.com/apppasswords
  (yêu cầu bật xác thực 2 bước cho tài khoản Gmail trước)
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`: lấy tại https://cloudinary.com/console

### 3. Cấu hình frontend/.env
- Dev: `VITE_API_BASE_URL=http://localhost:5000/api`
- Production (nếu deploy domain thật): đổi thành domain backend thật

## Chạy project

Nếu database đã được khởi tạo trước khi thêm trường yêu thích sản phẩm và cột chưa tồn tại, chạy migration một lần trên MySQL:
```sql
ALTER TABLE product
    ADD COLUMN is_favorite TINYINT(1) NOT NULL DEFAULT 0;
```

### Chế độ Development (hot-reload)
```bash
docker-compose up --build
```
`docker-compose.override.yml` sẽ tự động được áp dụng, bật:
- Backend: nodemon hot-reload tại `http://localhost:5000`
- Frontend: Vite dev server tại `http://localhost:5173`

### Chế độ Production
```bash
docker-compose -f docker-compose.yml up --build -d
```
- Frontend build tĩnh, serve bằng Nginx tại `http://localhost`
- Backend chạy production tại `http://localhost:5000`

## Truy cập
| Service     | URL                          |
|-------------|------------------------------|
| Frontend (dev)  | http://localhost:5173    |
| Frontend (prod) | http://localhost         |
| Backend API     | http://localhost:5000/api |
| phpMyAdmin      | http://localhost:8080     |
| MySQL           | localhost:3306             |

## API mẫu
`POST /api/users` (multipart/form-data)
- `name`: string
- `email`: string
- `avatar`: file (optional)

Luồng xử lý: upload ảnh lên Cloudinary → lưu user + avatar URL vào MySQL → gửi mail chào mừng qua Gmail.

## Unit test

### Backend (Jest + Supertest)
Test được mock hoàn toàn (DB, mail, upload) nên **không cần MySQL/Cloudinary/Gmail thật** để chạy test.

```bash
cd backend
npm install --legacy-peer-deps
npm test
```
Hoặc chạy trong container đang sống:
```bash
docker exec -it app_backend npm test
```
File test nằm ở `backend/tests/`:
- `validators.test.js` — unit test hàm validate email
- `health.test.js` — test route `/api/health`
- `user.routes.test.js` — test route `/api/users` (mock model + mail + upload)

### Frontend (Vitest + React Testing Library)
```bash
cd frontend
npm install --legacy-peer-deps
npm test
```
Hoặc trong container:
```bash
docker exec -it app_frontend npm test
```
File test nằm ở `frontend/src/tests/CreateUserPage.test.jsx` — test render form và luồng submit thành công/thất bại (mock API, không gọi backend thật).

> Lưu ý: image production hiện tại không cài devDependencies, nên chạy test nên thực hiện ở máy local hoặc container dev (`target: development`), hoặc thêm bước test riêng vào CI/CD.

## Dừng & xoá container
```bash
docker-compose down          # dừng, giữ lại data MySQL (volume)
docker-compose down -v       # dừng và xoá luôn data MySQL
```
# Chỉ restart container backend (không rebuild toàn bộ)
docker-compose restart backend
# Chỉ restart container fronend(không rebuild toàn bộ)
docker-compose restart frontend

# Hoặc nếu đổi package.json mới chạy full build
docker-compose up --build
