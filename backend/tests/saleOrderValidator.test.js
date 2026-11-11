// =========================================================
// saleOrderValidator.test.js
// Unit tests cho saleOrderValidator (Role Sale POS)
// =========================================================

const {
  validateCreateOfflineContractInput,
  validateSignContractInput,
  validateCreateOrderFromContractInput,
  toContractDTO,
  toOrderDTO,
  toRequestDTO,
} = require('../src/utils/saleOrderValidator');

describe('saleOrderValidator - validateCreateOfflineContractInput', () => {
  test('trả về lỗi khi thiếu họ tên khách hàng', () => {
    const res = validateCreateOfflineContractInput({
      customer_name: '',
      customer_phone: '0912345678',
      items: [{ product_id: 1, quantity: 1, unit_price: 1000 }],
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Họ tên khách hàng là bắt buộc/);
  });

  test('trả về lỗi khi số điện thoại không hợp lệ', () => {
    const res = validateCreateOfflineContractInput({
      customer_name: 'Nguyễn Văn A',
      customer_phone: 'abcxyz',
      items: [{ product_id: 1, quantity: 1, unit_price: 1000 }],
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Số điện thoại không hợp lệ/);
  });

  test('trả về lỗi khi giỏ hàng không có sản phẩm', () => {
    const res = validateCreateOfflineContractInput({
      customer_name: 'Nguyễn Văn A',
      customer_phone: '0912345678',
      items: [],
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Hợp đồng phải có ít nhất một sản phẩm/);
  });

  test('trả về lỗi khi tiền cọc lớn hơn tổng giá trị hợp đồng', () => {
    const res = validateCreateOfflineContractInput({
      customer_name: 'Nguyễn Văn A',
      customer_phone: '0912345678',
      deposit_amount: 5000000,
      items: [{ product_id: 1, quantity: 1, unit_price: 3000000 }],
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/không được vượt quá tổng giá trị/);
  });

  test('hợp lệ khi truyền đúng các trường bắt buộc (đơn <= 10 triệu)', () => {
    const res = validateCreateOfflineContractInput({
      customer_name: '  Nguyễn Văn A  ',
      customer_phone: '0912345678',
      customer_address: 'Hà Nội',
      deposit_amount: 1000000,
      items: [{ product_id: 1, quantity: 2, unit_price: 2500000 }],
    });
    expect(res.isValid).toBe(true);
    expect(res.value.customer_name).toBe('Nguyễn Văn A');
    expect(res.value.total_amount).toBe(5000000);
    expect(res.value.deposit_amount).toBe(1000000);
  });

  test('đơn hàng <= 10 triệu không truyền tiền cọc -> mặc định cọc 0đ', () => {
    const res = validateCreateOfflineContractInput({
      customer_name: 'Nguyễn Văn B',
      customer_phone: '0912345678',
      items: [{ product_id: 1, quantity: 1, unit_price: 8000000 }],
    });
    expect(res.isValid).toBe(true);
    expect(res.value.total_amount).toBe(8000000);
    expect(res.value.deposit_amount).toBe(0);
  });

  test('đơn hàng > 10 triệu không truyền tiền cọc -> tự động mặc định cọc 30%', () => {
    const res = validateCreateOfflineContractInput({
      customer_name: 'Nguyễn Văn C',
      customer_phone: '0912345678',
      items: [{ product_id: 1, quantity: 1, unit_price: 15000000 }],
    });
    expect(res.isValid).toBe(true);
    expect(res.value.total_amount).toBe(15000000);
    expect(res.value.deposit_amount).toBe(4500000); // 30% của 15.000.000
  });

  test('đơn hàng > 10 triệu cọc dưới 30% -> trả về lỗi yêu cầu cọc tối thiểu 30%', () => {
    const res = validateCreateOfflineContractInput({
      customer_name: 'Nguyễn Văn D',
      customer_phone: '0912345678',
      deposit_amount: 1000000, // Nhỏ hơn 30% của 20 triệu (6 triệu)
      items: [{ product_id: 1, quantity: 2, unit_price: 10000000 }],
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/tối thiểu 30%/);
  });

  test('đơn hàng > 10 triệu cọc từ 30% trở lên -> hợp lệ', () => {
    const res = validateCreateOfflineContractInput({
      customer_name: 'Nguyễn Văn E',
      customer_phone: '0912345678',
      deposit_amount: 6000000, // Đúng 30% của 20 triệu
      items: [{ product_id: 1, quantity: 2, unit_price: 10000000 }],
    });
    expect(res.isValid).toBe(true);
    expect(res.value.total_amount).toBe(20000000);
    expect(res.value.deposit_amount).toBe(6000000);
  });
});

describe('saleOrderValidator - validateSignContractInput', () => {
  test('nhận signed_place và contract_file_url hợp lệ khi ký hợp đồng', () => {
    const res = validateSignContractInput({
      signed_place: 'Cửa hàng Góc Nhà - Chi nhánh 1',
      contract_file_url: 'https://example.com/contract-signed.pdf',
    });
    expect(res.isValid).toBe(true);
    expect(res.value.signed_place).toBe('Cửa hàng Góc Nhà - Chi nhánh 1');
    expect(res.value.contract_file_url).toBe('https://example.com/contract-signed.pdf');
  });

  test('fallback mặc định signed_place nếu không truyền', () => {
    const res = validateSignContractInput({});
    expect(res.isValid).toBe(true);
    expect(res.value.signed_place).toBe('Cửa hàng Góc Nhà');
    expect(res.value.contract_file_url).toBeNull();
  });
});

describe('saleOrderValidator - validateCreateOrderFromContractInput', () => {
  test('trả về lỗi khi contractId không phải số hợp lệ', () => {
    const res = validateCreateOrderFromContractInput('abc');
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Mã hợp đồng/);
  });

  test('hợp lệ khi contractId là số dương', () => {
    const res = validateCreateOrderFromContractInput(15);
    expect(res.isValid).toBe(true);
    expect(res.value).toBe(15);
  });
});

describe('saleOrderValidator - DTO converters', () => {
  test('toContractDTO chuyển đổi đúng cấu trúc', () => {
    const raw = {
      contract_id: 1,
      contract_code: 'HD-20261028-0001',
      source: 'OFFLINE',
      contract_type: 'READY',
      customer_name: 'Nguyễn Văn A',
      customer_phone: '0912345678',
      total_amount: 5000000,
      deposit_amount: 2000000,
      status: 'DRAFT',
      items: [
        {
          contract_item_id: 10,
          product_id: 5,
          item_name: 'Bàn ăn gỗ sồi',
          quantity: 1,
          unit_price: 5000000,
        },
      ],
    };

    const dto = toContractDTO(raw);
    expect(dto.contractId).toBe(1);
    expect(dto.contractCode).toBe('HD-20261028-0001');
    expect(dto.remainingAmount).toBe(3000000);
    expect(dto.items).toHaveLength(1);
  });

  test('toOrderDTO chuyển đổi đúng cấu trúc đơn hàng', () => {
    const raw = {
      order_id: 10,
      order_code: 'ORD-20261028-0001',
      order_type: 'READY',
      contract_id: 1,
      contact_name: 'Nguyễn Văn A',
      contact_phone: '0912345678',
      total_amount: 5000000,
      deposit_amount: 2000000,
      paid_amount: 2000000,
      status: 'CONFIRMED',
      items: [],
    };

    const dto = toOrderDTO(raw);
    expect(dto.orderId).toBe(10);
    expect(dto.orderCode).toBe('ORD-20261028-0001');
    expect(dto.remainingAmount).toBe(3000000);
  });

  test('toRequestDTO chuyển đổi đúng cấu trúc yêu cầu kèm ảnh chung và ảnh theo sản phẩm', () => {
    const raw = {
      request_id: 100,
      request_code: 'RQ-20261111-0001',
      order_type: 'CUSTOM',
      contact_name: 'Trần Văn B',
      contact_phone: '0988776655',
      title: 'Đặt đóng tủ bếp gỗ sồi',
      items: [
        {
          request_item_id: 501,
          item_name: 'Tủ bếp trên',
          quantity: 1,
          unit_price: 15000000,
          images: [
            {
              request_image_id: 901,
              request_item_id: 501,
              image_url: 'https://cloudinary.com/tu-bep-1.jpg',
            },
          ],
        },
      ],
      images: [
        {
          request_image_id: 900,
          request_item_id: null,
          image_url: 'https://cloudinary.com/hien-trang-bep.jpg',
        },
      ],
    };

    const dto = toRequestDTO(raw);
    expect(dto.requestId).toBe(100);
    expect(dto.requestCode).toBe('RQ-20261111-0001');
    expect(dto.items).toHaveLength(1);
    expect(dto.items[0].images).toHaveLength(1);
    expect(dto.items[0].images[0].imageUrl).toBe('https://cloudinary.com/tu-bep-1.jpg');
    expect(dto.images).toHaveLength(1);
    expect(dto.images[0].imageUrl).toBe('https://cloudinary.com/hien-trang-bep.jpg');
  });
});
