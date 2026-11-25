---
name: design-system
description: Khoá ngôn ngữ thiết kế của dự án (token, component, copy) để mọi màn hình mới hoặc sửa đổi đều đồng bộ và không mang dấu hiệu "AI generated". Dùng cùng frontend-design, sau khi đã có token.
---

# Design System của dự án

Skill này bổ sung cho `docs/skills/frontend-design/SKILL.md`.

- `frontend-design`: chọn hướng thẩm mỹ **một lần** cho cả sản phẩm.
- `design-system` (file này): giữ hướng đó **nhất quán** ở mọi màn hình.

Thứ tự ưu tiên khi mâu thuẫn: **yêu cầu của người dùng > design-system > frontend-design**.

## Nguyên tắc cốt lõi

1. **Sự khác biệt nằm ở cấp sản phẩm, không ở cấp màn hình.** Không tự chọn palette, font, bo góc mới cho từng page. Đã có token thì dùng token.
2. **Nhìn các màn hiện có trước khi vẽ màn mới.** Mở ít nhất 2 page/component gần nhất với thứ sắp làm, và bắt chước cấu trúc, khoảng cách, cách đặt tên của chúng.
3. **Tái sử dụng trước, tạo mới sau.** Trước khi viết component, tìm trong `frontend/src/components/` (và `components/ui/` nếu có). Chỉ tạo mới khi không có cái nào gần đúng, và tạo ở đúng thư mục chung chứ không viết riêng trong page.
4. **Không hardcode giá trị thiết kế.** Cấm hex, px lạ, font-family, shadow, radius viết thẳng trong component. Chỉ dùng biến CSS từ `frontend/src/styles/tokens.css`.
5. **Thiếu token thì thêm vào token, không viết tắt trong component.** Báo rõ trong câu trả lời là đã thêm token nào và vì sao.

## Token (nguồn duy nhất: `frontend/src/styles/tokens.css`)

> TODO: điền giá trị thật cho dự án rồi xoá dòng này. Các giá trị dưới đây chỉ là khung.

| Nhóm | Token | Quy tắc |
|---|---|---|
| Màu nền | `--color-bg`, `--color-surface` | Tối đa 2 mức nền |
| Màu chữ | `--color-text`, `--color-text-muted` | Tương phản ≥ 4.5:1 |
| Màu nhấn | `--color-accent` | Một màu nhấn duy nhất, dùng cho hành động chính |
| Trạng thái | `--color-success`, `--color-warning`, `--color-danger` | Chỉ dùng cho trạng thái, không dùng để trang trí |
| Font | `--font-body`, `--font-display` | Tối đa 2 family; phải hỗ trợ tiếng Việt đầy đủ dấu |
| Cỡ chữ | `--text-sm/base/lg/xl/2xl` | Thang cố định, không tự đặt cỡ lẻ |
| Khoảng cách | `--space-1..8` | Bội số của 4px |
| Bo góc | `--radius-sm/md/lg` | Gán theo vai trò: input/nút = sm, thẻ = md, modal = lg |
| Đổ bóng | `--shadow-1/2` | Chỉ cho phần tử nổi (dropdown, modal) |
| Chuyển động | `--duration-fast/base`, `--ease` | Phải tắt khi `prefers-reduced-motion` |

## Bố cục và component

- Mọi page dùng chung một khung layout (header, vùng nội dung, độ rộng tối đa, padding). Không tự dựng khung riêng.
- Mỗi loại thành phần chỉ có **một** kiểu: nút chính / nút phụ / nút nguy hiểm, input, bảng, modal, toast, empty state, loading.
- Nút chính: tối đa 1 nút trên mỗi vùng nhìn.
- Form, bảng, danh sách ở các màn khác nhau phải cùng cấu trúc: cùng vị trí label, cùng cách hiện lỗi, cùng vị trí hành động.
- Mọi danh sách/bảng/form đều phải có đủ 4 trạng thái: loading, empty, error, có dữ liệu.

## Checklist chống "dấu hiệu AI"

Rà lại trước khi báo xong. Thấy dấu hiệu nào mà brief hoặc token không yêu cầu thì sửa:

- [ ] Nền kem + serif + màu đất nung; hoặc nền đen + một màu nhấn neon
- [ ] Mọi thứ bị chia thành các card giống hệt nhau, cùng radius, cùng bóng mờ
- [ ] Gradient làm nền hoặc nhấn nhá mà không có lý do
- [ ] Emoji hoặc icon trang trí đặt trước mỗi tiêu đề
- [ ] Nhãn IN HOA giãn chữ phía trên mỗi heading
- [ ] Số thứ tự 01/02/03 cho nội dung không phải một chuỗi bước
- [ ] Chỉ tô màu/in nghiêng đúng một từ trong tiêu đề
- [ ] Hero "số lớn + nhãn nhỏ + chỉ số phụ" không liên quan nội dung thật
- [ ] Hiệu ứng fade-up cho từng section, hover nảy cho mọi card
- [ ] Mũi tên `→` gắn vào cuối mọi link/nút
- [ ] Ghép chuỗi bằng dấu chấm giữa (A · B · C) hoặc nhãn kiểu "TỪ — mô tả"
- [ ] Số liệu, tên, review bịa nhìn như thật nhưng không có nguồn từ dữ liệu của app

## Văn bản trên giao diện (tiếng Việt)

- Giọng đơn giản, trực tiếp, viết câu thường (không Viết Hoa Mọi Chữ).
- Nút nói đúng việc sẽ xảy ra: "Lưu thay đổi", không phải "Gửi".
- Một hành động giữ **một tên** xuyên suốt: nút "Xuất bản" thì toast là "Đã xuất bản".
- Lỗi nêu rõ chuyện gì sai và cách sửa, không xin lỗi chung chung.
- Trạng thái trống nói người dùng nên làm gì tiếp theo.
- Dùng đúng thuật ngữ đã có trong app; kiểm tra các màn khác trước khi đặt tên mới.

## Quy trình khi làm hoặc sửa giao diện

1. Đọc skill này và `frontend-design/SKILL.md`; đọc `tokens.css`.
2. Xem 2 màn/component gần nhất đang có.
3. Liệt kê component sẽ **tái sử dụng** và component **mới** (nếu có, nói lý do).
4. Code, chỉ dùng token.
5. Chạy checklist chống "dấu hiệu AI" ở trên, kiểm tra responsive, focus bàn phím, `prefers-reduced-motion`.
6. Ghi dòng xác nhận: `Đã đọc docs/skills/design-system/SKILL.md`.

## Khi nào được phá quy tắc

Chỉ khi người dùng yêu cầu rõ. Khi đó nói rõ chỗ nào lệch khỏi design system. Nếu thay đổi nên áp dụng toàn app thì cập nhật `tokens.css` và file này, đừng để một màn đi lệch riêng.