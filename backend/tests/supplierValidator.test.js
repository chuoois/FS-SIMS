// =========================================================
// supplierValidator.test.js
// Unit tests cho DTO Validator của Supplier
// =========================================================

const {
  validateCreateSupplierInput,
  validateUpdateSupplierInput,
  validateSupplierQueryParams,
  toSupplierDTO,
  toSupplierDetailDTO,
} = require('../src/utils/supplierValidator');

describe('supplierValidator - validateCreateSupplierInput', () => {
  test('chấp nhận và gán null cho supplier_code khi không truyền (hệ thống tự động sinh)', () => {
    const res = validateCreateSupplierInput({ supplier_name: 'NCC An Cường' });
    expect(res.isValid).toBe(true);
    expect(res.value.supplier_code).toBeNull();
  });

  test('trả về lỗi khi supplier_code chứa ký tự không hợp lệ', () => {
    const res = validateCreateSupplierInput({
      supplier_code: 'NCC @#$',
      supplier_name: 'NCC An Cường',
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Mã nhà cung cấp chỉ được chứa/);
  });

  test('trả về lỗi khi thiếu supplier_name', () => {
    const res = validateCreateSupplierInput({ supplier_code: 'SUP_001' });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Tên nhà cung cấp là bắt buộc/);
  });

  test('trả về lỗi khi số điện thoại không hợp lệ', () => {
    const res = validateCreateSupplierInput({
      supplier_code: 'SUP_001',
      supplier_name: 'NCC An Cường',
      phone_number: 'abc',
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Số điện thoại không hợp lệ/);
  });

  test('trả về lỗi khi status không phải ACTIVE hoặc INACTIVE', () => {
    const res = validateCreateSupplierInput({
      supplier_code: 'SUP_001',
      supplier_name: 'NCC An Cường',
      status: 'PENDING',
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Trạng thái chỉ có thể là ACTIVE hoặc INACTIVE/);
  });

  test('hợp lệ và chuẩn hóa dữ liệu với status mặc định ACTIVE', () => {
    const res = validateCreateSupplierInput({
      supplier_code: 'sup_001',
      supplier_name: '   Công ty Gỗ An Cường   ',
      phone_number: '0901234567',
      address: 'Bình Dương',
      note: 'Nhà cung cấp ván MFC',
    });
    expect(res.isValid).toBe(true);
    expect(res.value.supplier_code).toBe('SUP_001');
    expect(res.value.supplier_name).toBe('Công ty Gỗ An Cường');
    expect(res.value.status).toBe('ACTIVE');
  });
});

describe('supplierValidator - validateUpdateSupplierInput', () => {
  test('trả về lỗi khi client cố gắng sửa supplier_code', () => {
    const res = validateUpdateSupplierInput({
      supplier_code: 'NEW_CODE',
      supplier_name: 'Tên mới',
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Không được phép thay đổi mã nhà cung cấp/);
  });

  test('trả về lỗi khi tên nhà cung cấp là chuỗi rỗng', () => {
    const res = validateUpdateSupplierInput({
      supplier_name: '   ',
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Tên nhà cung cấp không được để trống/);
  });

  test('hợp lệ khi chỉ cập nhật một số trường cho phép', () => {
    const res = validateUpdateSupplierInput({
      supplier_name: 'Tên cập nhật',
      status: 'INACTIVE',
      note: 'Tạm ngưng nhập hàng',
    });
    expect(res.isValid).toBe(true);
    expect(res.value.supplier_name).toBe('Tên cập nhật');
    expect(res.value.status).toBe('INACTIVE');
    expect(res.value.note).toBe('Tạm ngưng nhập hàng');
  });
});

describe('supplierValidator - validateSupplierQueryParams', () => {
  test('thiết lập giá trị mặc định cho phân trang và tìm kiếm', () => {
    const params = validateSupplierQueryParams({});
    expect(params.page).toBe(1);
    expect(params.limit).toBe(10);
    expect(params.status).toBe('ALL');
    expect(params.search).toBe('');
  });

  test('chuẩn hóa query params hợp lệ', () => {
    const params = validateSupplierQueryParams({
      search: ' An Cuong ',
      status: 'ACTIVE',
      page: '2',
      limit: '20',
    });
    expect(params.search).toBe('An Cuong');
    expect(params.status).toBe('ACTIVE');
    expect(params.page).toBe(2);
    expect(params.limit).toBe(20);
  });
});

describe('supplierValidator - DTO Transformers', () => {
  test('toSupplierDTO format đúng các trường', () => {
    const raw = {
      supplier_id: 1,
      supplier_code: 'SUP01',
      supplier_name: 'An Cường',
      phone_number: '0901234567',
      address: 'HN',
      note: 'test',
      status: 'ACTIVE',
      createdate: '2026-01-01',
      modifiedate: null,
      createby: 'owner@test.com',
      modifieby: null,
    };
    const dto = toSupplierDTO(raw);
    expect(dto.supplier_code).toBe('SUP01');
    expect(dto.status).toBe('ACTIVE');
  });

  test('toSupplierDetailDTO bao gồm danh sách phiếu nhập', () => {
    const raw = {
      supplier_id: 1,
      supplier_code: 'SUP01',
      supplier_name: 'An Cường',
      status: 'ACTIVE',
      materialReceiptSupplierIdRecords: [
        {
          receipt_id: 10,
          receipt_code: 'REC001',
          receipt_date: '2026-02-01',
          total_amount: 15000000,
          status: 'CONFIRMED',
        },
      ],
    };
    const dto = toSupplierDetailDTO(raw);
    expect(dto.totalReceipts).toBe(1);
    expect(dto.materialReceipts[0].receipt_code).toBe('REC001');
  });
});
