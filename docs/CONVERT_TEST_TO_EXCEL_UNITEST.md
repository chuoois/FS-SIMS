Bạn là QA engineer. Hãy đọc file unit test (Jest) tôi đính kèm và tạo báo cáo unit test dưới dạng file Excel (.xlsx), theo ĐÚNG mẫu bên dưới. Chỉ dựa vào nội dung file test, không bịa thêm test case, không tự đoán hành vi ngoài code.

## 1. Thông tin đầu vào (tôi cung cấp)
- Code Module: [vd: Auth]
- Created By / Executed By: [vd: thinhbn]
- Executed Date: [vd: 11/18/2026]
- Kết quả chạy test: [tất cả PASS / hoặc liệt kê test fail, kèm Defect ID nếu có]

## 2. Quy tắc tách dữ liệu từ file test
- Mỗi `describe('<tên hàm>')` = 1 Method = 1 sheet (tab) trong Excel. Tên sheet = tên hàm.
- Mỗi `test(...)` = 1 Test Case. Với `test.each([...])`, MỖI DÒNG dữ liệu là 1 Test Case riêng.
- Đánh mã Test Case ID liên tục theo thứ tự xuất hiện trong file, xuyên suốt các sheet: UTCID01, UTCID02, UTCID03, ...
- Test requirement của sheet: 1 câu tiếng Anh mô tả chức năng của hàm, tóm từ tên các test trong `describe` đó.
- Với mỗi Test Case, trích 4 thông tin:
  - Condition: tình huống đang test, viết ngắn gọn 1 câu.
  - userData: dữ liệu đầu vào, lấy từ `createRequest(...)` / `body` / `req.user` / tham số truyền vào.
  - mockData: các mock được thiết lập (`mockResolvedValue`, `mockRejectedValue`, `mockReturnValue`...) và giá trị trả về.
  - Confirm: kết quả mong đợi, tóm từ các `expect(...)`. Ghi rõ status code, message/detail, hàm nào được gọi và không được gọi, `next` có được gọi không.
- Giữ nguyên chuỗi message tiếng Việt trong code, không dịch. Phần còn lại viết bằng tiếng Anh.
- Nếu một test case gồm nhiều kịch bản liên tiếp trong cùng một `test(...)`, vẫn giữ là 1 Test Case và mô tả đủ các kịch bản trong Condition, mockData và Confirm.
- Result Type: N = luồng bình thường; A = bất thường (input sai, lỗi, exception, 4xx/5xx); B = giá trị biên (rỗng, null, độ dài tối thiểu/tối đa).
- Passed/Failed: P hoặc F theo kết quả chạy tôi cung cấp. Defect ID để trống nếu không có lỗi.

## 3. Bố cục mỗi sheet (một sheet cho mỗi Method)
Các cột A–D là nhãn và nội dung, cột E ẩn, cột F trở đi là các Test Case xếp ngang (F = UTCID đầu tiên, G = UTCID kế tiếp, ...).
- Dòng 1: A "Code Module", C <Code Module>; F "Method", L <tên hàm>
- Dòng 2: A "Created By", C <người tạo>; F "Executed By", L <người chạy>
- Dòng 3: A "Test requirement", C <test requirement>
- Dòng 4 (nhãn): A "Passed", C "Failed", F "Untested", L "N/A/B", O "Total Test Cases"
- Dòng 5 (giá trị, nên dùng công thức COUNTIF): A = số P, C = số F, F = Untested, L/M/N = số test case loại N / A / B, O = tổng số Test Case
- Dòng 7: F, G, H... = mã Test Case ID (UTCID01, UTCID02, ...)
- Tiếp theo là 4 khối, mỗi khối có nhãn ở cột A, một dòng tiêu đề con ở cột B, các mục ở cột B, và 1 dòng trống cuối khối:
  - Condition: tiêu đề con "Precondition"
  - userData: tiêu đề con "Command Data"
  - mockData: tiêu đề con "Repository / Service"
  - Confirm: tiêu đề con "Expected Result"
- Mỗi mục trong khối là 1 dòng ở cột B. Test Case nào áp dụng mục đó thì điền chữ "O" vào cột UTCID của nó trên dòng ấy. Mục nào nhiều test case dùng chung thì để 1 dòng và đánh "O" ở nhiều cột.
- Khối cuối "Result", mỗi dòng có giá trị ở cột UTCID tương ứng: Type (N/A/B), Passed/Failed (P/F), Executed Date, Defect ID.

## 4. Định dạng
- Font Arial 10. Nhãn cột A của các khối có nền xanh navy, chữ trắng, đậm. Dòng 7 (mã UTCID) nền xanh navy, chữ trắng, xoay dọc.
- Có viền cho tất cả ô. Nội dung dài thì tự xuống dòng.
- Dropdown: "O" cho vùng đánh dấu, "N,A,B" cho Type, "P,F" cho Passed/Failed.

## 5. Kết quả trả về
- File Excel hoàn chỉnh, mỗi Method một sheet.
- Sau đó liệt kê ngắn: số sheet, số Test Case của từng sheet, và những chỗ bạn phải suy đoán (nếu có) để tôi kiểm tra lại.