Bạn là QA engineer. Hãy đọc file unit test (Jest) sau: [đường dẫn file test, vd: be/tests/userController.test.js] và tạo báo cáo unit test, ghi vào file Markdown. Chỉ dựa vào nội dung file test, không bịa thêm test case, không tự đoán hành vi ngoài code, và không sửa bất kỳ file mã nguồn hay file test nào.

## 1. Thông tin đầu vào (tôi cung cấp)
- Code Module: [vd: Auth]
- Created By / Executed By: [vd: thinhbn]
- Executed Date: [vd: 11/18/2026]
- Kết quả chạy test: [tất cả PASS / hoặc liệt kê test fail, kèm Defect ID nếu có]

## 2. File đầu ra
- Tạo file: be/docs/unit-test-report-<code-module-viết-thường>.md (ví dụ: be/docs/unit-test-report-auth.md).
- Nếu thư mục be/docs chưa có thì tạo mới. Nếu file đã tồn tại thì ghi đè bằng nội dung mới đầy đủ, không chèn thêm vào cuối.
- Toàn bộ kết quả phải nằm trong file này. Không in lại toàn bộ nội dung ra khung chat, chỉ báo đã tạo file ở đường dẫn nào.

## 3. Quy tắc tách dữ liệu từ file test
- Mỗi `describe('<tên hàm>')` = 1 Method = 1 mục trong file .md.
- Mỗi `test(...)` = 1 Test Case. Với `test.each([...])`, MỖI DÒNG dữ liệu là 1 Test Case riêng.
- Đánh Test Case ID liên tục theo thứ tự xuất hiện trong file, xuyên suốt các Method: UTCID01, UTCID02, UTCID03, ...
- Test requirement của mỗi Method: 1 câu tiếng Anh mô tả chức năng của hàm, tóm từ tên các test trong `describe` đó.
- Với mỗi Test Case, trích 4 thông tin:
  - Condition: tình huống đang test, viết ngắn gọn 1 câu.
  - userData: dữ liệu đầu vào, lấy từ `createRequest(...)` / `body` / `req.user` / tham số truyền vào.
  - mockData: các mock được thiết lập (`mockResolvedValue`, `mockRejectedValue`, `mockReturnValue`...) và giá trị trả về.
  - Confirm: kết quả mong đợi, tóm từ các `expect(...)`. Ghi rõ status code, message/detail, hàm nào được gọi và không được gọi, `next` có được gọi không.
- Giữ nguyên chuỗi message tiếng Việt trong code, không dịch. Phần còn lại viết bằng tiếng Anh.
- Nếu một test case gồm nhiều kịch bản liên tiếp trong cùng một `test(...)`, vẫn giữ là 1 Test Case và mô tả đủ các kịch bản trong Condition, mockData và Confirm.
- Result Type: N = luồng bình thường; A = bất thường (input sai, lỗi, exception, 4xx/5xx); B = giá trị biên (rỗng, null, độ dài tối thiểu/tối đa).
- Passed/Failed: P hoặc F theo kết quả chạy tôi cung cấp. Defect ID để trống nếu không có lỗi.

## 4. Cấu trúc file .md
Mở đầu file là tiêu đề `# Unit Test Report - <Code Module>`, kèm một dòng ghi nguồn: tên file test đã dùng.

Sau đó, với MỖI Method, tạo một mục theo đúng khuôn sau:

```
## <tên hàm>

| Code Module | Created By | Executed By | Method |
|---|---|---|---|
| ... | ... | ... | ... |

**Test requirement:** <câu mô tả>

| Passed | Failed | Untested | N | A | B | Total Test Cases |
|---|---|---|---|---|---|---|
| ... | ... | ... | ... | ... | ... | ... |

| Nhóm | Mục | UTCID01 | UTCID02 | ... |
|---|---|---|---|---|
| Condition | <Precondition 1> | O |   |
| Condition | <Precondition 2> |   | O |
| userData | <Command Data 1> | O | O |
| mockData | <Repository / Service 1> | O |   |
| Confirm | <Expected Result 1> | O |   |
| Result | Type | N | A |
| Result | Passed/Failed | P | P |
| Result | Executed Date | ... | ... |
| Result | Defect ID |   |   |
```

Quy tắc điền bảng chính:
- Mỗi mục trong Condition, userData, mockData, Confirm là 1 dòng. Test Case nào áp dụng mục đó thì ghi "O" ở cột UTCID của nó, ô còn lại để trống.
- Mục nào nhiều Test Case dùng chung thì để 1 dòng và ghi "O" ở nhiều cột.
- Các dòng Result điền giá trị trực tiếp (N/A/B, P/F, ngày, Defect ID) ở cột UTCID tương ứng.
- Số Passed, Failed, Untested, N, A, B, Total phải khớp với bảng Result của chính Method đó.
- Trong ô bảng, ký tự `|` phải viết thành `\|`, xuống dòng dùng `<br>`.

## 5. Kiểm tra trước khi kết thúc
- Số Test Case trong file .md phải bằng số `test(...)` cộng số dòng của `test.each` trong file test.
- Mỗi cột UTCID phải có đúng 1 dấu "O" trong mỗi nhóm Condition, userData, mockData, Confirm (hoặc nhiều hơn nếu test đó có nhiều mục, nhưng không được trống).
- Cuối cùng chỉ trả lời ngắn: đường dẫn file đã tạo, số Method, số Test Case của từng Method, và những chỗ bạn phải suy đoán (nếu có) để tôi kiểm tra lại.