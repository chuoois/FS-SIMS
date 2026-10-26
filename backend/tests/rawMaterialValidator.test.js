// =========================================================
// rawMaterialValidator.test.js
// Unit tests cho DTO Validator của Raw Material
// =========================================================

const {
  validateCreateRawMaterialInput,
  validateUpdateRawMaterialInput,
  validateRawMaterialQueryParams,
  toRawMaterialDTO,
} = require('../src/utils/rawMaterialValidator');

describe('rawMaterialValidator - validateCreateRawMaterialInput', () => {
  const validData = {
    raw_code: 'WOOD-OAK',
    raw_name: 'Gỗ sồi xẻ',
    material_id: 1,
    unit: 'BOARD',
    quantity_on_hand: 50,
    min_quantity: 20,
    description: 'Gỗ nhập khẩu',
  };

  test('hợp lệ khi truyền đủ thông tin', () => {
    const res = validateCreateRawMaterialInput(validData);
    expect(res.isValid).toBe(true);
    expect(res.value.raw_code).toBe('WOOD-OAK');
    expect(res.value.raw_name).toBe('Gỗ sồi xẻ');
    expect(res.value.unit).toBe('BOARD');
    expect(res.value.quantity_on_hand).toBe(50);
    expect(res.value.min_quantity).toBe(20);
    expect(res.value.status).toBe('ACTIVE');
  });

  test('tự động gán null cho raw_code khi không truyền để hệ thống tự sinh mã', () => {
    const { raw_code, ...rest } = validData;
    const res = validateCreateRawMaterialInput(rest);
    expect(res.isValid).toBe(true);
    expect(res.value.raw_code).toBeNull();
  });

  test('báo lỗi khi raw_code chứa ký tự đặc biệt', () => {
    const res = validateCreateRawMaterialInput({ ...validData, raw_code: 'MAT @#$' });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Mã nguyên vật liệu chỉ được chứa/);
  });

  test('báo lỗi khi thiếu raw_name', () => {
    const res = validateCreateRawMaterialInput({ ...validData, raw_name: '' });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Tên nguyên vật liệu là bắt buộc/);
  });

  test('báo lỗi khi thiếu unit', () => {
    const res = validateCreateRawMaterialInput({ ...validData, unit: '   ' });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Đơn vị tính là bắt buộc/);
  });

  test('báo lỗi khi số lượng tồn kho âm', () => {
    const res = validateCreateRawMaterialInput({ ...validData, quantity_on_hand: -1 });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Số lượng tồn kho phải là số nguyên không âm/);
  });

  test('báo lỗi khi status không hợp lệ', () => {
    const res = validateCreateRawMaterialInput({ ...validData, status: 'BAD' });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Trạng thái chỉ có thể là ACTIVE hoặc INACTIVE/);
  });
});

describe('rawMaterialValidator - validateUpdateRawMaterialInput', () => {
  test('chấp nhận cập nhật từng phần', () => {
    const res = validateUpdateRawMaterialInput({ quantity_on_hand: 80, min_quantity: 30 });
    expect(res.isValid).toBe(true);
    expect(res.value.quantity_on_hand).toBe(80);
    expect(res.value.min_quantity).toBe(30);
  });

  test('báo lỗi nếu định mức tồn tối thiểu âm', () => {
    const res = validateUpdateRawMaterialInput({ min_quantity: -10 });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Định mức tồn tối thiểu phải là số nguyên không âm/);
  });
});

describe('rawMaterialValidator - toRawMaterialDTO', () => {
  test('tính toán cờ isLowStock chính xác khi tồn <= min_quantity', () => {
    const mockMat = {
      raw_material_id: 1,
      raw_code: 'WOOD-OAK',
      raw_name: 'Gỗ sồi xẻ',
      unit: 'BOARD',
      quantity_on_hand: 15,
      min_quantity: 20,
      material: { material_name: 'Gỗ sồi' },
      status: 'ACTIVE',
    };

    const dto = toRawMaterialDTO(mockMat);
    expect(dto.rawCode).toBe('WOOD-OAK');
    expect(dto.quantityOnHand).toBe(15);
    expect(dto.minQuantity).toBe(20);
    expect(dto.isLowStock).toBe(true);
    expect(dto.materialName).toBe('Gỗ sồi');
  });

  test('isLowStock là false khi tồn > min_quantity', () => {
    const mockMat = {
      raw_material_id: 1,
      raw_code: 'WOOD-OAK',
      raw_name: 'Gỗ sồi xẻ',
      unit: 'BOARD',
      quantity_on_hand: 50,
      min_quantity: 20,
      status: 'ACTIVE',
    };

    const dto = toRawMaterialDTO(mockMat);
    expect(dto.isLowStock).toBe(false);
  });
});
