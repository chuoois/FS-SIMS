// =========================================================
// purchaseReceiptValidator.test.js
// Unit tests cho DTO Validator của Purchase Receipts
// =========================================================

const {
  validateCreateReceiptInput,
  validateUpdateReceiptInput,
  validateReceiptQueryParams,
  toReceiptDTO,
  toReceiptDetailDTO,
} = require('../src/utils/purchaseReceiptValidator');

describe('purchaseReceiptValidator - validateCreateReceiptInput', () => {
  test('trả về lỗi khi thiếu hoặc sai supplier_id', () => {
    const res = validateCreateReceiptInput({ receipt_date: '2026-10-27', items: [{ raw_material_id: 1, quantity: 10, unit_price: 1000 }] });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/nhà cung cấp/i);
  });

  test('trả về lỗi khi ngày nhập kho sai định dạng', () => {
    const res = validateCreateReceiptInput({
      supplier_id: 1,
      receipt_date: 'invalid-date',
      items: [{ raw_material_id: 1, quantity: 10, unit_price: 1000 }],
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/ngày nhập kho/i);
  });

  test('trả về lỗi khi receipt_code chứa ký tự không hợp lệ', () => {
    const res = validateCreateReceiptInput({
      supplier_id: 1,
      receipt_date: '2026-10-27',
      receipt_code: 'RCP #$% 123',
      items: [{ raw_material_id: 1, quantity: 10, unit_price: 1000 }],
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/mã phiếu nhập/i);
  });

  test('trả về lỗi khi status không phải DRAFT hoặc CONFIRMED', () => {
    const res = validateCreateReceiptInput({
      supplier_id: 1,
      receipt_date: '2026-10-27',
      status: 'CANCELLED',
      items: [{ raw_material_id: 1, quantity: 10, unit_price: 1000 }],
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/trạng thái/i);
  });

  test('trả về lỗi khi danh sách mặt hàng rỗng', () => {
    const res = validateCreateReceiptInput({
      supplier_id: 1,
      receipt_date: '2026-10-27',
      items: [],
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/ít nhất 1 mặt hàng/i);
  });

  test('trả về lỗi khi mặt hàng có quantity <= 0', () => {
    const res = validateCreateReceiptInput({
      supplier_id: 1,
      receipt_date: '2026-10-27',
      items: [{ raw_material_id: 1, quantity: 0, unit_price: 1000 }],
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/số lượng/i);
  });

  test('trả về lỗi khi mặt hàng có unit_price < 0', () => {
    const res = validateCreateReceiptInput({
      supplier_id: 1,
      receipt_date: '2026-10-27',
      items: [{ raw_material_id: 1, quantity: 5, unit_price: -500 }],
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/đơn giá/i);
  });

  test('trả về lỗi khi mặt hàng bị trùng nguyên vật liệu', () => {
    const res = validateCreateReceiptInput({
      supplier_id: 1,
      receipt_date: '2026-10-27',
      items: [
        { raw_material_id: 1, quantity: 5, unit_price: 500 },
        { raw_material_id: 1, quantity: 2, unit_price: 600 },
      ],
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/trùng lặp/i);
  });

  test('hợp lệ và chuẩn hóa dữ liệu thành công', () => {
    const res = validateCreateReceiptInput({
      supplier_id: '2',
      receipt_date: '2026-10-27',
      receipt_code: 'rcp-20261027-0001',
      status: 'draft',
      note: '  Nhập gỗ đầu tuần  ',
      items: [
        { raw_material_id: '1', quantity: '10', unit_price: '350000', note: 'Gỗ sồi loại 1' },
        { raw_material_id: '2', quantity: '5', unit_price: '250000' },
      ],
    });
    expect(res.isValid).toBe(true);
    expect(res.value.supplier_id).toBe(2);
    expect(res.value.receipt_code).toBe('RCP-20261027-0001');
    expect(res.value.status).toBe('DRAFT');
    expect(res.value.note).toBe('Nhập gỗ đầu tuần');
    expect(res.value.items).toHaveLength(2);
    expect(res.value.items[0].quantity).toBe(10);
    expect(res.value.items[0].unit_price).toBe(350000);
  });
});

describe('purchaseReceiptValidator - validateUpdateReceiptInput', () => {
  test('trả về lỗi khi ngày nhập kho không đúng format', () => {
    const res = validateUpdateReceiptInput({ receipt_date: '27-10-2026' });
    expect(res.isValid).toBe(false);
  });

  test('trả về lỗi khi status không nằm trong DRAFT, CONFIRMED, CANCELLED', () => {
    const res = validateUpdateReceiptInput({ status: 'UNKNOWN' });
    expect(res.isValid).toBe(false);
  });

  test('hợp lệ với cập nhật một phần (partial update)', () => {
    const res = validateUpdateReceiptInput({
      note: 'Cập nhật ghi chú mới',
      status: 'CONFIRMED',
    });
    expect(res.isValid).toBe(true);
    expect(res.value.note).toBe('Cập nhật ghi chú mới');
    expect(res.value.status).toBe('CONFIRMED');
  });
});

describe('purchaseReceiptValidator - validateReceiptQueryParams', () => {
  test('chuẩn hóa params mặc định', () => {
    const params = validateReceiptQueryParams({});
    expect(params.page).toBe(1);
    expect(params.limit).toBe(10);
    expect(params.status).toBe('ALL');
    expect(params.supplier_id).toBe('ALL');
  });

  test('lọc theo status, supplier_id và khoảng ngày', () => {
    const params = validateReceiptQueryParams({
      search: ' RCP-001 ',
      status: 'confirmed',
      supplier_id: '5',
      from_date: '2026-10-01',
      to_date: '2026-10-31',
      page: '2',
      limit: '20',
    });
    expect(params.search).toBe('RCP-001');
    expect(params.status).toBe('CONFIRMED');
    expect(params.supplier_id).toBe(5);
    expect(params.from_date).toBe('2026-10-01');
    expect(params.to_date).toBe('2026-10-31');
    expect(params.page).toBe(2);
    expect(params.limit).toBe(20);
  });
});

describe('purchaseReceiptValidator - DTO transformers', () => {
  test('toReceiptDTO chuyển đổi model thành DTO hiển thị danh sách', () => {
    const mockReceipt = {
      receipt_id: 1,
      receipt_code: 'RCP-20261001-0001',
      supplier_id: 2,
      receipt_date: '2026-10-01',
      total_amount: 5000000,
      status: 'CONFIRMED',
      received_by: 3,
      note: 'Nhập gỗ',
      supplier: { supplier_name: 'Công ty Gỗ Sài Gòn', supplier_code: 'SUP-001' },
      receiver: { full_name: 'Lê Văn Tổ Trưởng' },
      items: [
        { quantity: 10, unit_price: 350000 },
        { quantity: 5, unit_price: 300000 },
      ],
    };

    const dto = toReceiptDTO(mockReceipt);
    expect(dto.receipt_id).toBe(1);
    expect(dto.receipt_code).toBe('RCP-20261001-0001');
    expect(dto.supplier_name).toBe('Công ty Gỗ Sài Gòn');
    expect(dto.receiver_name).toBe('Lê Văn Tổ Trưởng');
    expect(dto.items_count).toBe(2);
    expect(dto.total_quantity).toBe(15);
  });

  test('toReceiptDetailDTO tính toán chi tiết từng mặt hàng và line_total', () => {
    const mockReceipt = {
      receipt_id: 1,
      receipt_code: 'RCP-20261001-0001',
      supplier: {
        supplier_id: 2,
        supplier_code: 'SUP-001',
        supplier_name: 'Công ty Gỗ Sài Gòn',
        phone_number: '0281234567',
        address: 'KCN Tân Bình',
      },
      receiver: {
        user_account_id: 3,
        full_name: 'Lê Văn Tổ Trưởng',
        email: 'leader@fssims.local',
      },
      items: [
        {
          receipt_item_id: 10,
          raw_material_id: 1,
          quantity: 10,
          unit_price: 350000,
          rawMaterial: { raw_code: 'WOOD-OAK', raw_name: 'Gỗ sồi xẻ', unit: 'BOARD', quantity_on_hand: 50 },
        },
      ],
    };

    const dto = toReceiptDetailDTO(mockReceipt);
    expect(dto.supplier.supplier_name).toBe('Công ty Gỗ Sài Gòn');
    expect(dto.receiver.full_name).toBe('Lê Văn Tổ Trưởng');
    expect(dto.items[0].line_total).toBe(3500000);
    expect(dto.items[0].raw_code).toBe('WOOD-OAK');
  });
});
