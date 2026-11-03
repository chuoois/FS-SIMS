// =========================================================
// productionOrderValidator.test.js
// Unit tests cho productionOrderValidator
// =========================================================

const {
  validateCreateProductionOrderInput,
  validateAssignLeaderInput,
  toProductionOrderDTO,
} = require('../src/utils/productionOrderValidator');

describe('productionOrderValidator - validateCreateProductionOrderInput', () => {
  test('trả về lỗi khi thiếu order_id', () => {
    const res = validateCreateProductionOrderInput({
      planned_start: '2026-11-01',
      planned_end: '2026-11-15',
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/chọn đơn hàng/i);
  });

  test('trả về lỗi khi order_id không hợp lệ', () => {
    const res = validateCreateProductionOrderInput({
      order_id: -5,
      planned_start: '2026-11-01',
      planned_end: '2026-11-15',
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/ID đơn hàng không hợp lệ/i);
  });

  test('trả về lỗi khi thiếu planned_start', () => {
    const res = validateCreateProductionOrderInput({
      order_id: 1,
      planned_end: '2026-11-15',
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Ngày bắt đầu dự kiến không hợp lệ/i);
  });

  test('trả về lỗi khi thiếu planned_end', () => {
    const res = validateCreateProductionOrderInput({
      order_id: 1,
      planned_start: '2026-11-01',
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Ngày kết thúc dự kiến không hợp lệ/i);
  });

  test('trả về lỗi khi planned_end < planned_start', () => {
    const res = validateCreateProductionOrderInput({
      order_id: 1,
      planned_start: '2026-11-20',
      planned_end: '2026-11-10',
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/phải lớn hơn hoặc bằng ngày bắt đầu/i);
  });

  test('hợp lệ khi truyền đúng các trường', () => {
    const res = validateCreateProductionOrderInput({
      order_id: 10,
      planned_start: '2026-11-01',
      planned_end: '2026-11-15',
    });
    expect(res.isValid).toBe(true);
    expect(res.value).toEqual({
      order_id: 10,
      planned_start: '2026-11-01',
      planned_end: '2026-11-15',
    });
  });
});

describe('productionOrderValidator - validateAssignLeaderInput', () => {
  test('trả về lỗi khi thiếu assigned_to', () => {
    const res = validateAssignLeaderInput({});
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/chọn trưởng nhóm/i);
  });

  test('trả về lỗi khi assigned_to không phải số nguyên dương', () => {
    const res = validateAssignLeaderInput({ assigned_to: 'abc' });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/ID trưởng nhóm không hợp lệ/i);
  });

  test('hợp lệ khi assigned_to đúng', () => {
    const res = validateAssignLeaderInput({ assigned_to: 5 });
    expect(res.isValid).toBe(true);
    expect(res.value).toEqual({ assigned_to: 5 });
  });
});

describe('productionOrderValidator - toProductionOrderDTO', () => {
  test('trả về null nếu raw là null hoặc undefined', () => {
    expect(toProductionOrderDTO(null)).toBeNull();
    expect(toProductionOrderDTO(undefined)).toBeNull();
  });

  test('chuyển đổi đúng cấu trúc DTO', () => {
    const raw = {
      production_id: 1,
      production_code: 'PO-20261031-0001',
      production_type: 'CUSTOM',
      order_id: 10,
      status: 'DRAFT',
      planned_start: '2026-11-01',
      planned_end: '2026-11-15',
      customerOrder: {
        order_code: 'ORD-001',
        order_type: 'CUSTOM',
        contact_name: 'Anh Nam',
        status: 'CONFIRMED',
      },
      supervisor: {
        full_name: 'Trần Văn Trưởng',
        email: 'truong@test.com',
        phone_number: '0901234567',
      },
    };

    const dto = toProductionOrderDTO(raw);
    expect(dto.production_id).toBe(1);
    expect(dto.production_code).toBe('PO-20261031-0001');
    expect(dto.order_code).toBe('ORD-001');
    expect(dto.customer_name).toBe('Anh Nam');
    expect(dto.leader_name).toBe('Trần Văn Trưởng');
    expect(dto.leader_email).toBe('truong@test.com');
  });
});

