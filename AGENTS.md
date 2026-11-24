# AGENTS.md

Hướng dẫn dành cho **bất kỳ AI coding assistant nào** (Claude, ChatGPT/Codex, GitHub Copilot, Cursor, Gemini, Aider...) khi đọc, sửa, hoặc sinh code trong repo này. Nếu công cụ của bạn hỗ trợ tự động đọc `AGENTS.md`, nó sẽ được nạp ngay khi mở project. Nếu không, hãy dán nội dung các file dưới đây vào phần system/context prompt trước khi yêu cầu AI code.

## Tech stack
Node.js/Express + Sequelize ORM (backend) + ReactJS/Vite (frontend) + MySQL + Cloudinary (lưu ảnh) + Gmail/Nodemailer (gửi mail), toàn bộ chạy bằng Docker (`docker-compose up --build`).

## Việc BẮT BUỘC phải đọc trước khi sửa code
1. **[docs/CONVENTIONS.md](docs/prompts/CONVENTIONS.md)** — cấu trúc thư mục, naming, cách xử lý env/secret, format response API, quy tắc Docker. Đọc trước khi tạo/sửa BẤT KỲ route, controller, model, service, middleware, component hay file cấu hình nào.
2. **[docs/TESTING_AND_DEBUGGING.md](docs/prompts/TESTING_AND_DEBUGGING.md)** — cách debug lỗi và viết unit test đúng pattern của project (mock DB/Cloudinary/Gmail, không gọi network thật trong test). Đọc trước khi fix bug hoặc thêm test.
3. **[docs/skills/frontend-design/SKILL.md](docs/skills/frontend-design/SKILL.md)** — skill thiết kế giao diện (nguồn: [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design)). **BẮT BUỘC đọc trước khi tạo/sửa BẤT KỲ giao diện nào** (xem mục "Rule thiết kế giao diện" bên dưới).
4. **[docs/skills/design-system/SKILL.md](docs/skills/design-system/SKILL.md)** — khoá token, component và copy để giao diện đồng bộ giữa các màn hình. **BẮT BUỘC đọc cùng frontend-design** trước khi tạo/sửa BẤT KỲ giao diện nào.

## Rule thiết kế giao diện (BẮT BUỘC)
Áp dụng khi tạo mới, sửa, refactor hoặc review bất kỳ thứ gì thuộc giao diện: page, component, layout, form, dashboard, CSS, màu sắc, font, animation, hoặc chữ hiển thị trên UI (thường nằm trong `frontend/src/`).

Quy trình:
1. **Đọc toàn bộ** `docs/skills/frontend-design/SKILL.md` và `docs/skills/design-system/SKILL.md`, rồi đọc `frontend/src/styles/tokens.css`. Mở thêm 2 màn/component gần nhất đang có (phiên làm việc mới thì đọc lại).
2. **Lập kế hoạch thiết kế ngắn** trước khi code: bảng màu (4-6 mã hex có tên), typeface và vai trò, ý tưởng bố cục (kèm ASCII wireframe), nguyên tắc riêng của màn hình. Nếu dự án đã có token thì kế hoạch phải dùng token đó, không tự đề xuất palette/font mới.
3. **Tự review kế hoạch**: phần nào giống mặc định chung chung thì sửa lại và nêu lý do.
4. **Chỉ sau đó mới viết code.**
5. **Tự critique khi xong**: chạy checklist chống "dấu hiệu AI" trong design-system, kiểm tra responsive xuống mobile, focus bàn phím rõ, tôn trọng `prefers-reduced-motion`, tương phản đạt chuẩn.
6. Ghi một dòng xác nhận trong câu trả lời hoặc mô tả PR: `Đã đọc docs/skills/frontend-design/SKILL.md và docs/skills/design-system/SKILL.md`. Thiếu dòng này, thay đổi giao diện coi như chưa đạt.

Nếu yêu cầu của người dùng trái với skill, **yêu cầu của người dùng luôn thắng**.
Khi giao việc thiết kế giao diện, dùng prompt mẫu `docs/prompts/ui-design-prompt.md`.

## Quy tắc tối thiểu (tóm tắt nhanh)
- Backend theo MVC: `routes/ -> controllers/ -> models/` (models = Sequelize model, instance dùng chung ở `config/sequelize.js`; controller không viết query); logic bên thứ 3 (mail, ảnh) nằm ở `services/`; hàm thuần dễ test nằm ở `utils/`.
- Frontend: mọi lời gọi API tập trung ở `frontend/src/services/api.js`, không gọi `axios`/`fetch` trực tiếp trong component.
- Giao diện: bắt buộc đọc `docs/skills/frontend-design/SKILL.md` và `docs/skills/design-system/SKILL.md` trước khi làm UI (xem mục "Rule thiết kế giao diện").
- Giao diện: không hardcode màu/font/spacing/radius trong component, chỉ dùng biến từ `frontend/src/styles/tokens.css`; tái sử dụng component có sẵn trước khi tạo mới.
- Schema do `database/init.sql` quản lý: KHÔNG dùng `sequelize.sync()`.
- Đổi `package.json` (thêm/xoá package) → chạy `docker-compose down` rồi `docker-compose up --build -V` (thiếu `-V` sẽ lỗi `Cannot find module`); không dùng `down -v` vì mất data MySQL.
- Không commit `.env` thật, chỉ commit `.env.example`; thêm biến môi trường mới phải cập nhật `.env.example` tương ứng.
- Mọi API trả JSON dạng `{ message, ...data }` và dùng đúng HTTP status (200/201/400/404/409/500).
- `docker-compose.yml` = production, `docker-compose.override.yml` = development (tự merge khi `docker-compose up`) — không xoá file override.
- Thêm logic quan trọng (validate, tính toán, luồng nghiệp vụ) → phải có unit test đi kèm, đặt ở `backend/tests/` hoặc `frontend/src/tests/`, theo pattern mock đã có sẵn trong các file test mẫu.

## Trước khi coi 1 thay đổi là "xong"
- [ ] Đúng cấu trúc thư mục & naming theo `docs/CONVENTIONS.md`
- [ ] Env var mới (nếu có) đã vào đúng `.env.example`
- [ ] Không có `sequelize.sync()`; thay đổi schema (nếu có) đã cập nhật `database/init.sql`
- [ ] Có test tương ứng, chạy `npm test` ở `backend/` và/hoặc `frontend/` pass hết
- [ ] `docker-compose up --build` chạy được, không lỗi
- [ ] Nếu có thay đổi giao diện: đã đọc cả hai skill (`frontend-design` và `design-system`), có kế hoạch thiết kế, đã ghi dòng xác nhận, đã kiểm tra responsive + focus bàn phím + `prefers-reduced-motion`
- [ ] Nếu có thay đổi giao diện: không hardcode giá trị thiết kế, đã chạy checklist chống "dấu hiệu AI"