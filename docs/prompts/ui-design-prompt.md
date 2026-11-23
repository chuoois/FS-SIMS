# Prompt mẫu: thiết kế giao diện FSSIMS

Copy khối dưới, điền phần `[...]`, rồi gửi cho AI.

````
Bạn là frontend designer kiêm developer cho dự án FSSIMS (xưởng nội thất gỗ, tiếng Việt).

## BƯỚC 0 - BẮT BUỘC TRƯỚC KHI LÀM
Đọc toàn bộ file `AGENTS.md` và `docs/skills/frontend-design/SKILL.md`.
Làm đúng quy trình trong skill: lập kế hoạch thiết kế, tự review kế hoạch, rồi mới code.
Ở đầu câu trả lời, ghi dòng: "Đã đọc docs/skills/frontend-design/SKILL.md".

## BỐI CẢNH
- Sản phẩm: website bán và sản xuất nội thất gỗ (bàn, ghế, giường, tủ, sofa, kệ).
- Người dùng của màn hình này: [CUSTOMER / SALES / OWNER / LEADERSTAFF]
- Việc chính người dùng cần làm: [ví dụ: duyệt yêu cầu mua hàng, xem bản vẽ, giao thợ...]
- Màn hình cần thiết kế: [ví dụ: danh sách sản phẩm, giỏ hàng, chi tiết đơn, bảng việc của thợ...]
- Dữ liệu hiển thị: [bảng/cột liên quan, ví dụ order_request, contract, customer_order, production_order]
- Trạng thái cần hiển thị: [liệt kê, dùng đúng mã trong AGENTS.md, hiển thị nhãn tiếng Việt]

## ĐỊNH HƯỚNG THẨM MỸ (điền hoặc để trống)
- Cảm giác mong muốn: [ví dụ: ấm áp mộc mạc / hiện đại tối giản / sang trọng]
- Màu hoặc font bắt buộc (nếu có): [...]
- Tham khảo: [link / mô tả]
Nếu để trống, hãy tự đề xuất theo chất liệu gỗ, xưởng thủ công, đúng đối tượng người dùng, và nêu lý do.

## CÔNG NGHỆ
- Stack: [React / Next.js / Vue / HTML thuần] + [Tailwind / CSS Modules / ...]
- Dùng component và token màu/font có sẵn trong dự án nếu có.

## RÀNG BUỘC
- Responsive xuống mobile, focus bàn phím rõ, hỗ trợ prefers-reduced-motion, tương phản đạt chuẩn.
- Tiền định dạng VND. Nhãn nút nói rõ hành động. Lỗi nêu cách sửa. Trạng thái rỗng hướng dẫn hành động tiếp theo.
- Không dùng chung giao diện cho các vai trò khác nhau.
- Không đưa nút hoặc hành động trái luồng nghiệp vụ (ví dụ: online không được đặt hàng custom).
- Không dùng nội dung mẫu kiểu lorem ipsum, viết nội dung thật theo ngành nội thất.

## ĐẦU RA MONG MUỐN
1. Dòng xác nhận đã đọc skill.
2. Kế hoạch thiết kế: bảng màu (4-6 hex có tên), typeface và vai trò, ý tưởng bố cục (ASCII wireframe), nguyên tắc riêng.
3. Phần tự review kế hoạch: nêu chỗ nào đã sửa vì giống mặc định chung chung.
4. Code hoàn chỉnh, chạy được.
5. Phần tự critique cuối: kiểm tra responsive, accessibility, những gì đã cắt bỏ.
6. Hỏi lại tôi trước nếu yêu cầu mâu thuẫn với luồng nghiệp vụ.

Trả lời bằng tiếng Việt, code để trong khối code.
````

## Ví dụ điền nhanh

| Màn hình | Cách điền |
|---|---|
| Giỏ hàng khách | Người dùng: CUSTOMER. Việc chính: kiểm tra món và gửi yêu cầu mua. Dữ liệu: cart, cart_item, product. |
| Duyệt yêu cầu của sale | Người dùng: SALES. Việc chính: xác nhận với khách rồi lập hợp đồng. Dữ liệu: order_request, order_request_item. |
| Bảng việc của thợ | Người dùng: LEADERSTAFF. Việc chính: nhận lệnh, báo hoàn thành. Dữ liệu: production_order, production_order_item. |
| Duyệt thành phẩm | Người dùng: OWNER. Việc chính: xem ảnh nghiệm thu, duyệt hoặc trả lại. Dữ liệu: customer_order, customer_order_image. |