// =========================================================
// productValidator.test.js
// Unit tests cho DTO Validator của Product
// =========================================================

const {
  validateCreateProductInput,
  validateUpdateProductInput,
  validateProductQueryParams,
  toProductDTO,
} = require('../src/utils/productValidator');

describe('productValidator - validateCreateProductInput', () => {
  const validData = {
    product_code: 'TB-001',
    product_name: 'Bàn ăn gỗ sồi 6 người',
    category_id: 1,
    room_id: 1,
    material_id: 1,
    color_id: 1,
    product_type: 'SINGLE',
    price: 4500000,
    stock_quantity: 10,
    length_cm: 160,
    width_cm: 80,
    height_cm: 75,
    description: 'Bàn ăn cao cấp',
  };

  test('hợp lệ khi truyền đầy đủ thông tin chuẩn', () => {
    const res = validateCreateProductInput(validData);
    expect(res.isValid).toBe(true);
    expect(res.value.product_code).toBe('TB-001');
    expect(res.value.product_name).toBe('Bàn ăn gỗ sồi 6 người');
    expect(res.value.price).toBe(4500000);
    expect(res.value.stock_quantity).toBe(10);
    expect(res.value.status).toBe('ACTIVE');
  });

  test('tự động gán null cho product_code khi không truyền để hệ thống tự sinh mã', () => {
    const { product_code, ...rest } = validData;
    const res = validateCreateProductInput(rest);
    expect(res.isValid).toBe(true);
    expect(res.value.product_code).toBeNull();
  });

  test('báo lỗi khi product_code chứa ký tự đặc biệt', () => {
    const res = validateCreateProductInput({ ...validData, product_code: 'TB @#$' });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Mã sản phẩm chỉ được chứa/);
  });

  test('báo lỗi khi thiếu product_name', () => {
    const res = validateCreateProductInput({ ...validData, product_name: '   ' });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Tên sản phẩm là bắt buộc/);
  });

  test('báo lỗi khi thiếu category_id hoặc không hợp lệ', () => {
    const res = validateCreateProductInput({ ...validData, category_id: 'invalid' });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Danh mục sản phẩm không hợp lệ/);
  });

  test('báo lỗi khi giá âm', () => {
    const res = validateCreateProductInput({ ...validData, price: -1000 });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Giá sản phẩm phải là số nguyên không âm/);
  });

  test('báo lỗi khi số lượng tồn kho âm', () => {
    const res = validateCreateProductInput({ ...validData, stock_quantity: -5 });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Số lượng tồn kho phải là số nguyên không âm/);
  });

  test('báo lỗi khi status không hợp lệ', () => {
    const res = validateCreateProductInput({ ...validData, status: 'UNKNOWN' });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Trạng thái chỉ có thể là ACTIVE hoặc INACTIVE/);
  });
});

describe('productValidator - validateUpdateProductInput', () => {
  test('chấp nhận cập nhật từng phần', () => {
    const res = validateUpdateProductInput({ price: 5000000, status: 'INACTIVE' });
    expect(res.isValid).toBe(true);
    expect(res.value.price).toBe(5000000);
    expect(res.value.status).toBe('INACTIVE');
  });

  test('báo lỗi nếu giá âm khi cập nhật', () => {
    const res = validateUpdateProductInput({ price: -1 });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Giá sản phẩm phải là số nguyên không âm/);
  });

  test('chấp nhận và parse set_items khi cập nhật bộ sản phẩm', () => {
    const res = validateUpdateProductInput({
      set_items: JSON.stringify([{ item_product_id: 2, quantity: 4 }]),
    });
    expect(res.isValid).toBe(true);
    expect(res.value.set_items).toEqual([{ item_product_id: 2, quantity: 4 }]);
  });

  test('báo lỗi nếu set_items có quantity <= 0', () => {
    const res = validateUpdateProductInput({
      set_items: [{ item_product_id: 2, quantity: 0 }],
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Số lượng sản phẩm con trong bộ phải lớn hơn 0/);
  });
});

describe('productValidator - validateProductQueryParams', () => {
  test('nhận diện đúng cờ include_children', () => {
    const res = validateProductQueryParams({ include_children: 'true' });
    expect(res.include_children).toBe(true);

    const resFalse = validateProductQueryParams({});
    expect(resFalse.include_children).toBe(false);
  });
});

describe('productValidator - toProductDTO', () => {
  test('chuyển đổi raw product sang DTO chuẩn', () => {
    const mockProduct = {
      product_id: 1,
      product_code: 'TB-001',
      product_name: 'Bàn ăn gỗ sồi',
      price: 4500000,
      stock_quantity: 5,
      length_cm: 160,
      width_cm: 80,
      height_cm: 75,
      image_url: 'https://cloudinary.com/test.jpg',
      status: 'ACTIVE',
      category: { category_name: 'Bàn' },
      room: { room_name: 'Phòng ăn' },
      material: { material_name: 'Gỗ sồi' },
      color: { color_name: 'Tự nhiên', hex_value: '#D2B48C' },
    };

    const dto = toProductDTO(mockProduct);
    expect(dto.productId).toBe(1);
    expect(dto.productCode).toBe('TB-001');
    expect(dto.categoryName).toBe('Bàn');
    expect(dto.roomName).toBe('Phòng ăn');
    expect(dto.materialName).toBe('Gỗ sồi');
    expect(dto.dimensions.formatted).toBe('160 x 80 x 75 cm');
  });
});
